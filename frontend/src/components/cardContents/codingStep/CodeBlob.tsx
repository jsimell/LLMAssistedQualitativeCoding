import { useState, useContext, useEffect, useRef } from "react";
import {
  Code,
  CodeId,
  Passage,
  PassageId,
  WorkflowContext,
} from "../../../context/WorkflowContext";
import { XMarkIcon } from "@heroicons/react/24/solid";

interface CodeBlobProps {
  codeId: CodeId;
  parentPassage: Passage;
  codeSuggestions: string[];
  autocompleteSuggestion: string | null;
  activeCodeId: CodeId | null;
  setActiveCodeId: React.Dispatch<React.SetStateAction<CodeId | null>>;
  setPendingHighlightFetches: React.Dispatch<React.SetStateAction<Array<PassageId>>>;
  preventCodeBlobDeactivationRef: React.RefObject<boolean>;
  isLastCodeOfPassage: boolean;
  codeManager: {
    updateCode: (cid: CodeId, newCodeValue: string) => PassageId | null;
    deleteCode: (id: CodeId) => PassageId | null;
    editAllInstancesOfCode: (oldValue: string, newValue: string) => void;
  };
  suggestionsManager: {
    updateAutocompleteSuggestionForPassage: (
      id: `passage-${number}`,
      existingCodes: string[],
      currentUserInput: string
    ) => Promise<void>;
    updateCodeSuggestionsForPassage: (id: `passage-${number}`) => Promise<void>;
  };
}

const CodeBlob = ({
  codeId,
  parentPassage,
  codeSuggestions,
  autocompleteSuggestion,
  activeCodeId,
  setActiveCodeId,
  setPendingHighlightFetches,
  preventCodeBlobDeactivationRef,
  isLastCodeOfPassage,
  codeManager,
  suggestionsManager,
}: CodeBlobProps) => {
  // Extract functions from the custom hooks passed via props
  const { updateAutocompleteSuggestionForPassage, updateCodeSuggestionsForPassage } =
    suggestionsManager;
  const { deleteCode, updateCode } = codeManager;

  // CONTEXT
  const context = useContext(WorkflowContext)!; // Non-null assertion since parent already ensures WorkflowContext is provided
  const { codes, codebook, passages, setPassages, aiSuggestionsEnabled } = context;

  // STATE
  const [ghostText, setGhostText] = useState<string>("Type code...");
  const codeObject = codes.find((c) => c.id === codeId);
  if (!codeObject) return null;
  const [inputValue, setInputValue] = useState(codeObject.code);

  // REFS
  const changeIndexRef = useRef<number>(inputValue.length); // Track index where last change occurred inside contentEditable
  const inputRef = useRef<HTMLSpanElement | null>(null);

  // EFFECTS
  // Active code blob should have focus
  useEffect(() => {
    if (activeCodeId === codeId && inputRef.current !== document.activeElement) {
      inputRef.current?.focus();
    }
  }, [activeCodeId]);

  // Fetch new code suggestions and autocomplete suggestions for the parent passage when code blob is activated.
  // EXCEPTION: skip code suggestions fetch on first render, if the code blob was created through a highlight suggestion,
  // because in that case the initial code suggestions are already provided.
  useEffect(() => {
    if (!aiSuggestionsEnabled) return;
    if (!activeCodeId) return;
    if (activeCodeId === codeId) {
      // Only fetch suggestions if AI suggestions are enabled
      if (aiSuggestionsEnabled) {
        // Update suggestions for the parent passage
        const fetchSuggestions = async () => {
          // If the passage has only one empty code, but has code suggestions, the passage was created through a highlight suggestion
          // => in this case, skip the initial code suggestions fetch
          const codesOfPassage = codes
            .filter((c) => c.passageId === parentPassage.id)
            .map((c) => c.code);
          if (
            parentPassage.codeIds.length === 1 &&
            codesOfPassage[0] === "" &&
            parentPassage.codeSuggestions.length > 0
          ) {
            return;
          } else {
            // On subsequent renders, fetch both code suggestions and autocomplete suggestions
            await updateCodeSuggestionsForPassage(parentPassage.id);
          }
        };

        fetchSuggestions();
      }
    }
  }, [activeCodeId]);

  // Sync inputValue with global codes state when codes change (e.g., due to editAllInstancesOfCode)
  useEffect(() => {
    const updatedCodeObject = codes.find((c) => c.id === codeId);
    if (updatedCodeObject) {
      setInputValue(updatedCodeObject.code);
    }
  }, [codes]);

  // Update ghost text based on input value and suggestions
  useEffect(() => {
    // If AI suggestions are disabled and input is empty, show default ghost text
    if (!aiSuggestionsEnabled && inputValue.length === 0) {
      setGhostText("Type code...");
      return;
    }

    const afterLastSemicolonTrimmed = getAfterLastSemicolon(inputValue).trim();

    if (afterLastSemicolonTrimmed === "") {
      // Nothing typed after last semicolon, or nothing typed at all
      // Find the first suggestion that hasn't been typed yet and isn't already an existing code of the passage
      const inputValueLower = inputValue.toLowerCase();
      const existingCodesSet = new Set(
        codes
          .filter((c) => c.passageId === parentPassage.id)
          .map((c) => c.code.toLowerCase())
      );

      const suggestion = codeSuggestions.find((s) => {
        const suggestionLower = s.toLowerCase();
        const isNotInputted = !inputValueLower.includes(suggestionLower);
        const isNotAnExistingCode = !existingCodesSet.has(suggestionLower);
        return isNotInputted && isNotAnExistingCode;
      });
      if (suggestion && aiSuggestionsEnabled) {
        setGhostText(suggestion);
      } else {
        inputValue === "" ? setGhostText("Type code...") : setGhostText("");
      }
    } else {
      // There is some text after the last semicolon, or the user has typed part of the first code
      // First try to match with existing codebook codes
      let matchingSuggestion = Array.from(codebook).find(
        (code) =>
          code.startsWith(afterLastSemicolonTrimmed) &&
          !inputValue.trim().includes(code.trim())
      );
      // If aiSuggestions are enabled, replace a possible codebook match with codeSuggestions or autocompleteSuggestion match if there is one
      if (aiSuggestionsEnabled) {
        // Replace matchingSuggestion if a match is found in codeSuggestions or autocompleteSuggestion
        // Autocomplete suggestion has priority over codeSuggestions => place it first
        const suggestionsArray = Array.from(
          new Set([
            ...(autocompleteSuggestion && autocompleteSuggestion.trim().length > 0 ? [autocompleteSuggestion] : []),
            ...codeSuggestions
          ])
        );
        const suggestionMatch = suggestionsArray.find(
          (suggestion) =>
            suggestion.toLowerCase().startsWith(afterLastSemicolonTrimmed.toLowerCase()) &&
            !inputValue.toLowerCase().includes(suggestion.toLowerCase().trim())
        );
        if (suggestionMatch) {
          matchingSuggestion = suggestionMatch;
        }
      }

      // Set ghost text based on the matching suggestion
      const inputLastCharIsSpace = inputValue.slice(-1) === " ";
      setGhostText(
        inputLastCharIsSpace
          ? matchingSuggestion?.slice(afterLastSemicolonTrimmed.length).trim() || ""
          : matchingSuggestion?.slice(afterLastSemicolonTrimmed.length) || ""
      );
    }
  }, [
    activeCodeId,
    inputValue,
    codeSuggestions,
    autocompleteSuggestion,
    aiSuggestionsEnabled,
  ]);

  // Fetch a new autocomplete suggestion after user stops typing for 1.5s
  useEffect(() => {
    if (!aiSuggestionsEnabled) return;
    if (activeCodeId !== codeId) return;

    const afterLastSemicolon = getAfterLastSemicolon(inputValue);
    // If nothing typed after last semicolon, there is nothing to complete, so do not fetch autocomplete suggestion
    if (afterLastSemicolon.trim().length === 0) return;
    // If the current content of the input field matches an existing code exactly, this means user has reactivated
    // a previously entered code and has not typed anything new yet -> do not fetch autocomplete suggestion
    if (
      codes.some((c) => c.passageId === parentPassage.id && c.code === inputValue.trim())
    ) {
      return;
    }
    // If there is already a visible ghost text, meaning that there is a
    // code suggestion or codebook match, or input is empty with "Type code..." shown,
    // do NOT fetch autocompleteSuggestion.
    if (ghostText) return;

    // Codes that are not in this code blob, but are assigned to the parent passage
    const enteredCodes = codes
      .filter((c) => c.passageId === parentPassage.id && c.id !== codeId)
      .map((c) => c.code);
    // Codes before the last semicolon
    const semicolonIndex = inputValue.lastIndexOf(";");
    const precedingCodes =
      semicolonIndex === -1
        ? []
        : inputValue
            .slice(0, semicolonIndex)
            .split(";")
            .map((c) => c.trim())
            .filter((c) => c.length > 0);
    // Combine and deduplicate
    const existingCodes = Array.from(new Set([...enteredCodes, ...precedingCodes]));

    // Code being typed (after last semicolon)
    const currentUserInput = afterLastSemicolon.trim();

    const timeoutId = window.setTimeout(() => {
      updateAutocompleteSuggestionForPassage(
        parentPassage.id,
        existingCodes,
        currentUserInput
      );
    }, 1500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [inputValue, activeCodeId, codeId, codes, aiSuggestionsEnabled, parentPassage.id]);

  // Ensure correct cursor position after input value changes
  useEffect(() => {
    const changeIndex = changeIndexRef.current;
    if (activeCodeId === codeId && inputRef.current) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.setStart(inputRef.current?.childNodes[0] || inputRef.current, changeIndex);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [inputValue]);

  // Ensure code input is defocused when activeCodeId changes to another code or null
  useEffect(() => {
    if (activeCodeId !== codeId) {
      inputRef.current?.blur();
    }
  }, [activeCodeId, codeId]);

  /**
   * A helper function to get the substring after the last semicolon in a string,
   * or the entire string if no semicolon is present. Not trimmed.
   * @param value the string to extract from
   * @returns the substring after the last semicolon, trimmed of whitespace
   */
  const getAfterLastSemicolon = (value: string) =>
    value.slice(value.lastIndexOf(";") + 1);

  /**
   * Handles input changes in the contentEditable element.
   * @param e - the input event that triggered the function call
   */
  const handleInputChange = (e: React.FormEvent<HTMLSpanElement>) => {
    const selection = window.getSelection();
    const range = selection?.getRangeAt(0);

    if (range) {
      // Get cursor position relative to the contentEditable element
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(e.currentTarget);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      changeIndexRef.current = preCaretRange.toString().length;

      // Update input value state
      setInputValue(e.currentTarget.textContent || "");
    }
  };

  /**
   * Handles a keyboard event that occurs during code editing.
   * @param e - the keyboard event that triggered the function call
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (activeCodeId === null) return;
    if (!e.currentTarget) return;

    // ENTER: finalize editing of the current code
    if (e.key === "Enter") {
      e.preventDefault();
      preventCodeBlobDeactivationRef.current = false;
      inputRef.current?.blur(); // Blur to trigger handleCodeEnter
      return;
    }

    // TAB: accept code suggestion (if any)
    if (e.key === "Tab") {
      e.preventDefault();
      if (ghostText && ghostText !== "Type code...") {
        setInputValue(inputValue + ghostText + "; ");
        setGhostText(""); // Clear ghost text after accepting
        setTimeout(moveInputCursorToEnd, 0); // Move cursor to end after DOM update
        return;
      }
    }

    // ESCAPE: decline ghost text suggestion (if any) and keep editing, OR finalize editing if no suggestion
    if (e.key === "Escape") {
      if (ghostText && ghostText !== "Type code...") {
        e.preventDefault();
        const suggestion = (getAfterLastSemicolon(inputValue) + ghostText).trim();
        // Remove the suggested text from the passage's code suggestions, if it exists there, and clear autocomplete suggestion
        const passage = passages.find((p) => p.id === parentPassage.id);
        if (!passage) return;
        setPassages((prevPassages) =>
          prevPassages.map((p) => {
            if (p.id === passage.id && p.isHighlighted) {
              return {
                ...p,
                codeSuggestions: p.codeSuggestions.filter((s) => s !== suggestion),
                autocompleteSuggestion: "",
              };
            }
            return p;
          })
        );
        setGhostText(""); // Clear ghost text
        return;
      } else {
        e.preventDefault();
        inputRef.current?.blur(); // Blur to trigger handleCodeEnter
        return;
      }
    }

    // DELETE: delete the current code
    if (e.key === "Delete") {
      e.preventDefault();
      handleDeletion();
      return;
    }
  };

  /** Handles the deletion of a code, which may trigger highlight suggestion fetches.
   *
   * @param codeId - the ID of the code to be deleted
   */
  const handleDeletion = () => {
    const queueForSuggestionFetch =
      (passages.find((p) => p.id === parentPassage.id)?.codeIds.length ?? 0) <= 1;
    const affectedPassageId = deleteCode(codeId);
    if (affectedPassageId && queueForSuggestionFetch) {
      setPendingHighlightFetches((prev) => [...prev, affectedPassageId]);
    }
  };

  /** Updates the code into the global state. */
  const handleCodeEnter = async () => {
    if (activeCodeId === null) return; // For safety: should not happen
    if (preventCodeBlobDeactivationRef.current) {
      // If code enter was caused by user clicking something that should not deactivate the code blob,
      // refocus the code blob instead of updating the code, and move cursor to end.
      inputRef.current?.focus();
      moveInputCursorToEnd();
      return;
    }
    preventCodeBlobDeactivationRef.current = false;

    const codeObject: Code | undefined = codes.find((c) => c.id === activeCodeId);
    if (!codeObject) return;

    const cleanedInputValue = inputValue.trim().replace(/;+$/, ""); // Remove trailing semicolons

    if (cleanedInputValue === "") {
      // If user entered an empty code, delete it
      handleDeletion();
      return;
    }

    setInputValue(cleanedInputValue);

    // Only update codes if the value actually changed
    if (cleanedInputValue !== codeObject.code) {
      const affectedPassageId = updateCode(activeCodeId, cleanedInputValue);
      setTimeout(() => {
        if (affectedPassageId) {
          setPendingHighlightFetches((prev) => [...prev, affectedPassageId]);
        }
      }, 0);
    }

    setActiveCodeId(null); // Set activeCodeId to null at the end

    return;
  };

  /**
   * Moves the input cursor to the end of the contentEditable element
   */
  const moveInputCursorToEnd = () => {
    if (!inputRef.current) return;
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(inputRef.current);
    range.collapse(false); // false = collapse to end
    selection?.removeAllRanges();
    selection?.addRange(range);
    changeIndexRef.current = inputValue.length; // Update the change index ref
  };

  return (
    <>
      <span
        className={`
          inline-flex items-center self-center w-fit pl-2 pr-1.5 mr-1 my-0.5
        bg-tertiaryContainer border-1 border-gray-400 rounded-full hover:bg-tertiaryContainerHover 
          ${
            activeCodeId === codeId
              ? "bg-tertiaryContainerHover outline-1 border border-onBackground outline-onBackground shadow-[0_0_0_2px_black]"
              : ""
          } 
        `}
        onClick={() => setActiveCodeId(codeId)}
      >
        <div className="inline whitespace-pre-wrap">
          <span
            ref={inputRef}
            contentEditable={true}
            suppressContentEditableWarning={true}
            onInput={handleInputChange}
            onFocus={() => setActiveCodeId(codeId)}
            onBlur={handleCodeEnter} // blurring is essentially same as pressing enter
            onKeyDown={(e) => handleKeyDown(e)}
            className="bg-transparent outline-none whitespace-pre-wrap empty:before:content-['\200B']"
          >
            {inputValue}
          </span>
          {activeCodeId === codeId && (
            <span
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent blur event on contentEditable element
              }}
              onClick={() => {
                // Focus the contentEditable element when ghost text is clicked
                inputRef.current?.focus();
                moveInputCursorToEnd();
              }}
              className="text-gray-500"
            >
              {ghostText}
            </span>
          )}
        </div>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault(); // Prevent input from losing focus
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleDeletion();
          }}
          className={`bg-transparent ml-1.5 rounded-full hover:text-gray-800 hover:bg-onBackground/10 cursor-pointer
            ${activeCodeId === codeId ? "text-gray-700" : "text-gray-600"}`}
        >
          <XMarkIcon className="size-5" />
        </button>
      </span>
      {
        isLastCodeOfPassage && parentPassage.text.endsWith("\n") && (
          <br />
        ) /* Preserve trailing newlines after code blobs */
      }
    </>
  );
};

export default CodeBlob;
