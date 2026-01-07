import { Code, Passage } from "../../../../context/WorkflowContext";

const CUT_WINDOW_SIZE = 200; // Number of characters to look for a cut point

/**
 * A helper to get the n first words from a text.
 * @param text The text to extract words from
 * @param n The number of words to extract
 * @returns A string containing the first n words from the text
 */
const getFirstNWords = (text: string, n: number): string => {
  if (n <= 0) return "";

  const wordRegex = /\S+/g;
  let match;
  let count = 0;
  let endIndex = 0;

  while ((match = wordRegex.exec(text)) !== null) {
    count++;
    if (count === n) {
      endIndex = match.index + match[0].length;
      break;
    }
  }

  // If fewer than n words, return the whole text
  if (count < n) {
    return text;
  }
  return text.slice(0, endIndex);
};

/**
 * A helper for counting the number of words in a text.
 * @param text The text to count words in
 * @returns The number of words in the text
 */
const countWords = (text: string): number => {
  const matches = text.match(/\S+/g);
  return matches ? matches.length : 0;
};

/**
 * A helper for finding the index of the character right after the nth word. Returns text.length if fewer than n words.
 * @param text The text to search in
 * @param n The number of words to count
 * @returns The index where the nth word ends, or the length of the text if there are fewer than n words
 */
const findIndexAfterNthWord = (text: string, n: number): number => {
  if (n <= 0) return 0;

  const wordRegex = /\S+/g;
  let match;
  let count = 0;

  while ((match = wordRegex.exec(text)) !== null) {
    count++;
    if (count === n) {
      return match.index + match[0].length;
    }
  }

  return text.length;
};

/**
 * Returns a tail slice of text. First includes text up to minimumLength words, then looks for a suitable cut point within the preceding cutWindowSize characters.
 * @param text text to cut
 * @param minimumLength the number of words after which to start looking for a cut point
 * @param cutWindowSize the maximum number of characters to look for a cut point
 * @returns the text cut at a suitable point
 */
export const getStringTail = (
  text: string,
  minimumLength: number,
  cutWindowSize: number = CUT_WINDOW_SIZE
) => {
  // If text is already short enough, return it as is
  if (countWords(text) <= minimumLength) {
    return text;
  }

  // Reverse the text to allow using getFirstNWords directly for taking the last minimumLength words of the text
  const reversedText = [...text].reverse().join("");

  // Take the last minimumLength words
  let includedText = getFirstNWords(reversedText, minimumLength)
    .split("")
    .reverse()
    .join("");

  // Then, look for a suitable cut point in the preceding cutWindowSize characters BEFORE the minimumLength words
  const cutWindow = text.slice(
    Math.max(text.length - includedText.length - cutWindowSize, 0),
    text.length - includedText.length
  );

  // If cut window is shorter than cutWindowSize (start of data reached) ->  entire text fits in minimumLength + cutWindowSize
  if (cutWindow.length < cutWindowSize) {
    includedText = cutWindow + includedText;
    return includedText;
  }

  // Look for a line break to cut at
  const lineBreakIdx = cutWindow.lastIndexOf("\n");
  if (lineBreakIdx !== -1) {
    includedText = cutWindow.slice(lineBreakIdx + 1) + includedText;
    return includedText;
  }

  // Next, look for sentence ending punctuation
  const sentenceEndIdx = Math.max(
    cutWindow.lastIndexOf(". "),
    cutWindow.lastIndexOf("! "),
    cutWindow.lastIndexOf("? "),
    cutWindow.lastIndexOf("... ")
  );
  if (sentenceEndIdx !== -1) {
    includedText = cutWindow.slice(sentenceEndIdx + 1) + includedText;
    return includedText;
  }

  // If no suitable cut point found, simply cut after minimumLength has been included
  includedText = "..." + includedText; // Indicate truncation with "..."
  return includedText;
};

/**
 * Returns a head slice of text. First, includes text up to minimumLength words, then looks for a suitable cut point within the next cutSearchArea characters.
 * @param text the text to cut
 * @param minimumLength the number of words to include at minimum
 * @param cutSearchArea the number of characters after minimumLength to look for a suitable cut point
 * @returns the text cut at a suitable point
 */
export const getStringHead = (
  text: string,
  minimumLength: number,
  cutWindowSize: number = CUT_WINDOW_SIZE
) => {
  // If text is already short enough, return it as is
  if (countWords(text) <= minimumLength) {
    return text;
  }

  // First, take the first minimumLength words
  let includedText = getFirstNWords(text, minimumLength);

  // Then, look for a suitable cut point in the next cutSearchArea characters
  const cutWindowStartIdx = includedText.length;
  const cutWindow = text.slice(cutWindowStartIdx, cutWindowStartIdx + cutWindowSize);

  // If cut window is shorter than cutWindowSize (end of data reached) ->  entire text fits in minimumLength + cutWindowSize
  if (cutWindow.length < cutWindowSize) {
    includedText = includedText + cutWindow;
    return includedText;
  }

  // Look for a line break to cut at
  const lineBreakIdx = cutWindow.indexOf("\n");
  if (lineBreakIdx !== -1) {
    includedText = includedText + cutWindow.slice(0, lineBreakIdx + 1);
    return includedText;
  }

  // Look for sentence ending punctuation (pick earliest non-negative index)
  const candidates = [
    cutWindow.indexOf(". "),
    cutWindow.indexOf("! "),
    cutWindow.indexOf("? "),
    cutWindow.indexOf("... "),
  ].filter((i) => i !== -1);
  const sentenceEndIdx = candidates.length ? Math.min(...candidates) : -1;

  if (sentenceEndIdx !== -1) {
    includedText = includedText + cutWindow.slice(0, sentenceEndIdx + 1);
    return includedText;
  }

  // Fallback: If no suitable cut point found, simply cut directly after minimumLength has been included
  includedText = includedText + "..."; // Indicate truncation with "..."
  return includedText;
};

/**
 * Returns the preceding text that occurs before the parameter passage in the CSV row it belongs to.
 * @param passage The passage for which to get the preceding context
 * @param passages The current passages state
 * @param minSize Minimum number of words to include in the preceding context, after which to look for a cut point
 * @returns a string containing the preceding text from the same CSV row
 */
export const getPrecedingContextFromCsvRow = (
  passage: Passage,
  passages: Passage[],
  minSize: number
): string => {
  const precedingText = passages
    .filter((p) => p.order < passage.order)
    .map((p) => p.text)
    .join("");

  const lastIndexOfEOR = precedingText.lastIndexOf("\u001E");

  // If no end of row marker found, return preceding context normally
  if (lastIndexOfEOR === -1) {
    return getStringTail(precedingText, minSize, CUT_WINDOW_SIZE);
  }

  return precedingText.slice(lastIndexOfEOR + 1); // +1 to cut right after the "\u001E"
};

/**
 * Returns the trailing text that occurs after the parameter passage in the CSV row it belongs to.
 * @param passage The passage for which to get the trailing context
 * @param passages The current passages state
 * @param minSize Minimum number of words to include in the trailing context, after which to look for a cut point
 * @returns a string containing the trailing text from the same CSV row
 */
export const getTrailingContextFromCsvRow = (
  passage: Passage,
  passages: Passage[],
  minSize: number
): string => {
  const followingText = passages
    .filter((p) => p.order > passage.order)
    .map((p) => p.text)
    .join("");

  const firstIndexOfEOR = followingText.indexOf("\u001E");

  // If no end of row marker found, return trailing context normally
  if (firstIndexOfEOR === -1) {
    return getStringHead(followingText, minSize, CUT_WINDOW_SIZE);
  }

  return followingText.slice(0, firstIndexOfEOR); // up to (not including) the "\u001E"
};

// PUBLIC API

/**
 * Returns the passage with surrounding context. For CSV files, returns the entire row that the passage belongs to.
 * For text files, context is cut intelligently to avoid breaking sentences or lines.
 * Truncation appears within 200 characters at both the start and end of the contextWindow.
 * @param passage The passage object for which to get the surrounding context
 * @param passages All passages in the document
 * @param minContextWindowSize Minimum number of additional characters to include in the context window in addition to the passage text.
 * Gets divided to before and after the passage text. If context window is 0, the function cuts at the suitable cut point occurring after contextWindow.
 * @param markPassageInResult Whether to mark the passage text in the result with <<< >>> (default: true)
 * @returns A text window that contains the passage and its surrounding context
 */
export const getPassageWithSurroundingContext = (
  passage: Passage,
  passages: Passage[],
  minPrecedingContext: number,
  minTrailingContext: number,
  dataIsCSV: boolean
): { precedingContext: string; passageText: string; trailingContext: string } => {
  const passageOrder = passage.order;

  // Obtain preceding context based on whether passages are from CSV or not
  let precedingContext = "";
  let trailingContext = "";
  if (dataIsCSV) {
    // If passages are from CSV, only inlude preceding context from the same row, if any
    precedingContext = getPrecedingContextFromCsvRow(passage, passages, minPrecedingContext);
    // If passage already contains end of row marker, no trailing context to add
    if (!passage.text.trim().endsWith("\u001E")) {
      trailingContext = getTrailingContextFromCsvRow(passage, passages, minTrailingContext);
    }
  } else {
    const precedingText = passages
      .filter((p) => p.order < passageOrder)
      .map((p) => p.text)
      .join("");
    precedingContext = getStringTail(precedingText, minPrecedingContext, CUT_WINDOW_SIZE);
    const trailingText = passages
      .filter((p) => p.order > passageOrder)
      .map((p) => p.text)
      .join("");
    trailingContext = getStringHead(trailingText, minTrailingContext, CUT_WINDOW_SIZE);
  }

  return { precedingContext, passageText: passage.text, trailingContext };
};

/**
 * Gets the context for highlight suggestions starting from a specific index inside a specific passage.
 * @param startPassage The first passage from which the LLM will search for highlightsuggestions
 * @param passages current passages
 * @param searchStartIndex The index in the startPassage text from which to start searching for highlights
 * @param minContextWindowSize The minimum number of words to include in the search area
 * @returns an object containing precedingText (for llm understanding, may contain text from preceding passage),
 * and mainText (the text to search for highlights, is from startPassage in its entirety)
 */
export const getContextForHighlightSuggestions = (
  startPassage: Passage,
  passages: Passage[],
  searchStartIndex: number,
  minContextWindowWords: number,
  dataIsCSV: boolean
): { precedingText: string; searchArea: string } => {
  // Define the min length of the preceding text to be equal to 20% of minContextWindowWords
  // However, this is not reduced from the search area, just a cap on preceding text length.
  const minPrecedingWords = Math.floor(minContextWindowWords * 0.2);

  // EDGE CASE: If there's only one passage, return its text split at searchStartIndex, with minContextWindowWords words after the start index
  if (passages.length === 1) {
    const searchArea = getStringHead(
      passages[0].text.slice(searchStartIndex),
      minContextWindowWords,
      CUT_WINDOW_SIZE
    );
    const precedingText = getStringTail(
      passages[0].text.slice(0, searchStartIndex),
      minPrecedingWords,
      CUT_WINDOW_SIZE
    );
    return {
      precedingText: precedingText,
      searchArea: searchArea,
    };
  }

  const passageOrder = startPassage.order;

  // Construct uncut preceding text
  let precedingText =
    passages
      .filter((p) => p.order < passageOrder)
      .map((p) => p.text)
      .join("") + startPassage.text.slice(0, searchStartIndex);

  // Construct uncut search area text, stopping before the first highlighted passage after startPassage
  const followingPassages = passages.filter((p) => p.order > passageOrder);
  const firstHighlightedIdx = followingPassages.findIndex((p) => p.isHighlighted);
  const tailPassages =
    firstHighlightedIdx === -1
      ? followingPassages
      : followingPassages.slice(0, firstHighlightedIdx);

  let searchArea =
    startPassage.text.slice(searchStartIndex) + tailPassages.map((p) => p.text).join("");

  // If passages are from CSV, limit preceding text to same row only, and return
  if (dataIsCSV) {
    precedingText =
      getPrecedingContextFromCsvRow(startPassage, passages, minPrecedingWords) +
      startPassage.text.slice(0, searchStartIndex);
    return {
      precedingText: precedingText,
      searchArea: getStringHead(
        searchArea,
        minContextWindowWords,
        CUT_WINDOW_SIZE
      ),
    };
  }

  // If preceding text is already short enough, only cut search area
  if (countWords(precedingText) <= minPrecedingWords) {
    return {
      precedingText: precedingText,
      searchArea: getStringHead(searchArea, minContextWindowWords, CUT_WINDOW_SIZE),
    };
  }

  // Cut preceding text to suitable length
  precedingText = getStringTail(precedingText, minPrecedingWords, CUT_WINDOW_SIZE);
  // Cut search area to suitable length
  searchArea = getStringHead(searchArea, minContextWindowWords, CUT_WINDOW_SIZE);

  return { precedingText, searchArea };
};
