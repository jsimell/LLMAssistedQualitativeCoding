import { useContext, useEffect } from "react";
import {
  AIsuggestion,
  WorkflowContext,
} from "../../../../context/WorkflowContext";
import { statefullyCallOpenAI } from "../../../../services/openai";
import OpenAI from "openai";

const MAX_RETRY_ATTEMPTS = 2;
const OPENAI_MODEL = "gpt-4o-mini"; // Define the model to use
const MIN_FEW_SHOT_EXAMPLES = 1; // Minimum number of coded passages required for few-shot examples

export const useFullSuggestions = () => {
  // Get global states from the context
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error(
      "useFullSuggestions must be used within a WorkflowProvider"
    );
  }

  const {
    rawData,
    researchQuestions,
    contextInfo,
    passages,
    codes,
    codebook,
    apiKey,
    nextSuggestionId,
    setNextSuggestionId,
  } = context;


  /**
   * Constructs the system prompt (role: developer) for the AI suggestions based on the current context.
   * This prompt is sent only once per conversation, when the OpenAI instance is initialized.
   * Should be called again when research questions or context info change, to re-initialize the conversation.
   *
   * @returns A string prompt for the AI.
   */
  const constructSystemPrompt = () => {
    return `
      ## ROLE:
      You are an expert qualitative analyst. Your task is to code a user provided subset of the following dataset on each request.

      ## FULL DATASET (you will code subsets of this):
      ---BEGIN DATA---
      ${rawData}
      ---END DATA---

      ## PRIORITY ORDER:
      1. Always obey the RESPONSE FORMAT.
      2. Follow BEHAVIOR RULES.
      3. Use CONTEXT (especially research questions) to decide relevance and guide code selection.

      ## BEHAVIOR RULES:
      ### How should you code the dataset?
      - You will receive user messages containing three things:
        1. a subset of the dataset that the user wants you to code,
        2. the current codebook, 
        3. few-shot examples displaying the coding style of the user.
      - Your task is to identify all RELEVANT and UNCODED passages from the subset and suggest codes for them.
      - You must mimic the user's coding style and terminology that the few-shot examples demonstrate.
      - You must also mimic the user's passage selection style (length, detail, full sentences vs. fragments, etc.) when suggesting passages.
      - Your coding decisions must be steered by the research questions and possible additional context information found below.
      - In your response, you must never:
        1. Include passages with no codes assigned.
        2. Include passages that are not relevant to the research questions.
      - Only use passages that exactly match the original text (verbatim, case-sensitive, identical spaces and punctuation).
      - Ensure that you use correct case for all the letters in the passages.
      - If a passage occurs multiple times in the subset, code all occurrences the same way, unless surrounding context suggests otherwise.
      - If there are clearly no relevant passages to code in the subset, respond with an empty array [].
      ### How should you select passages and codes?
      - Only code passages that are relevant to the research questions.
      - Reuse existing codes from the codebook whenever possible; introduce new ones only if conceptually distinct.
      - You can suggest multiple codes for a single passage if appropriate.
      ### Additional guidelines: 
      - Maintain the natural order of passages from the dataset.

      ## RESPONSE FORMAT:
      Output a pure JSON array of objects. Each object must have:
      1. "subPassageText": exact substring from the dataset.
      2. "suggestedCodes": array of code suggestions for the passage.

      Example:
      [
        {"subPassageText": "first relevant uncoded passage here", "suggestedCodes": ["new code 1", "new code 2"]},
        {"subPassageText": "second relevant uncoded passage here", "suggestedCodes": ["code from the codebook", "another code from the codebook"]},
        {"subPassageText": "third relevant uncoded passage here", "suggestedCodes": ["code from the codebook", "new code 3"]},
      ]

      - Output must be valid JSON (no Markdown formatting, no text outside the array).
      - Never include explanations, reasoning, or commentary.

      ## CONTEXT:
      Research questions: ${researchQuestions}
      Additional context information: ${contextInfo}
      `;
  };

  /**
   * Constructs the prompt (role: user) for the next AI suggestion based on the current context.
   * Contains the current codebook, few shot examples, and the subset of data to be coded.
   *
   * @returns A string prompt for the AI.
   */
  const constructUserPrompt = (passageId: number) => {
    // Ensure that there are at least 3 coded passages to use as few-shot examples
    const codedPassages = passages.filter((p) => p.codeIds.length > 0);
    if (codedPassages.length < MIN_FEW_SHOT_EXAMPLES) {
      throw new Error(`InsufficientExamplesError: At least ${MIN_FEW_SHOT_EXAMPLES} coded passages are required for AI suggestions.`);
    }

    // Randomly choose up to 10 coded examples for few-shot examples
    const fewShotExamples = codedPassages
      .sort(() => Math.random() - 0.5)
      .slice(0, 10)
      .map((p) => {
        const codes_: string[] = p.codeIds
          .map((id) => codes.find((c) => c.id === id)?.code)
          .filter(Boolean) as string[];
        
        return JSON.stringify({
          passage: p.text,
          codes: codes_
        });
      })
      .join(",\n");

    return `
        ## SUBSET TO CODE:
        ${passages.find((p) => p.id === passageId)?.text}

        ## CURRENT CODEBOOK:
        ${codebook.size === 0 
          ? "(No codes yet - create new ones based on the research questions)" 
          : Array.from(codebook).map((code) => `- ${code}`).join("\n")
        }

        ## FEW-SHOT EXAMPLES:
        ${fewShotExamples}
        `;
  };

  /** Creates a new AIsuggestion object.
   *
   * @param parentPassageId - The id of the parent passage.
   * @param suggestedPassage - The text of the suggested passage.
   * @param suggestedCodes - The suggested codes as an array of strings
   * @throws Error if parent passage or sub-passage not found
   * @returns AIsuggestion
   */
  const createAIsuggestion = (
    id: number,
    parentPassageId: number,
    suggestedPassage: string,
    suggestedCodes: string[]
  ): AIsuggestion => {
    const parentPassage = passages.find((p) => p.id === parentPassageId);
    if (!parentPassage) {
      throw new Error("ParentPassageNotFoundError");
    }

    const startIndex = parentPassage.text.indexOf(suggestedPassage);
    if (startIndex === -1) {
      throw new Error(
        `SubPassageNotFoundError: Sub-passage "${suggestedPassage}" not found. Ensure that subpassages are exact substrings of the dataset being coded.`
      );
    }
    const endIndex = startIndex + suggestedPassage.length;

    const aiSuggestion: AIsuggestion = {
      id: id,
      parentPassageId: parentPassageId,
      subPassageText: suggestedPassage,
      startIndex: startIndex,
      endIndex: endIndex,
      suggestedCodes: suggestedCodes.join("; "), // Convert array to semicolon-separated string
    };

    return aiSuggestion;
  };

  /** Converts the OpenAI response into an array of AISuggestion objects.
   *
   * @param response - The OpenAI response object.
   * @returns AIsuggestions[]
   */
  const parseAiResponse = (
    response: OpenAI.Responses.Response,
    parentPassageId: number
  ): AIsuggestion[] => {
    const text = response.output_text.trim();
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]") + 1;

    if (start === -1 || end === -1) {
      throw new Error(
        "InvalidResponseFormatError: JSON array opening or closing tag not found. Ensure the response contains a JSON array with the exact format specified."
      );
    }

    const jsonPart = text.slice(start, end);

    // Parse JSON and validate array structure
    let parsed;
    try {
      parsed = JSON.parse(jsonPart);
    } catch (jsonError) {
      throw new Error(
        "InvalidResponseFormatError: JSON parsing failed. Ensure the response is valid JSON."
      );
    }
    if (!Array.isArray(parsed)) {
      throw new Error(
        "InvalidResponseFormatError: Ensure that the response contains a JSON array with the exact format specified."
      );
    }

    // Validate each object has required fields
    const validatedSuggestions = parsed.filter(
      (
        item: any
      ): item is { subPassageText: string; suggestedCodes: string[] } => {
        return (
          item !== null &&
          typeof item === "object" &&
          typeof item.subPassageText === "string" &&
          item.subPassageText.trim().length > 0 &&
          Array.isArray(item.suggestedCodes) &&
          item.suggestedCodes.every((code: any) => typeof code === "string")
        );
      }
    );
    if (parsed.length > 0 && validatedSuggestions.length === 0) {
      throw new Error(
        "InvalidResponseFormatError: Ensure that your suggested JSON objects contain exactly only the fields: 'subPassageText' and 'suggestedCodes'."
      );
    }

    // Create an array of AIsuggestions
    const aiSuggestions: AIsuggestion[] = [];
    let currentSuggestionId = nextSuggestionId;
    validatedSuggestions.forEach((item) => {
      const aiSuggestion = createAIsuggestion(
        currentSuggestionId++,
        parentPassageId,
        item.subPassageText,
        item.suggestedCodes
      );
      aiSuggestions.push(aiSuggestion);
    });
    setNextSuggestionId(currentSuggestionId);

    return aiSuggestions;
  };

  /**
   * Fetches AI suggestions for an uncoded section of the data with automatic retry on recoverable errors.
   * Retries up to MAX_RETRY_ATTEMPTS times with clarifying messages when parsing fails.
   * @returns AIsuggestions[], or an empty array if all attempts fail.
   */
  const getFullSuggestions = async (passageId: number) => {
    let attempt = 0;
    let clarificationMessage = "";

    while (attempt < MAX_RETRY_ATTEMPTS) {
      try {
        const aiSuggestions = await statefullyCallOpenAI(
          apiKey,
          constructSystemPrompt(),
          constructUserPrompt(passageId) + clarificationMessage,
          OPENAI_MODEL
        );
        const parsedSuggestions = parseAiResponse(aiSuggestions, passageId);

        // Success (no error caught) - update state and exit
        return parsedSuggestions;
      } catch (error) {
        // Parsing failed, retry with a clarifying message
        clarificationMessage = `
          ## IMPORTANT NOTE!
          Your previous response was invalid! Please provide valid suggestions.
          ERROR MESSAGE: ${error instanceof Error ? error.message : ""}
        `;
        console.warn(
          `AI suggestion attempt ${attempt + 1} failed with error: ${error instanceof Error ? error.message : ""}. Retrying...`
        );
        attempt++;

        // Error code 400: Another API call may be currently in progress for this conversation => try again after a short delay
        if (
          error instanceof Error && error.message.includes("400")
        ) {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 seconds before retrying
          continue;
        }

        // If the error is non-response format related, do not retry
        if (
          error instanceof Error &&
          !(
            error.message.startsWith("InvalidResponseFormatError") ||
            error.message.startsWith("ParentPassageNotFoundError") ||
            error.message.startsWith("SubPassageNotFoundError")
          )
        ) {
          console.error("Non-retryable error encountered:", error);
          break;
        }
      }
    }
    console.error(`Failed to get valid AI suggestions after ${MAX_RETRY_ATTEMPTS} attempts for passage ${passageId}`);
    return []; // Return empty array if all attempts fail
  };

  return {
    getFullSuggestions,
  };
};
