import { useContext, useEffect, useState } from "react";
import { WorkflowContext } from "../../../../context/WorkflowContext";
import { callOpenAIStateless } from "../../../../services/openai";

const OPENAI_MODEL = "gpt-4o-mini"; // Use a mini model for rapid suggestions

export const usePassageCodeSuggestion = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error(
      "usePassageCodeSuggestion must be used within a WorkflowProvider"
    );
  }
  const { researchQuestions, contextInfo, codebook, apiKey, passages, codes } = context;


  /**
   * Get code suggestions for a single NEW (uncoded) passage selected by user
   * @param passage The passage to get code suggestions for as a string
   * @return A list of suggested codes (strings): string[]
   */
  const getSuggestionsForNewPassage = async (passage: string) => {
    const systemPrompt = `
      ## ROLE:
      - You are a qualitative coding assistant for rapid code suggestions. Given a specific passage and context, suggest relevant codes.

      ## CONTEXT:
      - Research questions: "${researchQuestions}"
      - Additional context: "${contextInfo}"
      - Codebook: [${Array.from(codebook)
        .map((code) => `${code}`)
        .join(", ")}]
      - Passage to code: "${passage}"

      ## BEHAVIOR:
      - Your task is to suggest 1-5 codes that best fit the passage.
      - Reuse existing codes from the codebook whenever possible.
      - Only create new codes if conceptually distinct, and even then, try to mimic the wording and style of the codebook.
      - You must only suggest codes that are relevant in terms of the research questions.
      - If the passage is not relevant to the research questions, suggest no codes, and respond with an empty list [].

      ## RESPONSE FORMAT:
      - Output ONLY a JSON array of code strings. No explanations or any text outside the JSON array.
      - Example: ["code1", "code2", "code3"]
    `;

    // Make an API call with NEW_PASSAGE conversation key
    const response = callOpenAIStateless(apiKey, systemPrompt, OPENAI_MODEL);

    // Some simple validation of the response
    const parsedResponse = JSON.parse((await response).output_text.trim());
    if (!parsedResponse ||!Array.isArray(parsedResponse)) {
      // Retry once with an additional instruction to respond only with JSON
      const additionalInstructions = "\n\n## ADDITIONAL NOTE:\n- It is absolutely crucial that you respond ONLY with a Javascript array as specified. No explanations or any other text is allowed. Please adhere strictly to the format.";
      const retryResponse = callOpenAIStateless(apiKey, systemPrompt + additionalInstructions, OPENAI_MODEL);
      return JSON.parse((await retryResponse).output_text?.trim() ?? "[]");
    }
    return parsedResponse;
  };

  /**
   * Get ADDITIONAL code suggestions for all the passages that already have some codes assigned
   * @return A list of objects with passage text and suggested additional codes
   */
  const getAdditionalCodeSuggestions = async () => {
    const codedPassages = passages
      .filter((p) => p.codeIds.length > 0)
      .map((p) => ({
        passage: p.text,
        codes: p.codeIds
          .map((id) => codes.find((c) => c.id === id)?.code)
          .filter(Boolean),
      }));

    const systemPrompt = `
      ## ROLE:
      You are a qualitative coding assistant for ensuring that passages are comprehensively coded. 
      Given a set of passages that already have some codes assigned, suggest any ADDITIONAL codes that may be relevant.
      
      ## CONTEXT:
      - Research questions: "${researchQuestions}"
      - Additional context: "${contextInfo}"
      - Codebook: [${JSON.stringify(Array.from(codebook), null, 2)}]
      - Coded passages: ${JSON.stringify(codedPassages, null, 2)}

      ## BEHAVIOR:
      - Review each passage and its existing codes.
      - Suggest 0-3 ADDITIONAL codes that would be relevant but are not yet assigned.
      - All codes that a passage has must be relevant to the research questions.
      - Only suggest codes that add new conceptual dimensions or perspectives.
      - Reuse codes from the codebook whenever possible.
      - You can use codes that are not in the codebook, but only do this when they are conceptually distinct and relevant to the passage.
      - If a passage is already well-coded and needs no additional codes, DO NOT include it in your response.

      ## RESPONSE FORMAT:
      - Output ONLY a JSON array of objects.
      - Each object must have:
        1. "passage": exact text of the passage (MUST match input exactly. VERY IMPORTANT)
        2. "additionalCodes": array of 1-3 suggested codes to add
      - Include ONLY passages that need additional codes.
      - If no passages need additional codes, return an empty array [].
      - Never include explanations, never include text outside the JSON array.

      Example (only including passages that need more codes):
      [
        {"passage": "exact passage text here", "additionalCodes": ["code1", "code2"]},
        {"passage": "another passage text", "additionalCodes": ["code3", "code1 again"]}
      ]
      :
    `;

    // Make an API call with ADDITIONAL_CODES conversation key
    const response = callOpenAIStateless(apiKey, systemPrompt, OPENAI_MODEL);

    // Some simple validation of the response
    const parsedResponse = JSON.parse((await response).output_text.trim());
    if (!parsedResponse || !Array.isArray(parsedResponse)) {
      // Retry once with an additional instruction to respond only with JSON
      const additionalInstructions = "\n\n## ADDITIONAL NOTE:\n- It is absolutely crucial that you respond ONLY with a JSON array as specified. No explanations or any other text is allowed. Please adhere strictly to the format.";
      const retryResponse = callOpenAIStateless(apiKey, systemPrompt + additionalInstructions, OPENAI_MODEL);
      return JSON.parse((await retryResponse).output_text?.trim() ?? "[]");
    }
    return parsedResponse;
  };

  return {
    getSuggestionsForNewPassage,
    getAdditionalCodeSuggestions,
  };
};
