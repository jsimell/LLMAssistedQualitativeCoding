import { use, useCallback, useContext } from "react";
import {
  HighlightSuggestion,
  Passage,
  PassageId,
  WorkflowContext,
} from "../../../../../context/WorkflowContext";
import { callOpenAIStateless } from "../../../../../services/openai";
import { getContextForHighlightSuggestions, constructFewShotExamplesString } from "../../utils/passageUtils";
import { usePrompts } from "./usePrompts";

const MAX_RETRY_ATTEMPTS = 2;
const OPENAI_MODEL = "gpt-4.1"; // Define the model to use

export const useHighlightSuggestions = () => {
  // Get global states from the context
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error(
      "useHighlightSuggestion must be used within a WorkflowProvider"
    );
  }

  const { generateHighlightSuggestionsPrompt } = usePrompts();

  const {
    researchQuestions,
    contextInfo,
    passages,
    codes,
    codebook,
    apiKey,
    uploadedFile,
    highlightSuggestionContextWindowSize
  } = context;

  const dataIsCSV = uploadedFile?.type === "text/csv";

  /**
   * A helper for ensuring that the LLM's highlight suggestion response is valid.
   * @param rawResponseString The raw response string from the LLM.
   * @param parsedResponse The parsed response object.
   * @param searchArea A string that the LLM's suggested passage must be a substring of.
   * @returns The parsed HighlightSuggestion object if valid, otherwise throws an error.
   */
  const validateHighlightSuggestionResponse = (rawResponseString: string, parsedResponse: any, searchArea: string): {passage: string, codes: string[]} => {
    if (
      parsedResponse === null ||
      Object.keys(parsedResponse).length !== 2 ||
      typeof parsedResponse.passage !== "string" ||
      !Array.isArray(parsedResponse.codes) ||
      parsedResponse.codes.some((code: any) => typeof code !== "string")
    ) {
      throw new Error("InvalidResponseFormatError: Response does not match the required format. Received response:" + rawResponseString);
    }

    if (!searchArea.includes(parsedResponse.passage)) {
      throw new Error("InvalidResponseFormatError: Suggested passage is not a substring of the search area.");
    }

    if (parsedResponse.codes.some((code: string) => code.includes(";"))) {
      throw new Error("InvalidResponseFormatError: One or more suggested codes contain a semicolon ';', which is forbidden.");
    }

    // CSV specific validations
    if (dataIsCSV) {
      const rs = "\u001E"; // End of row marker
      const p = parsedResponse.passage;

      // reject if RS appears anywhere except possibly at the very end
      const idxRS = p.indexOf(rs);

      const badMiddleRS =
        (idxRS !== -1 && idxRS !== p.length - 1);

      if (badMiddleRS) {
        throw new Error("InvalidResponseFormatError: Suggested passage spans multiple CSV rows.");
      }

      // Also reject if suggestion is only the marker 
      if (p === rs) {
        throw new Error("InvalidResponseFormatError: Empty content (only end-of-row marker).");
      }
    }
    return parsedResponse;
  }


  /** Fetches the next highlight suggestion starting from a specific index inside a specific passage. 
   *  For text files, simply searches the startPassage. For CSV files, the LLM may return a suggestion from following passages as well.
   * 
   * @param startPassage The passage from which to start searching for the highlight suggestion.
   * @param searchStartIndex The index in the startPassage text from which to start searching for the next highlight.
   * @returns a highlight suggestion and the passage ID it belongs to, or null if no suggestion could be fetched.
   */
  const getNextHighlightSuggestion = useCallback(async (startPassage: Passage, searchStartIndex: number): Promise<{highlightSuggestion: HighlightSuggestion, forPassageId: PassageId} | null> => {
    let attempt = 0;
    let clarificationMessage = ""; // Empty on first try

    while (attempt < MAX_RETRY_ATTEMPTS) {
      try {
        const { precedingText, searchArea } = getContextForHighlightSuggestions(
          startPassage,
          passages,
          searchStartIndex,
          highlightSuggestionContextWindowSize ?? 1000,
          dataIsCSV
        );

        const response = await callOpenAIStateless(
          apiKey,
          generateHighlightSuggestionsPrompt(dataIsCSV, precedingText, searchArea) + clarificationMessage,
          OPENAI_MODEL
        );

        // If data is CSV, ensure that response has the end of row tokens escaped (parsing will fail otherwise)
        let rawResponse = response.output_text.trim();
        if (dataIsCSV && rawResponse.includes("\u001E")) {
          rawResponse = rawResponse.replace(/\u001E/g, "\\u001E");
        }

        // Parse raw response into JSON
        const parsedResponse = JSON.parse(rawResponse);
        if (!parsedResponse) {
          throw new Error("InvalidResponseFormatError: Response could not be parsed as JSON.");
        }

        // If data is CSV, convert possible escaped RS in the parsed response back to the real char
        if (dataIsCSV && typeof parsedResponse.passage === "string") {
          parsedResponse.passage = parsedResponse.passage.replace(/\\u001E/g, "\u001E");
        }

        // Validate the response format and content
        const validatedResponse = validateHighlightSuggestionResponse(rawResponse, parsedResponse, searchArea);

        // We must find the start index of the suggested passage within the passage it belongs to
        const startPassageAndFollowing = passages.filter((p) => p.order >= startPassage.order);
        const firstHighlightedIdx = startPassageAndFollowing.findIndex((p) => p.isHighlighted);
        const searchAreaPassages =
          firstHighlightedIdx === -1
            ? startPassageAndFollowing
            : startPassageAndFollowing.slice(0, firstHighlightedIdx);

        // Get the passages that the suggestion is a substring of
        const candidates = searchAreaPassages.filter((p) =>
          p.text.includes(validatedResponse.passage)
        );

        if (candidates.length === 0) {
          throw new Error("InvalidResponseFormatError: Suggested passage is not a substring of the search area.");
        }

        // Simply choose the first candidate passage that contains the suggestion
        const candidatePassage = candidates[0];
        // Calculate the start index within that passage
        const startIdx = candidatePassage.text.indexOf(validatedResponse.passage);
        const forPassageId = candidatePassage.id;

        // Success (no error caught) - return the suggestion
        return {
          highlightSuggestion: {passage: validatedResponse.passage, startIndex: startIdx, codes: validatedResponse.codes},
          forPassageId: forPassageId,
        };
      } catch (error) {
        // Parsing failed, retry with a clarifying message
        clarificationMessage = `
          \n## IMPORTANT NOTE!
          Previous attempt caused the following error. Please ensure it does not happen again.
          ERROR MESSAGE: ${error instanceof Error ? error.message : "None"}
        `;
        console.warn(
          `Highlight suggestion attempt ${attempt + 1} for ${startPassage.text.slice(0, 25)} failed with error: ${error instanceof Error ? error.message : ""}. Retrying...`
        );
        attempt++;

        // Error code 400: Another API call may be currently in progress for this conversation => try again after a short delay
        if (
          error instanceof Error && error.message.includes("400")
        ) {
          await new Promise((resolve) => setTimeout(resolve, 500)); // Wait 0.5 seconds before retrying
          continue;
        }

        // If the error is non-response format related, do not retry
        if (
          error instanceof Error &&
          !error.message.startsWith("InvalidResponseFormatError")
        ) {
          console.error("Non-retryable error encountered:", error);
          break;
        }
      }
    }

    console.warn(`All attempts to fetch AI highlight suggestions for passage "${startPassage.text.slice(0, 25)}" failed. Returning no suggestions...`);
    return null; // Return null if all attempts fail
  }, [apiKey, passages, researchQuestions, contextInfo, codebook, codes]);

  return {
    getNextHighlightSuggestion,
  };
};
