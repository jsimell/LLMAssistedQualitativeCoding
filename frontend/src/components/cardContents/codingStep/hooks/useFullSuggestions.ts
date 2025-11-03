import { useContext } from "react";
import { AIsuggestion, WorkflowContext } from "../../../../context/WorkflowContext";
import { statefullyCallOpenAI } from "../../../../services/openai";
import OpenAI from "openai";

const MAX_RETRY_ATTEMPTS = 2;
const CONVERSATION_KEY = "full-coding"; // Add this constant
const OPENAI_MODEL = "gpt-4o-mini"; // Define the model to use


export const useFullSuggestions = () => {
  // Get global states from the context
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error("useFullSuggestions must be used within a WorkflowProvider");
  }
  const { rawData, researchQuestions, contextInfo, passages, codes, codebook, apiKey } = context;


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
      - Only use passages that exactly match the original text (verbatim, including spaces and punctuation).
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
      1. "passageText": exact substring from the dataset.
      2. "suggestedCodes": array of code suggestions for the passage.

      Example:
      [
        {"passageText": "first relevant uncoded passage here", "suggestedCodes": ["new code 1", "new code 2"]},
        {"passageText": "second relevant uncoded passage here", "suggestedCodes": ["code from the codebook", "another code from the codebook"]},
        {"passageText": "third relevant uncoded passage here", "suggestedCodes": ["code from the codebook", "new code 3"]},
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
    // Randomly choose up to 10 coded examples from the passages state
    const fewShotExamples = passages
      .filter(p => p.codeIds.length > 0) // take only coded passages
      .sort(() => Math.random() - 0.5) // shuffle
      .slice(0, 10) // take up to 10
      .map(p => {
        const codes_: string = p.codeIds.map(id => codes.find(c => c.id === id)?.code).filter(Boolean).join('", "');
        return `{"passage": "${p.text}", "codes": [${codes_ ? `"${codes_}"` : ""}]}`;
      })
      .join(",\n");

    return `
        ## SUBSET TO CODE:
        ${passages.find(p => p.id === passageId)?.text}

        CURRENT CODEBOOK:
        ${Array.from(codebook).map((code) => `- ${code}`).join("\n")}

        FEW-SHOT EXAMPLES:
        ${fewShotExamples}
        `;
  };


  const fuzzyMatchSuggestions = (suggestions: AIsuggestion[]): AIsuggestion[] => {
    // TODO: Implement logic
    // - the function should compare each suggested passage with existing passages in the context
    // - if a suggested passage is very similar to an existing passage (e.g., Levenshtein distance below a threshold), consider it a match
    // - if a passage does not match any existing passage, it should be removed from the suggestions
    return suggestions;
  };


  /**
   * Converts the OpenAI response into an array of AiSuggestion objects.
   *
   * @param response - The OpenAI response object.
   * @returns AIsuggestions[]
   */
  const parseAiResponse = (response: OpenAI.Responses.Response, parentPassageId: number): AIsuggestion[] => {
    const text = response.output_text.trim();
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]") + 1;

    if (start === -1 || end === -1) {
      throw new Error("INVALID_RESPONSE_FORMAT");
    }

    const jsonPart = text.slice(start, end);
    let aiSuggestions: AIsuggestion[] = [];
    
    // TODO: finish implementation
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
        let clarificationMessage: string | undefined;

        const aiSuggestions = await statefullyCallOpenAI(
          apiKey, 
          constructSystemPrompt(), 
          constructUserPrompt(passageId) + clarificationMessage,
          CONVERSATION_KEY, // Add conversation key
          OPENAI_MODEL
        );
        const parsedSuggestions = parseAiResponse(aiSuggestions, passageId);

        // Success (no error caught) - update state and exit
        return parsedSuggestions;

      } catch (error) {
        // Parsing failed, retry with a clarifying message
        clarificationMessage = `
          ## IMPORTANT NOTE!
          Your previous response was malformed! 
          Please ensure the JSON is properly formatted with correct syntax. 
          Please ensure each object in the array has the correct structure: 
          {'passageText': '...', 'suggestedCodes': ['code1', 'code2']}.
          Ensure you include only the JSON array in your response without any additional text.
        `;
        console.warn(`AI suggestion attempt ${attempt + 1} failed. Retrying...`);
        attempt++;

        // If the error is non-response format related, do not retry
        if (error instanceof Error && error.message !== "INVALID_RESPONSE_FORMAT") {
          console.error("Non-recoverable error encountered:", error); 
          break; 
        }
      }
    }
    return [];  // Return empty array if all attempts fail
  };

  return {
    getFullSuggestions,
  };
};
