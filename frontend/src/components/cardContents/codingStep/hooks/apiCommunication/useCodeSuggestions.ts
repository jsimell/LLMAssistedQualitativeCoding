import { useCallback, useContext } from "react";
import {
  Passage,
  WorkflowContext,
} from "../../../../../context/WorkflowContext";
import { callOpenAIStateless } from "../../../../../services/openai";
import {
  getPassageWithSurroundingContext,
} from "../../utils/passageUtils";
import { usePrompts } from "./usePrompts";

const OPENAI_MODEL = "gpt-4.1-mini";
const PRECEDING_CONTEXT_RATIO = 0.7;
const TRAILING_CONTEXT_RATIO = 1 - PRECEDING_CONTEXT_RATIO;

export const useCodeSuggestions = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error(
      "useCodeSuggestions must be used within a WorkflowProvider"
    );
  }
  const {
    researchQuestions,
    contextInfo,
    uploadedFile,
    codebook,
    codes,
    apiKey,
    passages,
    codeSuggestionContextWindowSize,
  } = context;

  const { generateCodeSuggestionsPrompt, generateAutocompleteSuggestionsPrompt } = usePrompts();

  const dataIsCSV = uploadedFile?.type === "text/csv";

  const precedingContextSize = codeSuggestionContextWindowSize
    ? Math.floor(codeSuggestionContextWindowSize * PRECEDING_CONTEXT_RATIO)
    : 350;
  const trailingContextSize = codeSuggestionContextWindowSize
    ? Math.floor(codeSuggestionContextWindowSize * TRAILING_CONTEXT_RATIO)
    : 150;

  /**
   * Gets code suggestions for a specific passage based on its existing codes and context.
   * @param passage - the text of the passage to get suggestions for
   * @returns suggested codes as an array of strings
   */
  const getCodeSuggestions = useCallback(
    async (passage: Passage) => {
      const { precedingContext, passageText, trailingContext } = getPassageWithSurroundingContext(
          passage,
          passages,
          precedingContextSize,
          trailingContextSize,
          dataIsCSV
        );

      const systemPrompt = generateCodeSuggestionsPrompt(
        dataIsCSV,
        passage,
        precedingContext,
        trailingContext
      );

      let response = await callOpenAIStateless(
        apiKey,
        systemPrompt,
        OPENAI_MODEL
      );
      let parsedResponse: string[];

      // Some simple validation of the response
      try {
        parsedResponse = JSON.parse(response.output_text.trim());
        if (!Array.isArray(parsedResponse)) throw new Error("Not an array");
      } catch {
        const retryPrompt =
          systemPrompt +
          "\n\n## ADDITIONAL NOTE:\nIt is absolutely critical that you respond ONLY with a JSON array as specified. Nothing else. No explanations.";
        response = await callOpenAIStateless(apiKey, retryPrompt, OPENAI_MODEL);
        try {
          parsedResponse = JSON.parse(response.output_text.trim());
          if (!Array.isArray(parsedResponse)) parsedResponse = [];
        } catch {
          console.warn(
            "Failed to parse code suggestions response:",
            response.output_text
          );
          parsedResponse = [];
        }
      }

      return parsedResponse;
    },
    [
      apiKey,
      passages,
      codes,
      researchQuestions,
      contextInfo,
      codebook,
      codeSuggestionContextWindowSize,
    ]
  );

  /** Gets a comprehensive list of autocomplete suggestions for a specific passage.
   * @param passageId - ID of the passage for which to get suggestions
   * @returns array of suggestions as strings
   */
  const getAutocompleteSuggestions = useCallback(
    async (passage: Passage) => {
      const { precedingContext, passageText, trailingContext } = getPassageWithSurroundingContext(
          passage,
          passages,
          precedingContextSize,
          trailingContextSize,
          dataIsCSV
        )

      const systemPrompt = generateAutocompleteSuggestionsPrompt(
        dataIsCSV,
        passage,
        precedingContext,
        trailingContext
      );

      let response = await callOpenAIStateless(
        apiKey,
        systemPrompt,
        OPENAI_MODEL
      );
      let parsedResponse;

      // Some simple validation of the response, and a single retry if needed
      try {
        parsedResponse = JSON.parse(response.output_text.trim());
        if (!Array.isArray(parsedResponse)) throw new Error("Not an array");
      } catch {
        const retryPrompt =
          systemPrompt +
          "\n\n## ADDITIONAL NOTE:\nIt is absolutely critical that you respond ONLY with a JSON array as specified. Nothing else. No explanations.";
        response = await callOpenAIStateless(apiKey, retryPrompt, OPENAI_MODEL);
        try {
          parsedResponse = JSON.parse(response.output_text.trim());
          if (!Array.isArray(parsedResponse)) parsedResponse = [];
        } catch {
          console.warn(
            "Failed to parse code autocomplete suggestions response:",
            response.output_text
          );
          parsedResponse = [];
        }
      }

      // Filter out any codes that contain semicolons, because they would break the code blob input
      parsedResponse = parsedResponse.filter(
        (code) => code.includes(";") === false
      );
      return parsedResponse;
    },
    [
      apiKey,
      passages,
      codes,
      researchQuestions,
      contextInfo,
      codebook,
      codeSuggestionContextWindowSize,
    ]
  );

  return {
    getCodeSuggestions,
    getAutocompleteSuggestions,
  };
};
