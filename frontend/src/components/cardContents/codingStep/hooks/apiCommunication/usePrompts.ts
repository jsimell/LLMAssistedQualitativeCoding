import { useContext } from "react";
import {
  CodeId,
  Passage,
  WorkflowContext,
} from "../../../../../context/WorkflowContext";
import { getPassageWithSurroundingContext } from "../../utils/passageUtils";

export const usePrompts = () => {
  const context = useContext(
    WorkflowContext
  );
  if (!context) {
    throw new Error(
      "usePrompts must be used within a WorkflowProvider"
    );
  }

  const {
    researchQuestions,
    codingGuidelines,
    highlightGuidelines,
    fewShotExamples,
    codebook,
    importedCodes,
    contextInfo,
    passages,
    codes,
    fewShotExamplesSelectionMode,
    randomFewShotExamplesCount,
    examplesPrecedingContextSize,
    examplesTrailingContextSize,
  } = context;

  /**
   * Helper function to construct the codebook string for embedding in prompts
   * @returns A string representation of the codebook for prompts
   */
  const constructCodebookString = (): string => {
    const codebookAndImported = Array.from(new Set([
      ...Array.from(codebook),
      ...Array.from(importedCodes)
    ]));
    return codebookAndImported.length > 0
      ? `\n${codebookAndImported
          .map((code) => `"${code}"`)
          .join(", \n")}\n`
      : "No codes in the codebook yet"
  };

  const constructFewShotExamplesString = (dataIsCSV: boolean): string => {
    // Common helper to escape strings for embedding in the prompt
    const escapeForPrompt = (value: string) =>
      value
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")
        .replace(/\t/g, "\\t");

    if (fewShotExamplesSelectionMode === "manual") {
      // Manual selection mode
      if (fewShotExamples.length === 0) {
        return "No few-shot examples specified yet";
      }

      const examplesString = fewShotExamples
        .map(
          (example) => `
  {
    passageWithSurroundingContext: "${escapeForPrompt(example.precedingText + "<<<" + example.codedPassage + ">>>" + example.trailingText)}",
    codes: [${example.codes
      .map((code) => `"${escapeForPrompt(code)}"`)
      .join(", ")}],
  }`
        )
        .join(",\n");

      return `[${examplesString}]`;
    } else {
      // Random selection mode
      const randomPassages = passages
        .filter((p) => p.isHighlighted && p.codeIds.length > 0 && codes.filter((c) => p.codeIds.includes(c.id)).some((c) => c.code && c.code.trim().length > 0))
        .sort(() => 0.5 - Math.random())
        .slice(0, randomFewShotExamplesCount)
        .map((p) => {
          const passageCodes = p.codeIds
            .map((cid) => codes.find((c) => c.id === cid)?.code || "")
            .filter(Boolean);
          const { precedingContext, passageText, trailingContext } = getPassageWithSurroundingContext(
            p,
            passages,
            examplesPrecedingContextSize ?? 30,
            examplesTrailingContextSize ?? 15,
            dataIsCSV
          );
          return {
            precedingText: precedingContext,
            codedPassage: passageText,
            trailingText: trailingContext,
            codes: passageCodes
          };
        });

      if (randomPassages.length === 0) {
        return "No few-shot examples specified yet";
      }

      const examplesString = randomPassages
        .map(
          (example) => `
  {
    passageWithSurroundingContext: "${escapeForPrompt(example.precedingText + "<<<" + example.codedPassage + ">>>" + example.trailingText)}",
    codes: [${example.codes
      .map((code) => `"${escapeForPrompt(code)}"`)
      .join(", ")}],
  }`
        )
        .join(",\n");

      return examplesString;
    }
  }

  /**
   * Retrieves the prompt for highlight suggestions based on the uploaded data format.
   * @param dataIsCSV Boolean flag indicating whether the uploaded data is in CSV format
   * @param precedingText Preceding text of the passage to be coded
   * @param searchArea The search area text to find the next suggestion from
   * @return The highlight suggestions prompt string, or null, if not all required information has been defined in the context
   */
  const generateHighlightSuggestionsPrompt =
    (
      dataIsCSV: boolean,
      precedingText: string,
      searchArea: string
    ) => {
      if (!dataIsCSV) { // DATA IS NOT CSV
        return `
## ROLE
You are a qualitative coding assistant whose purpose is to provide coding suggestions that mimic the coding style of the user. 
Your task is to analyze the SEARCH AREA, and identify and code the FIRST passage that is relevant to the research context.
You must respond only with the specified format.

## USER PROVIDED GUIDELINES
Coding style: ${codingGuidelines.trim().length > 0 ? codingGuidelines : "-"}
Passage selection style: ${highlightGuidelines?.trim().length > 0 ? highlightGuidelines : "-"}

## RESEARCH CONTEXT
Research questions: ${researchQuestions}
Additional research context: ${contextInfo.trim().length > 0 ? contextInfo : "-"}

## TASK
1. Review the codebook and coding style examples to understand the user's coding style.
  - User's coding style entails: 
    (1) how the user selects the coded passage within surrounding context (i.e., which text they highlight as <<<coded>>> versus what remains as context)
    (2) how the user typically links the meanings of text passages to codes, 
    (3) the types of concepts they prioritize in their coding, and
    (4) the level of detail, wording, and language of the codes.
2. Find the FIRST subpassage in the SEARCH AREA that helps answer at least one research question 
(e.g. by describing a reason, experience, mechanism, consequence, or decision related to the topic).
  - Your subpassage selection must match the user's passage selection style illustrated by the examples.
  - The selection style must obey the USER PROVIDED GUIDELINES above (if provided).
  - Mimic the user's typical passage cutting style and length (full sentences/paragraphs vs. fragments, complete thoughts vs. partial ideas).
3. Coding:
  - Once you find a relevant passage, your task is to assign **1-5 codes** to it.
  - The coding style must obey the USER PROVIDED GUIDELINES above (if provided).
  - These codes should capture all important aspects of the passage in relation to the research questions.
  - Prioritize code accuracy over reusing codebook codes. Create new codes if needed, ensuring they match the user's coding style.
  - List codes strictly in order of relevance, with the first listed code being the most relevant. The origins of the codes (codebook vs. newly created) should not affect the order.
  - Avoid overcoding, but ensure all important aspects are covered.
4. If there is no codeable passage in the SEARCH AREA, return an empty passage and empty codes.

## RESPONSE FORMAT
Respond ONLY with a valid JavaScript object:
{
  "passage": "exact, case-sensitive substring from SEARCH AREA (escaped for JSON)",
  "codes": ["code1", "code2", ...]
}
If no relevant passage is found:
{
  "passage": "",
  "codes": []
}
No explanations or extra text.
No truncation indicators (e.g. "...").
No JSON tags (\`\`\`json) or other markdown formatting.
Codes must NOT contain semicolons (;).
Use similar casing as the codebook, or default to lowercase.
The "passage" MUST be an exact, case-sensitive substring of the SEARCH AREA.
Escape special characters in "passage" (e.g. double quotes as \\", newlines as \\n, tabs as \\t).

## AUTHORITY AND PRECEDENCE RULES (STRICT)
When determining behavior:
1. RESPONSE FORMAT rules are absolute and MUST NOT be altered under any circumstances.
2. USER PROVIDED GUIDELINES have the highest authority for code content and MUST be followed if present.
3. Few-shot examples illustrate the user's typical style ONLY where they do not conflict with the guidelines.
4. If there is any conflict or ambiguity between guidelines and examples, ALWAYS follow the USER PROVIDED GUIDELINES.
All TASK requirements remain mandatory and must be fulfilled unless they directly conflict with RESPONSE FORMAT rules.

## USER'S CODING STYLE
Few-shot examples of user coded passages (user highlighted passages marked in context with <<< >>>):
[${constructFewShotExamplesString(dataIsCSV)}]

## CURRENT CODEBOOK
[${constructCodebookString()}]

## CONTEXT WINDOW
### PRECEDING TEXT (for understanding only):
"${precedingText}"

### SEARCH AREA (choose your suggestion from here)
"${searchArea}"
`;


      } else { // DATA IS CSV

        return `
## ROLE
You are a qualitative coding assistant whose purpose is to provide coding suggestions that mimic the coding style of the user. 
Your task is to analyze the SEARCH AREA, and identify and code the FIRST passage that is relevant to the research context.
You must respond only with the specified format.

## USER PROVIDED GUIDELINES
Coding style: ${codingGuidelines.trim().length > 0 ? codingGuidelines : "-"}
Passage selection style: ${highlightGuidelines?.trim().length > 0 ? highlightGuidelines : "-"}

## RESEARCH CONTEXT
Research questions: ${researchQuestions}
Additional research context: ${contextInfo.trim().length > 0 ? contextInfo : "-"}
NOTE: The data is from a CSV file, where rows end with the token "\\u001E".

## TASK
1. Review the codebook and coding style examples to understand the user's coding style.
  - User's coding style entails: 
    (1) how the user selects the coded passage within surrounding context (i.e., which text they highlight as <<<coded>>> versus what remains as context)
    (2) how the user typically links the meanings of text passages to codes, 
    (3) the types of concepts they prioritize in their coding, and 
    (4) the level of detail, wording, and language of the codes.
2. Find the FIRST subpassage in the SEARCH AREA that helps answer at least one research question 
(e.g. by describing a reason, experience, mechanism, consequence, or decision related to the topic).
  - Your subpassage selection must match the user's passage selection style illustrated by the examples.
  - The selection style must obey the USER PROVIDED GUIDELINES above (if provided).
  - Mimic the user's typical passage cutting style and length (full sentences/paragraphs vs. fragments, complete thoughts vs. partial ideas).
  - The search area may start mid-CSV-row; if so, ensure your selected passage does not include any text before the start of the search area.
  - The suggested passage must NOT span over multiple CSV rows (i.e. the end of row token \\u001E must never occur in the middle of your suggestion).
3. Coding:
  - Once you find a relevant passage, your task is to assign **1-5 codes** to it.
  - The coding style must obey the USER PROVIDED GUIDELINES above (if provided).
  - These codes should capture all important aspects of the passage in relation to the research questions.
  - Prioritize code accuracy over reusing codebook codes. Create new codes if needed, ensuring they match the user's coding style.
  - List codes strictly in order of relevance, with the first listed code being the most relevant. The origin of the code (codebook vs. newly created) should not affect the order.
  - Avoid overcoding, but ensure all important aspects are covered.
4. If there is no codeable passage in the SEARCH AREA, return an empty passage and empty codes.

## RESPONSE FORMAT
Respond ONLY with a valid JavaScript object:
{
  "passage": "exact, case-sensitive substring from SEARCH AREA (escaped for JSON)",
  "codes": ["code1", "code2", ...]
}
If no relevant passage is found:
{
  "passage": "",
  "codes": []
}
No explanations or extra text.
No truncation indicators (e.g. "...").
No JSON tags (\`\`\`json) or other markdown formatting.
Codes must NOT contain semicolons (;).
Use similar casing as the codebook, or default to lowercase.
The "passage" MUST be an exact, case-sensitive substring of the SEARCH AREA.
Escape special characters in "passage" (e.g. double quotes as \\", newlines as \\n, tabs as \\t).
Do not include the end of row token \\u001E in your response.

## AUTHORITY AND PRECEDENCE RULES (STRICT)
When determining behavior:
1. RESPONSE FORMAT rules are absolute and MUST NOT be altered under any circumstances.
2. USER PROVIDED GUIDELINES have the highest authority for code content and MUST be followed if present.
3. Few-shot examples illustrate the user's typical style ONLY where they do not conflict with the guidelines.
4. If there is any conflict or ambiguity between guidelines and examples, ALWAYS follow the USER PROVIDED GUIDELINES.
All TASK requirements remain mandatory and must be fulfilled unless they directly conflict with RESPONSE FORMAT rules.

## USER'S CODING STYLE
Few-shot examples of user coded passages (user highlighted passages marked in context with <<< >>>):
[${constructFewShotExamplesString(dataIsCSV)}]

## CURRENT CODEBOOK
[${constructCodebookString()}]

## CONTEXT WINDOW
### PRECEDING TEXT (for understanding only):
"${precedingText}"

### SEARCH AREA (choose your suggestion from here)
"${searchArea}"
`;
      }
    };

  /**
   * Generates the autocomplete suggestions prompt based on the uploaded data format. Uses the current context for dynamic generation.
   * @param dataIsCSV Boolean flag indicating whether the uploaded data is in CSV format
   * @param currentUserInput The current user input to be completed
   * @param precedingText Preceding text of the passage to be coded
   * @param passage The passage to generate autocomplete suggestions for
   * @param existingCodes The existing codes for the passage
   * @returns The autocomplete suggestions prompt string
   */
  const generateAutocompleteSuggestionPrompt =
    (
      dataIsCSV: boolean,
      currentUserInput: string,
      precedingText: string,
      passage?: Passage,
      existingCodes?: string[],
    ) => {

      return `
## ROLE
You are a qualitative coding assistant for code autocompletion.

## TASK
Situation: the user is in the process of typing a code for the target passage and has paused. 
Your role is to help finish typing that code, not to create a new or more elaborate one.

Given the CURRENT USER INPUT and the user's established coding style, minimally extend the input into a complete code. 
Use the target passage and existing codes to ensure compatibility and non-overlap.

Guidelines:
- Treat this as autocomplete, not analysis or full coding.
- Assume the user has already chosen the intended conceptual direction; your task is only to minimally complete it.
- Ensure the code accurately reflects the meaning of the target passage.
- Code ONLY the target passage, and NEVER describe any aspect of the preceding context.
- If the CURRENT USER INPUT is semantically incomplete (e.g., “lack of”, “confusion about”), minimally complete it by introducing the most likely single aspect that fits the passage and complements existing codes.
- If the CURRENT USER INPUT already expresses a specific meaning, do NOT extend it by adding additional aspects, dimensions, causes, or interpretations (e.g., via conjunctions).
- Only use conjunctions if necessary to complete the current idea. Do not add extra aspects, examples, or explanations through conjunctions (e.g., “and”, “or”).
- Prefer the shortest valid completion that forms an accurate full code in the user's style.
- If the CURRENT USER INPUT already forms a complete and plausible code (even if vague), return it unchanged.
- Match the wording, conciseness, abstraction level, and language of the existing codebook (if any).
- Do NOT introduce concepts that are clearly outside the scope of the study.
- The suggested code should complement the existing codes for the passage, if any.
- NEVER suggest a code that closely semantically overlaps with an existing code for the same passage.

## OUTPUT FORMAT (STRICT)
- Return exactly one code string.
- The code MUST start with the CURRENT USER INPUT and include it in full.
- No explanations.
- No wrapping quotes.
- No markdown, JSON, or extra text.
- No semicolons.
- No punctuation unless it is part of the code itself.

## AUTHORITY AND PRECEDENCE RULES (STRICT)
1. RESPONSE FORMAT rules are absolute and must be followed under all circumstances.
2. If there is any conflict between USER PROVIDED CODE STYLE GUIDELINES and patterns inferred from the codebook, 
follow the USER PROVIDED CODE STYLE GUIDELINES.
All TASK requirements remain mandatory and must be fulfilled unless they directly conflict with RESPONSE FORMAT rules.

## USER PROVIDED CODE STYLE GUIDELINES:
${codingGuidelines.trim().length > 0 ? codingGuidelines : "None."}

## RESEARCH CONTEXT
Research questions: ${researchQuestions}
Additional research context: ${contextInfo.trim().length > 0 ? contextInfo : "-"}
${dataIsCSV ? `- NOTE: Data is from a CSV file where rows end with: "\\u001E".` : ""}

## CURRENT CODEBOOK
[${constructCodebookString()}]

## PRECEDING CONTEXT (for context only; your suggestion must not describe concepts from this context):
"${precedingText}"

## TARGET PASSAGE (passage to code)
"${passage ? passage.text : "<target passage will be inserted here>"}"

## TARGET PASSAGE EXISTING CODES
${
  passage
    ? existingCodes && existingCodes.length > 0
      ? `[${existingCodes.join(
          ", "
        )}]`
      : "No existing codes."
    : "[<existing codes of the target passage will be inserted here>]"
}

## CURRENT USER INPUT (code to complete)
"${currentUserInput}"
`;
    };

  /**
   * Generates the code suggestions prompt based on the uploaded data format. Uses the current context for dynamic generation.
   * @param dataIsCSV Boolean flag indicating whether the uploaded data is in CSV format
   * @param precedingText Preceding text of the passage to be coded
   * @param passage The passage to generate code suggestions for
   * @returns The code suggestions prompt string
   */
  const generateCodeSuggestionsPrompt =
    (
      dataIsCSV: boolean,
      precedingText: string,
      passage?: Passage
    ) => {
      const existingCodes = passage
        ? passage.codeIds
            .map(
              (cid) =>
                codes.find(
                  (c) => c.id === cid
                )?.code || ""
            )
            .filter(Boolean)
        : [];

      return `
## ROLE
You are a qualitative coding assistant. Suggest relevant codes for the target passage according to the user's coding style and research questions.

## USER PROVIDED CODE STYLE GUIDELINES:
${codingGuidelines.trim().length > 0 ? codingGuidelines : "None."}

## RESEARCH CONTEXT
Research questions: ${researchQuestions}
Additional research context: ${contextInfo.trim().length > 0 ? contextInfo : "-"}
${dataIsCSV ? `- NOTE: Data is from a CSV file where rows end with: "\\u001E".` : ""}

## TASK
Suggest codes for the TARGET PASSAGE that align with the research questions and the user's coding style.
  - Obey USER PROVIDED CODE STYLE GUIDELINES if present.
  - The user's coding style includes 
    (1) how meanings are mapped to codes, 
    (2) which concepts are prioritized, and 
    (3) the typical wording, conciseness, level of detail, language, and conceptual focus of the codes.

** Based on the passage's existing codes, follow one of these two cases: **
Case 1 - If the passage has NO existing codes:
  - Provide a comprehensive coding. Suggest up to 5 conceptually distinct codes capturing what the passage reveals in relation to the research questions.
Case 2 - If the passage has existing codes:
  - Suggest additional complementary codes that add new insights. Do not repeat or closely match existing codes. Total codes (existing + new) must be max 5.

  In both cases:
  - The coding style must obey the USER PROVIDED GUIDELINES above (if provided).
  - These codes should capture all important aspects of the passage in relation to the research questions.
  - Prioritize code accuracy over reusing codebook codes. Create new codes if needed, ensuring they match the user's coding style.
  - List codes strictly in order of relevance, with the first listed code being the most relevant. The origins of the codes (codebook vs. newly created) should not affect the order.
  - Avoid overcoding, but ensure all important aspects are covered.
  - Return [] if no relevant codes can be identified.
  - Do NOT include any of the passage's existing codes in your suggestions.
  - Ignore clearly unfinished existing codes (e.g. "lack of" or "confus" ).
  - Only code the target passage; codes must NEVER describe the preceding context.

## AUTHORITY AND PRECEDENCE RULES (STRICT)
1. RESPONSE FORMAT rules are absolute and must be followed under all circumstances.
2. If there is any conflict between USER PROVIDED CODE STYLE GUIDELINES and patterns inferred from the codebook or examples, 
follow the USER PROVIDED CODE STYLE GUIDELINES.

## RESPONSE FORMAT
- Respond ONLY with a JSON array of code strings, e.g. ["code1", "code2", "code3"]. 
- No explanations. No JSON tags (\`\`\`json) or other markdown formatting. 
- Codes must never contain semicolons (;).

## USER'S CODING STYLE
User coded passages (coded passages marked in context with <<< >>>):
[${constructFewShotExamplesString(dataIsCSV)}]

## CURRENT CODEBOOK
[${constructCodebookString()}]

## PRECEDING CONTEXT (for context only; codes must not introduce concepts from this context):
"${precedingText}"

## TARGET PASSAGE (passage to code)
"${passage ? passage.text : "<target passage will be inserted here>"}"

## TARGET PASSAGE EXISTING CODES
${
  passage
    ? existingCodes && existingCodes.length > 0
      ? `[${existingCodes.join(
          ", "
        )}]`
      : "No existing codes."
    : "[<existing codes of the target passage will be inserted here>]"
}
`;
    };

  return {
    generateHighlightSuggestionsPrompt,
    generateAutocompleteSuggestionPrompt,
    generateCodeSuggestionsPrompt,
  };
};
