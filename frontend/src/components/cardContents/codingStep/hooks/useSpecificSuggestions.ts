import { useContext, useEffect, useState } from "react";
import { WorkflowContext } from "../../../../context/WorkflowContext";
import { callOpenAI, initializeConversation } from "../../../../services/openai";

const CONVERSATION_KEY = "passage-coding";
const OPENAI_MODEL = "gpt-4o-mini";  // Use a mini model for rapid suggestions

export const usePassageCodeSuggestion = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error("usePassageCodeSuggestion must be used within a WorkflowProvider");
  }
  const { researchQuestions, contextInfo, codebook, apiKey } = context;

  const [suggestedCodes, setSuggestedCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Reinitialize conversation when research questions or context info changes
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {        
        // Initialize new conversation with updated context
        await initializeConversation(apiKey, constructSystemPrompt(), CONVERSATION_KEY);
        if (cancelled) return;
      } catch (err) {
        if (!cancelled) console.error("Passage coding conversation initialization failed:", err);
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [apiKey, researchQuestions, contextInfo]);

  /**
   * Construct the system prompt for the conversation, using the current RQs and context info.
   */
  const constructSystemPrompt = () => {
    return `
    ## ROLE:
    - You are a qualitative coding assistant for rapid code suggestions. Given a specific passage and context, suggest relevant codes.

    ## BEHAVIOR:
    - The user will send you a passage to code, and the current codebook.
    - Your task is to suggest 1-5 codes that best fit the passage.
    - Reuse existing codes from the codebook whenever possible.
    - Only create new codes if conceptually distinct, and even then, try to mimic the wording and style of existing codes.
    - You must only suggest codes that are relevant to the passage and context.
    - If the passage is not relevant to the research questions, suggest no codes, and respond with an empty list [].

    ## RESPONSE FORMAT:
    - Output ONLY a JSON array of code strings. No explanations.
    - Example: ["code1", "code2", "code3"]
    - Your response should not contain any text outside the JSON array.

    ## CONTEXT:
    - Research questions: ${researchQuestions}
    - Additional context: ${contextInfo}
    `;
  };

  /**
   * Construct the user prompt for coding a specific passage.
   */
  const constructUserPrompt = (passage: string) => {
    return `
    CODEBOOK:
    ${Array.from(codebook).map((code) => `- ${code}`).join("\n")}

    PASSAGE TO CODE:
    "${passage}"
    `;
  };

  /**
   * Get code suggestions for a specific passage.
   */
  const getSuggestionsForPassage = async (passage: string) => {
    if (!passage.trim()) return;

    setIsLoading(true);
    try {
      const response = await callOpenAI(
        apiKey,
        constructSystemPrompt(),
        constructUserPrompt(passage),
        CONVERSATION_KEY,
        OPENAI_MODEL
      );

      const text = response.output_text.trim();
      const start = text.indexOf("[");
      const end = text.lastIndexOf("]") + 1;

      if (start !== -1 && end !== -1) {
        const jsonPart = text.slice(start, end);
        const codes = JSON.parse(jsonPart) as string[];
        setSuggestedCodes(codes);
      } else {
        setSuggestedCodes([]);
      }
    } catch (error) {
      console.error("Failed to get passage suggestions:", error);
      setSuggestedCodes([]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    suggestedCodes,
    isLoading,
    getSuggestionsForPassage,
  };
};