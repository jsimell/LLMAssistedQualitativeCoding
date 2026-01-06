import { useContext } from "react";
import {
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
          (example) =>
            `{
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
        .filter((p) => p.codeIds.length > 0)
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
          (example) =>
            `{
  precedingText: "${escapeForPrompt(example.precedingText)}",
  codedPassage: "${escapeForPrompt(example.codedPassage)}",
  trailingText: "${escapeForPrompt(example.trailingText)}",
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
   * Retrieves the prompt for highlight suggestions based on the uploaded data format. Uses the current context for dynamic generation.
   * @param precedingText Preceding text of the search area. For review, can be left undefined, in which case a placeholder will be used.
   * @param searchArea The text area in which to search for the next highlight suggestion. For review, can be left undefined, in which case a placeholder will be used.
   * @return The highlight suggestions prompt string, or null, if not all required information has been defined in the context
   */
  const generateHighlightSuggestionsPrompt =
    (
      dataIsCSV: boolean,
      precedingText?: string,
      searchArea?: string
    ) => {
      if (!dataIsCSV) { // DATA IS NOT CSV
        return `
## ROLE
You are an expert qualitative coding assistant whose purpose is to provide coding suggestions that mimic the coding style of the user. 
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
${
  precedingText &&
  precedingText.trim().length > 0
    ? `
### PRECEDING TEXT (for understanding only)
"${precedingText}"
`
    : "<preceding text will be inserted here>"
}
### SEARCH AREA (choose your suggestion from here)
"${
  searchArea
    ? searchArea
    : "<search area will be inserted here>"
}"`;


      } else { // DATA IS CSV

        return `
## ROLE
You are an expert qualitative coding assistant whose purpose is to provide coding suggestions that mimic the coding style of the user. 
Your task is to analyze the SEARCH AREA, and identify and code the FIRST passage that is relevant to the research context.
The data is from a CSV file, where rows end with the token "\\u001E". You must respond only with the specified format.

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
${
  precedingText &&
  precedingText.trim().length > 0
    ? `
### PRECEDING TEXT (for understanding only)
"${precedingText}"
`
    : "<preceding text will be inserted here>"
}
### SEARCH AREA (choose your suggestion from here)
"${
  searchArea
    ? searchArea
    : "<search area will be inserted here>"
}"
`;
      }
    };

  /**
   * Generates the autocomplete suggestions prompt based on the uploaded data format. Uses the current context for dynamic generation.
   * @param dataIsCSV Boolean flag indicating whether the uploaded data is in CSV format
   * @param passage The passage to generate autocomplete suggestions for
   * @param passageWithSurroundingContext The passage along with its surrounding context to provide more information for generating suggestions
   * @returns The autocomplete suggestions prompt string
   */
  const generateAutocompleteSuggestionsPrompt =
    (
      dataIsCSV: boolean,
      passage?: Passage,
      precedingText?: string,
      trailingText?: string
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
You are a qualitative coding assistant for code autocompletion. Given a passage to code, its surrounding context, and examples of the user's coding style, suggest a broad set of relevant codes that aim to mimic the user's coding style and maximize autocomplete matches.

## USER PROVIDED CODE STYLE GUIDELINES:
${codingGuidelines.trim().length > 0 ? codingGuidelines : "None."}

## RESEARCH CONTEXT
Research questions: ${researchQuestions}
Additional research context: ${contextInfo.trim().length > 0 ? contextInfo : "-"}

## TASK
Your task is to suggest 30-50 (depending on the complexity of the passage) codes for the given passage that align with the user's coding style and 
cover relevant aspects of the passage in relation to the research questions (i.e. help answer the research questions).
  - Use the codebook and the few-shot examples to understand the user's coding style. 
  - User's coding style entails: 
    (1) how the user typically links the meanings of text passages to codes, 
    (2) the types of concepts they prioritize in their coding, and 
    (3) the level of detail, wording, and language of the codes.
  - Using the user's coding style, suggest a broad set of codes that could be relevant for the passage. 
  - The coding style must obey the USER PROVIDED CODE STYLE GUIDELINES above (if provided).
  - Aim for breadth and variety in your suggestions, covering different angles and aspects of the passage, and including varying wordings of similar concepts.
  - The goal is to maximize the likelihood of autocomplete matches.
  Constraints:
  - You must NOT include codebook codes or existing codes of the passage in your suggestions.
  - You must NOT suggest codes that are semantically identical or very similar to codebook codes or existing codes of the passage. 
    However, you can suggest variations that are related but not semantically identical.

## RESPONSE FORMAT
Respond ONLY with a JSON array of code strings, e.g. ["code1", "code2", "code3"]. 
No explanations. No JSON tags (\`\`\`json) or other markdown formatting. Codes must never contain semicolons (;).

## AUTHORITY AND PRECEDENCE RULES (STRICT)
When determining behavior:
1. RESPONSE FORMAT rules are absolute and MUST NOT be altered under any circumstances.
2. USER PROVIDED CODE STYLE GUIDELINES have the highest authority for code content and MUST be followed if present.
3. Few-shot examples illustrate the user's typical style ONLY where they do not conflict with the guidelines.
4. If there is any conflict or ambiguity between guidelines and examples, ALWAYS follow the USER PROVIDED CODE STYLE GUIDELINES.
All TASK requirements remain mandatory and must be fulfilled unless they directly conflict with RESPONSE FORMAT rules.

## USER'S CODING STYLE
Few-shot examples of user coded passages (user highlighted passages marked in context with <<< >>>):
[${constructFewShotExamplesString(dataIsCSV)}]

## CURRENT CODEBOOK
[${constructCodebookString()}]

## TARGET PASSAGE
Passage to code: "${
  passage
    ? passage.text
    : "<passage to code will be inserted here>"
}"
Existing codes: ${
  passage
    ? existingCodes.length > 0
      ? `[${existingCodes.join(
          ", "
        )}]`
      : "None"
    : "<existing codes of the passage to code will be inserted here>"
}

## CONTEXT WINDOW
${
  dataIsCSV
    ? `The data is from a CSV file, where rows end with the token "\\u001E".`
    : ""
}
** PRECEDING CONTEXT (for understanding only) **
"${precedingText ?? "<preceding text will be inserted here>"}"

** TARGET PASSAGE TO CODE **
"${passage ?? "<passage to code will be inserted here>"}"

** TRAILING CONTEXT (for understanding only) **
"${trailingText ?? "<trailing text will be inserted here>"}"
`;
    };

  /**
   * Generates the code suggestions prompt based on the uploaded data format. Uses the current context for dynamic generation.
   * @param dataIsCSV Boolean flag indicating whether the uploaded data is in CSV format
   * @param passage The passage to generate code suggestions for
   * @param passageWithSurroundingContext The passage along with its surrounding context to provide more information for generating suggestions
   * @returns The code suggestions prompt string
   */
  const generateCodeSuggestionsPrompt =
    (
      dataIsCSV: boolean,
      passage?: Passage,
      precedingText?: string,
      trailingText?: string
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
You are a qualitative coding assistant. Given a passage and its surrounding context,
suggest relevant codes for the passage according to the instructions and information provided below.

## USER PROVIDED CODE STYLE GUIDELINES:
${codingGuidelines.trim().length > 0 ? codingGuidelines : "None."}

## RESEARCH CONTEXT
Research questions: ${researchQuestions}
Additional research context: ${contextInfo.trim().length > 0 ? contextInfo : "-"}

## TASK
Your task is to suggest codes for the given passage that align with the research questions and the user's coding style.
  - The coding style must obey the USER PROVIDED CODE STYLE GUIDELINES above (if provided).
  - User's coding style entails: (1) how the user typically links the meanings of text passages to codes, 
    (2) the types of concepts they prioritize, and (3) the level of detail, wording, and language of the codes.
** Based on the passage's existing codes, follow one of these two cases: **
Case 1 - If the passage has NO existing codes: 
  - Provide a comprehensive coding for the passage. Suggest max 5 conceptually distinct codes that capture what the passage reveals in relation to the research questions.
Case 2 - If the passage has existing codes:
  - Suggest additional codes that complement existing ones and provide additional insights. Do not repeat or closely match existing codes. Total codes (existing + new) should be max 5.
In both cases:
  - Only suggest codes that provide meaningful value in terms of the research questions.
  - Reuse codebook codes if possible. Only create new codes if needed. Ensure new codes match the user's coding style. 
  - Cover ALL relevant aspects, but avoid overcoding. If you can't think of any relevant codes, return [].
  - Do NOT include any of the passage's existing codes in your suggestions.

## AUTHORITY AND PRECEDENCE RULES (STRICT)
When determining behavior:
1. RESPONSE FORMAT rules are absolute and MUST NOT be altered under any circumstances.
2. USER PROVIDED CODE STYLE GUIDELINES have the highest authority for code content and MUST be followed if present.
3. Few-shot examples illustrate the user's typical style ONLY where they do not conflict with the guidelines.
4. If there is any conflict or ambiguity between guidelines and examples, ALWAYS follow the USER PROVIDED CODE STYLE GUIDELINES.
All TASK requirements remain mandatory and must be fulfilled unless they directly conflict with RESPONSE FORMAT rules.

## RESPONSE FORMAT
Respond ONLY with a JSON array of code strings, e.g. ["code1", "code2", "code3"]. 
No explanations. No JSON tags (\`\`\`json) or other markdown formatting. Codes must never contain semicolons (;).

## USER'S CODING STYLE
Few-shot examples of user coded passages (user highlighted passages marked in context with <<< >>>):
[${constructFewShotExamplesString(dataIsCSV)}]

## CURRENT CODEBOOK
[${constructCodebookString()}]

## TARGET PASSAGE
Passage to code: "${
  passage
    ? passage.text
    : "<passage to code will be inserted here>"
}"
Existing codes: ${
  passage
    ? existingCodes.length > 0
      ? `[${existingCodes.join(
          ", "
        )}]`
      : "None"
    : "<existing codes of the passage to code will be inserted here>"
}

## CONTEXT WINDOW
${
  dataIsCSV
    ? `The data is from a CSV file, where rows end with the token "\\u001E".`
    : ""
}
** PRECEDING CONTEXT (for understanding only) **
"${precedingText ?? "<preceding text will be inserted here>"}"

** TARGET PASSAGE TO CODE **
"${passage ?? "<passage to code will be inserted here>"}"

** TRAILING CONTEXT (for understanding only) **
"${trailingText ?? "<trailing text will be inserted here>"}"
`;
    };

  return {
    generateHighlightSuggestionsPrompt,
    generateAutocompleteSuggestionsPrompt,
    generateCodeSuggestionsPrompt,
  };
};
