import { useCallback, useContext } from "react";
import {
  HighlightSuggestion,
  Passage,
  WorkflowContext,
} from "../../../../../context/WorkflowContext";
import { callOpenAIStateless } from "../../../../../services/openai";
import { getContextForHighlightSuggestions, constructFewShotExamplesString } from "../../utils/passageUtils";

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

  const {
    researchQuestions,
    contextInfo,
    passages,
    codes,
    codebook,
    apiKey,
  } = context;


  /** Constructs the system prompt for the AI based on the current context.
   *
   * @param passage The passage for which to get the highlight suggestion.
   * @param precedingText The preceding text of the search area for context.
   * @param searchArea The search area text where the AI should find the highlight suggestion from.
   * @returns A string prompt for the AI.
   */
  const constructSystemPrompt = (passage: Passage, precedingText: string, searchArea: string) => {
    return `
      ## ROLE:
      You are an expert qualitative analyst AI assistant. 
      Your primary task is to identify and code the next relevant passage from the provided context window, 
      using provided information and examples as guidance.

      ## RESEARCH CONTEXT:
      **Research questions:** ${researchQuestions}
      ${contextInfo && "**Additional context information about the research:**"} ${contextInfo || ""}

      ## APPROACH:
      1. Review the codebook and few-shot examples of user coded passages found under CODING STYLE EXAMPLES. You must use these to guide your coding style.
      2. Read the text under CONTEXT WINDOW. From the SEARCH AREA (text between <<START OF SEARCH AREA>> and <<END OF SEARCH AREA>>) find the FIRST subpassage offering meaningful insight related to the research context.
      - The selection style (length, cropping, detail) should mimic the few-shot examples, if they exist.
      - It is important that you identify the FIRST relevant passage, not necessarily the most relevant one.
      3. Code the passage with 1-5 relevant codes.
      - Use relevant codes from the codebook when possible.
      - Create new codes only if the passage covers concepts not present in the codebook, but ensureconsistency with codebook style and abstraction.
      - Your codes should cover all the important aspects of the passage in relation to the research questions.
      - However, avoid overcoding; only assign codes that cover concepts or observations your other code suggestions do not yet cover.
      4. Return the identified passage and the suggested codes as specified under RESPONSE FORMAT.
      5. If no relevant passage is found, respond with an empty string for the passage and an empty array for the codes.

      After each analysis, validate that the selected passage is an exact, 
      case-sensitive substring of the text between <<START OF SEARCH AREA>> and <<END OF SEARCH AREA>> and that the code precisely matches the codebook style. 
      Only proceed if these criteria are met; otherwise, self-correct before responding.

      ## RESPONSE FORMAT:
      - Return ONLY a valid JavaScript object in the following format:

      - Example 1: coding a passage:
      {
      "passage": "The first relevant passage from the search area. Must be an exact, case-sensitive substring from the context window",
      "codes": ["suggested code 1", "suggested code 2", "suggested code 3"]
      }

      - Example 2: if no relevant passage is found:
      {
      "passage": "",
      "codes": []
      }

      - Do NOT include explanations or text outside the returned object.
      - Do not indicate truncation in any way (e.g. "..." in the passage).
      - The suggested codes MUST NOT include semicolons (;). If punctuation is needed, use a different delimiter.
      - Start the codes with a lowercase letter unless they are proper nouns. However, if codebook consistently uses uppercase, follow that style.
      - The passage must be an exact, case-sensitive substring of the context window, including whitespace and punctuation.
      - Escape any special characters in the passage value (e.g., double quotes as \", backslashes as \\, newlines as \n, tabs as \t, etc.) to prevent JSON parsing errors.

      ## CODING STYLE EXAMPLES:
      **Codebook (all previous codes):** [${Array.from(codebook).map((code) => `${code}`).join(", ") ?? "No codes yet."}].
      **Few-shot examples of user coded passages:** [
        ${constructFewShotExamplesString(passage, passages, codes)}
      ]

      ## CONTEXT WINDOW:
      ${precedingText.trim().length > 0 ?
      `### PRECEDING TEXT (for understanding only):
      <<START OF PRECEDING TEXT>>
      ${precedingText}
      <<END OF PRECEDING TEXT>>` : ""}
      
      ### SEARCH AREA (the suggested passage MUST be from here):
      <<START OF SEARCH AREA>>
      ${searchArea}
      <<END OF SEARCH AREA>>
      `;
  };


  /** Fetches the next highlight suggestion from the AI for a given passage. 
   * 
   * @param passage The passage for which to get the highlight suggestion.
   * @param searchStartIndex The index in the passage text from which to start searching for the next highlight.
   * @returns an object containing the suggested passage and codes, or null if valid suggestions could not be obtained.
   */
  const getNextHighlightSuggestion = useCallback(async (passage: Passage, searchStartIndex: number): Promise<HighlightSuggestion | null> => {
    let attempt = 0;
    let clarificationMessage = "";

    while (attempt < MAX_RETRY_ATTEMPTS) {
      try {
        const { precedingText, searchArea } = getContextForHighlightSuggestions(
          passage,
          passages,
          searchStartIndex,
          1000
        );

        const response = await callOpenAIStateless(
          apiKey,
          constructSystemPrompt(passage, precedingText, searchArea) + clarificationMessage,
          OPENAI_MODEL
        );

        // Validate response format
        const parsedResponse = JSON.parse(response.output_text.trim());
        if (
          !parsedResponse ||
          typeof parsedResponse !== "object" ||
          Object.keys(parsedResponse).length !== 2 ||
          typeof parsedResponse.passage !== "string" ||
          !Array.isArray(parsedResponse.codes) ||
          !searchArea.includes(parsedResponse.passage) ||
          parsedResponse.codes.some((code: string) => code.includes(";"))
        ) {
          throw new Error("InvalidResponseFormatError: Response does not match the required format. Received response:" + response.output_text.trim());
        }

        // Find the start index of the suggested passage within the passage text
        const startIdx = searchStartIndex + passage.text.slice(searchStartIndex).indexOf(parsedResponse.passage);

        // Success (no error caught) - return the suggestion
        return {passage: parsedResponse.passage, startIndex: startIdx, codes: parsedResponse.codes};
      } catch (error) {
        // Parsing failed, retry with a clarifying message
        clarificationMessage = `
          \n## IMPORTANT NOTE!
          Previous attempt caused the following error. Please ensure it does not happen again.
          ERROR MESSAGE: ${error instanceof Error ? error.message : ""}
        `;
        console.warn(
          `Highlight suggestion attempt ${attempt + 1} for ${passage.text.slice(0, 25)} failed with error: ${error instanceof Error ? error.message : ""}. Retrying...`
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

    console.warn(`All attempts to fetch AI highlight suggestions for passage "${passage.text.slice(0, 25)}" failed. Returning no suggestions...`);
    return null; // Return null if all attempts fail
  }, [apiKey, passages, researchQuestions, contextInfo, codebook, codes]);

  return {
    getNextHighlightSuggestion,
  };
};
