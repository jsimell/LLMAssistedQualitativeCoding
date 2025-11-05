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
      Given a specific passage, its current codes, research questions, and additional context, suggest relevant codes for the passage.

      ## CONTEXT:
      - Passage to code: "${passage}"
      - Existing codes of the passage: [${existingCodes.join(", ")}]
      - Research questions: "${researchQuestions}"
      - Additional context: "${contextInfo}"
      - Codebook: [${Array.from(codebook)
        .map((code) => `${code}`)
        .join(", ")}]

      ## BEHAVIOR:
      ${existingCodes.length === 0 
        ? "- Your task is to code the passage from scratch using the codebook and research questions as guidance."
        : ` 
        - Your task is to suggest ADDITIONAL codes to complement the existing codes. 
        - Do NOT suggest codes that are conceptually identical to any of the existing codes.
        - The combination of existing and suggested codes should provide comprehensive coverage of the passage.
        - Do NOT include existing codes in your suggestions.
        `}
      - Only suggest codes that provide meaningful value in terms of the research questions.
      - Reuse existing codes from the codebook whenever possible.
      - Only create a new code if it is conceptually distinct from all the codes in the codebook.
      - If you create a new code, mimic the wording and style of the existing codes.
      - Avoid overcoding; only suggest codes that add meaningful value to the existing ones.
      - If you can't think of any additional relevant codes, suggest no codes, and respond with an empty list [].

      ## RESPONSE FORMAT:
      - Output ONLY a JSON array of code strings. No explanations or any text outside the JSON array.
      - **IMPORTANT**: Codes MUST NOT contain semicolons (;). If punctuation is needed (should be rare), use a different delimiter.
      - Example: ["suggested code1", "suggested code2"]
    `;

  console.log("Existing codes used for stateless call:", existingCodes);
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
