import { useState, useContext, useEffect, useRef } from "react";
import { Code, Passage, WorkflowContext } from "../../../context/WorkflowContext";
import { useCodeManager } from "./hooks/useCodeManager";
import { XMarkIcon } from "@heroicons/react/24/solid";

interface CodeBlobProps {
  codeId: number;
  parentPassage: Passage;
  hasTrailingBreak: boolean;
  activeCodeId: number | null;
  setActiveCodeId: React.Dispatch<React.SetStateAction<number | null>>;
  activeCodeRef: React.RefObject<HTMLInputElement | null>;
}

const CodeBlob = ({
  codeId,
  parentPassage,
  hasTrailingBreak,
  activeCodeId,
  setActiveCodeId,
  activeCodeRef,
}: CodeBlobProps) => {
  const context = useContext(WorkflowContext)!; // Non-null assertion since parent already ensures WorkflowContext is provided
  const { codes, codebook } = context;

  const [currentPlaceholder, setCurrentPlaceholder] = useState<string>("Type code...");

  const codeObject = codes.find((c) => c.id === codeId);
  if (!codeObject) return null;
  const [inputValue, setInputValue] = useState(codeObject.code);

  const { deleteCode, updateCode } = useCodeManager({
    activeCodeId,
    setActiveCodeId,
  });

  // Sync inputValue with global codes state when codes change (e.g., due to editAllInstancesOfCode)
  useEffect(() => {
    const updatedCodeObject = codes.find((c) => c.id === codeId);
    if (updatedCodeObject) {
      setInputValue(updatedCodeObject.code);
    }
  }, [codes, codeId]);

  // Update the placeholder when the parent passage's AI suggestions change
  useEffect(() => {
    if (parentPassage.aiSuggestions.length > 0) {
      setCurrentPlaceholder(parentPassage.aiSuggestions[0].suggestedCodes);
    } else {
      setCurrentPlaceholder("Type code...");
    }
  }, [parentPassage.aiSuggestions]);

  // Ensure that code blob input widths adjust to their content when component mounts and when codebook gets updated
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!inputRef.current) return;
    const inputEl = inputRef.current;
    if (inputEl.value === "") {
      const placeholderText = inputEl.getAttribute("placeholder") || "";
      inputEl.style.width = `${placeholderText.length - 2}ch`;
    } else {
      inputEl.style.width = "1px";
      inputEl.style.width = `${inputEl.scrollWidth + 4}px`;
    }
  }, [codebook]);

  /**
   * Adjusts the width of a code input to fit its current text.
   *
   * @param e - change event from the code input (`HTMLInputElement`).
   */
  const handleCodeBlobSizing = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target;
    target.style.width = "1px";
    target.style.width = `${target.scrollWidth + 4}px`;
  };

    /**
   * Handles a keyboard event that occurs during code editing.
   * @param e - the keyboard event that triggered the function call
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (activeCodeId === null) return;
    if (!e.currentTarget) return;

    // A helper function to finalize editing of the current code
    const finalizeEditing = () => {
      const codeObject: Code | undefined = codes.find(
        (c) => c.id === activeCodeId
      );
      if (!codeObject) return;
      // Blur the input, which triggers onBlur, which calls updateCode, and deactivates the code
      e.currentTarget.blur();
      return;
    }

    // ENTER: finalize editing of the current code
    if (e.key === "Enter") {
      e.preventDefault();
      finalizeEditing();
      return;
    }

    // TAB: accept code suggestion (if any) or finalize editing, if no suggestion
    if (e.key === "Tab") {
      e.preventDefault();
      if (currentPlaceholder && currentPlaceholder !== "Type code...") {
        // Accept the suggestion into the input (not yet finalized)
        setInputValue(currentPlaceholder);
        return;
      } else {
        // No suggestion -> finalize editing
        finalizeEditing();
        return;
      }
    }

    // ESCAPE: decline AI suggestion (if any) and keep editing, OR finalize editing if no suggestion
    if (e.key === "Escape") {
      e.preventDefault();
      if (currentPlaceholder && currentPlaceholder !== "Type code...") {
        // Decline the suggestion by clearing the placeholder
        setCurrentPlaceholder("Type code...");
        return;
      } else {
        // No suggestion -> finalize editing
        finalizeEditing();
        return;
      }
    }

    // DELETE: delete the current code
    if (e.key === "Delete") {
      e.preventDefault();
      deleteCode(activeCodeId);
    }
  };

  return (
    <span
      className={`inline-flex items-center w-fit px-2 mr-1
      bg-tertiaryContainer border-1 my-1 border-gray-400 rounded-full hover:bg-tertiaryContainerHover 
      ${
        activeCodeId === codeId
          ? "bg-tertiaryContainerHover outline-1 outline-onBackground shadow-[0_0_0_2px_black]"
          : ""
      } 
      focus:outline-none focus:ring-1 focus:ring-onBackground`}
    >
      <input
        value={inputValue}
        size={codeObject.code ? Math.max(codeObject.code.length + 1, 8) : 8}
        placeholder={parentPassage.aiSuggestions[0]?.suggestedCodes || "Type code..."}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          setInputValue(e.currentTarget.value);
          handleCodeBlobSizing(e);
        }}
        onFocus={() => setActiveCodeId(codeId)}
        onBlur={(e) => {
          // Basically same as pressing Enter: finalize editing
          updateCode(codeId, e.currentTarget.value);
          // updateCode takes care of deactivating the code -> no need for setActiveCodeId(null) here
        }}
        onKeyDown={(e) => handleKeyDown(e)}
        ref={(el) => {
          inputRef.current = el; // By default, assign to inputRef
          if (activeCodeId === codeId) {
            // If the code blob is active, assign to activeCodeRef. This ensures that the input gets focused when it is first created
            activeCodeRef.current = el;
          }
        }}
        className="bg-transparent border-none outline-none"
      />
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault(); // Prevent input from losing focus
        }}
        onClick={() => deleteCode(codeId)}
        className={`bg-transparent rounded-full hover:text-gray-800 hover:bg-onBackground/10 cursor-pointer
          ${activeCodeId === codeId ? "text-gray-700" : "text-gray-500"}`}
      >
        <XMarkIcon className="size-5" />
      </button>
      {hasTrailingBreak && <br />}
    </span>
  );
};

export default CodeBlob;
