import { Passage } from "../../../../context/WorkflowContext";

/**
 * Goes through passage text from the start and tries to find a suitable cut point within 200 characters.
 * @param p passage to cut
 * @returns a passage text cut at a suitable point
 */
const cutPassageFromEnd = (p: Passage) => {
  const maxRange = 200;

  // 1) Try to cut at a line break within maxRange
  let i = 0;
  while (i < maxRange && i < p.text.length) {
    const char = p.text[i];
    if (char === "\n") {
      return p.text.slice(0, i + 1);
    }
    i++;
  }

  // 2) If passage is shorter than maxRange, return entire text
  if (p.text.length <= maxRange) {
    return p.text;
  }

  // 3) Try to cut at a sentence end within maxRange from the start
  const indices = [".", "!", "?"]
    .map((punct) => p.text.indexOf(punct))
    .filter((idx) => idx !== -1 && idx <= maxRange);
  const endIdx = indices.length ? Math.min(...indices) : -1;
  if (endIdx !== -1) {
    return p.text.slice(0, endIdx + 1);
  } else {
    // 4) No good cut point found, cut at maxRange and include "..." to indicate truncation
    return p.text.slice(0, maxRange) + "...";
  }
};

/**
 * Goes through passage text from the end to start and tries to find a suitable cut point within 200 characters.
 * @param p passage to cut
 * @returns a passage text cut at a suitable point
 */
export const cutPassageFromStart = (p: Passage) => {
  const maxRange = 200;

  // 1) Try to cut at a line break within maxRange
  let i = 0;
  while (i > p.text.length - 1 - maxRange && i >= 0) {
    const char = p.text[i];
    if (char === "\n") {
      return p.text.slice(i + 1, p.text.length);
    }
    i--;
  }

  // 2) If passage is shorter than maxRange, return entire text
  if (p.text.length <= maxRange) {
    return p.text;
  }

  // 3) Try to cut at a sentence end within maxRange from the end
  const searchStart = Math.max(0, p.text.length - maxRange);
  const indices = [".", "!", "?"]
    .map((punct) => p.text.lastIndexOf(punct, p.text.length))
    .filter((idx) => idx !== -1 && idx >= searchStart);
  const endIdx = indices.length ? Math.max(...indices) : -1;
  if (endIdx !== -1) {
    return p.text.slice(endIdx + 1, p.text.length);
  } else {
    // 4) No good cut point found, cut at maxRange and include "..." to indicate truncation
    return "..." + p.text.slice(p.text.length - maxRange, p.text.length);
  }
};

/**
 * Gets the passage with surrounding context. Context is cut intelligently to avoid breaking sentences or lines.
 * Truncation appears within 200 characters at both the start and end of the context.
 * @param passage The passage object for which to get the surrounding context
 * @param passages All passages in the document
 * @param contextWindowSize Number of characters to include before and after the passage
 * @returns A text window that contains the passage and its surrounding context
 */
export const getPassageWithSurroundingContext = (
  passage: Passage,
  passages: Passage[],
  contextWindowSize: number = 500
): string => {
  const passageOrder = passage.order;
  let precedingText = "";
  let followingText = "";

  const contextSize = contextWindowSize ?? 500;

  // COLLECT PRECEDING PASSAGES //
  for (let i = passageOrder - 1; i >= 0; i--) {
    const p = passages.find((p) => p.order === i);
    if (!p) break;

    // Add entire p.text if within context limit
    if (precedingText.length + p.text.length <= contextSize / 2 - 30) {
      precedingText = p.text + precedingText;
      continue;
    }

    precedingText = cutPassageFromStart(p) + precedingText;
    break; // Stop after finding a cut point
  }

  // COLLECT FOLLOWING PASSAGES //
  for (let j = passageOrder + 1; j < passages.length; j++) {
    const p = passages.find((p) => p.order === j);
    if (!p) break;

    // Add text if within context limit
    if (followingText.length + p.text.length <= contextSize / 2 - 30) {
      followingText += p.text;
      continue;
    }

    followingText += cutPassageFromEnd(p);
    break; // Stop after finding a cut point
  }

  return `${precedingText}<<<${passage.text}>>>${followingText}`;
};


/**
 * Gets a ~1000 character context for highlight suggestions starting from a given passage. 
 * Intelligently cuts preceding and following passages.
 * @param startPassage The first passage from which the LLM will search for highlightsuggestions
 * @param passages current passages
 * @returns an object containing precedingText (for llm understanding) and mainText (the text to search for highlights)
 */
export const getContextForHighlightSuggestions = (
  startPassage: Passage,
  passages: Passage[],
): { precedingText: string; mainText: string } => {
  if (passages.length === 1) {
    return { precedingText: "", mainText: passages[0].text };
  }
  

  const passageOrder = startPassage.order;
  const precedingPassage = passages.find((p) => p.order === passageOrder - 1);
  const precedingText = precedingPassage
    ? cutPassageFromStart(precedingPassage)
    : "";
  const contextSize = 1000;
  let mainText = "";

  // COLLECT PASSAGES //
  for (let j = passageOrder; j < passages.length; j++) {
    const p = passages.find((p) => p.order === j);
    if (!p) break;

    // Add text if within context limit
    if (mainText.length + p.text.length <= contextSize) {
      mainText += p.text;
      continue;
    }

    mainText += cutPassageFromEnd(p);
    break; // Stop after finding a cut point
  }

  return {precedingText, mainText}
};
