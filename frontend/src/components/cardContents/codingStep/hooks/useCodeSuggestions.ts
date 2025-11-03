import { useContext } from "react";
import { WorkflowContext } from "../../../../context/WorkflowContext";
import { callOpenAIStateless } from "../../../../services/openai";

const OPENAI_MODEL = "gpt-4.1-nano"; // Use a nano model for rapid suggestions

export const useCodeSuggestions = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error(
      "useCodeSuggestions must be used within a WorkflowProvider"
    );
  }
  const { researchQuestions, contextInfo, codebook, apiKey, passages, codes } = context;

  /**
   * Gets code suggestions for a specific passage based on its existing codes and context.
   * @param passage - the text of the passage to get suggestions for
   * @param codes - array of existing codes for the passage
   * @returns suggested codes as a string (codes separated by "; ")
   */
  const getCodeSuggestions = async (passage: string, existingCodes: string[]) => {
    const systemPrompt = `
      ## ROLE:
      You are a qualitative coding assistant for rapid code suggestions. 
      Given a specific passage, its current codes, and coding context, suggest additional relevant codes for the passage.

      ## CONTEXT:
      - Passage to code: "${passage}"
      - Current codes of the passage: [${existingCodes.join(", ")}]
      - Research questions: "${researchQuestions}"
      - Additional context: "${contextInfo}"
      - Codebook: [${Array.from(codebook)
        .map((code) => `${code}`)
        .join(", ")}]

      ## BEHAVIOR:
      - Your task is to suggest additional codes that would improve the accuracy of the coding.
      - The maximum number of codes is 5, including existing ones.
      - You CANNOT remove any of the existing codes. Your task is only to suggest ADDITIONAL codes.
      - If there are no existing codes, suggest codes as if it were a new passage.
      - Reuse existing codes from the codebook whenever possible.
      - Only create new codes if conceptually distinct, and even then, try to mimic the wording and style of the codebook.
      - You must only suggest codes that are relevant in terms of the research questions.
      - If you can't think of any additional relevant codes, suggest no codes, and respond with an empty list [].

      ## RESPONSE FORMAT:
      - Output ONLY a JSON array of code strings. No explanations or any text outside the JSON array.
      - **IMPORTANT**: Codes MUST NOT contain semicolons (;). If punctuation is needed (should be rare), use a different delimiter.
      - Example: ["existing code", "suggested code1", "suggested code2"]
    `;

  let response = await callOpenAIStateless(apiKey, systemPrompt, OPENAI_MODEL);
  let parsedResponse;

  // Some simple validation of the response
  try {
    parsedResponse = JSON.parse(response.output_text.trim());
    if (!Array.isArray(parsedResponse)) throw new Error("Not an array");
  } catch {
    const retryPrompt = systemPrompt + "\n\n## ADDITIONAL NOTE:\nIt is absolutely critical that you respond ONLY with a JSON array as specified. Nothing else. No explanations.";
    response = await callOpenAIStateless(apiKey, retryPrompt, OPENAI_MODEL);
    try {
      parsedResponse = JSON.parse(response.output_text.trim());
      if (!Array.isArray(parsedResponse)) parsedResponse = [];
    } catch {
      parsedResponse = [];
    }
  }

  const suggestionsString = parsedResponse.join("; ");
  return suggestionsString;
};


  return {
    getCodeSuggestions
  };
};
