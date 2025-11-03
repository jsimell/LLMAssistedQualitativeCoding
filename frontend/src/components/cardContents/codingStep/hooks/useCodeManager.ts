import { useContext } from "react";
import { Code, WorkflowContext } from "../../../../context/WorkflowContext";
import { useAIsuggestionManager } from "./useAIsuggestionManager";

interface UseCodeManagerProps {
  activeCodeId: number | null;
  setActiveCodeId: React.Dispatch<React.SetStateAction<number | null>>;
}

/**
 * Custom hook to manage data coding-related operations on existing codes, such as updating, deleting codes,
 * and handling keyboard events during code editing. Code creation is handled elsewhere.
 *
 * @param activeCodeId - The ID of the currently active code being edited.
 * @param setActiveCodeId - Function to update the active code ID.
 * @returns An object containing functions to update, delete codes, and handle keydown events.
 */
export const useCodeManager = ({
  activeCodeId,
  setActiveCodeId,
}: UseCodeManagerProps) => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error("useCodeManager must be used within a WorkflowProvider");
  }

  const { codes, setCodes, passages, setPassages, nextCodeId, setNextCodeId } =
    context;

  const { updateSuggestionsForPassage } = useAIsuggestionManager();

  /**
   * Updates the value of a specific code.
   * @param id - the id of the code to be updated
   * @param newValue - the new value of the code
   */
  const updateCode = (id: number, newValue: string) => {
    const codeList = separateMultipleCodes(newValue.trim());
    let newCodeId = nextCodeId;

    // Edge case: if user cleared the code completely (i.e. entered on an empty codeBlob), delete it instead
    if (codeList.length === 0) {
      deleteCode(id);
      return;
    }

    const codeObject = codes.find((c) => c.id === id);
    if (!codeObject) return;
    const passageId = codeObject.passageId;

    // Collect new code IDs that will be created (only for codes beyond the first)
    const newCodeIds: number[] = [];
    for (let i = 1; i < codeList.length; i++) {
      newCodeIds.push(newCodeId++);
    }

    // Update the codes state
    setCodes((prev) => {
      const newCodes = prev.map((c) =>
        c.id === id ? { ...c, code: codeList[0] } : c
      );
      
      if (codeList.length > 1) {
        const additionalCodes = codeList.slice(1).map((code, index) => ({
          id: newCodeIds[index], // Use pre-allocated IDs
          passageId: passageId,
          code: code,
        }));
        return [...newCodes, ...additionalCodes];
      }
      return newCodes;
    });

    // Update passages to reflect new codeIds
    setPassages((prev) =>
      prev.map((p) => {
        return p.id === passageId
          ? {
              ...p,
              codeIds: [...p.codeIds, ...newCodeIds],
            }
          : p;
      })
    );

    // Update nextCodeId
    setNextCodeId(newCodeId);

    // Update the suggestions of the affected passage
    updateSuggestionsForPassage(passageId);

    // No code should be active after update -> set activeCodeId to null
    setActiveCodeId(null);
    return;
  };

  /**
   * Deletes a code.
   * @param id - the id of the code to be deleted
   */
  const deleteCode = (id: number) => {
    let shouldUpdateSuggestions = false;
    let passageIdToUpdate: number | null = null;

    setPassages((prev) => {
      // 1. Find affected passage
      const affectedPassage = prev.find((p) => p.codeIds.includes(id));
      if (!affectedPassage) return prev;

      // 2. Remove code from passage's codeIds
      const updatedPassage = {
        ...affectedPassage,
        codeIds: affectedPassage.codeIds.filter((cid) => cid !== id),
      };

      // 3. Check if passage still has codes
      if (updatedPassage.codeIds.length > 0) {
        // Still has codes - just update this passage
        shouldUpdateSuggestions = true;
        passageIdToUpdate = updatedPassage.id;
        return prev.map((p) =>
          p.id === updatedPassage.id ? updatedPassage : p
        );
      }

      // 4. Otherwise: passage has no codes left and it may have to be merged with neighboring passages.
      // Find the neighbors of the passage based on order, to check whether they are empty and can be merged
      const prevPassage = prev.find(
        (p) => p.order === updatedPassage.order - 1
      );
      const nextPassage = prev.find(
        (p) => p.order === updatedPassage.order + 1
      );
      const mergePrev = prevPassage && prevPassage.codeIds.length === 0;
      const mergeNext = nextPassage && nextPassage.codeIds.length === 0;

      // Determine merged text and which passages to remove from the passages state
      let mergedText = updatedPassage.text;
      let passagesToRemove = [updatedPassage.id];
      if (mergePrev) {
        mergedText = prevPassage.text + mergedText;
        passagesToRemove.push(prevPassage.id);
      }
      if (mergeNext) {
        mergedText = mergedText + nextPassage.text;
        passagesToRemove.push(nextPassage.id);
      }

      // Create a new merged passage (empty codeIds)
      const newMergedPassage = {
        id: updatedPassage.id, // reuse the current one’s id
        order: mergePrev ? prevPassage.order : updatedPassage.order,
        text: mergedText,
        codeIds: [],
        aiSuggestions: [], // new AI suggestions are fetched after merging
      };

      // Insert the new merged passage and remove the old ones
      const filtered = prev.filter((p) => !passagesToRemove.includes(p.id));
      const inserted = [...filtered, newMergedPassage];
      const sorted = inserted.sort((a, b) => a.order - b.order);
      return sorted.map((p, i) => ({ ...p, order: i }));
    });

    // 5. Fire-and-forget AI suggestions update AFTER setPassages completes
    if (shouldUpdateSuggestions && passageIdToUpdate !== null) {
      updateSuggestionsForPassage(passageIdToUpdate);
    }

    // 6. Remove code from codes array
    setCodes((prev) => prev.filter((c) => c.id !== id));

    // 7. No code should be active after deletion -> set activeCodeId to null
    setActiveCodeId(null);
  };

  /**
   * Handles a keyboard event that occurs during code editing.
   * @param e - the keyboard event that triggered the function call
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (activeCodeId === null) return;
    if (!e.currentTarget) return;

    // ENTER, TAB, ESCAPE: finalize editing of the current code
    if (["Enter", "Tab", "Escape"].includes(e.key)) {
      e.preventDefault(); // Prevents default behaviour of the tab button

      // Get the code object being edited
      const codeObject: Code | undefined = codes.find(
        (c) => c.id === activeCodeId
      );
      if (!codeObject) return;

      // Blur the input, which triggers onBlur, which calls updateCode, and deactivates the code
      e.currentTarget.blur();

      return;
    }

    // DELETE: delete the current code
    if (e.key === "Delete") {
      e.preventDefault();
      deleteCode(activeCodeId);
    }
  };

  const editAllInstancesOfCode = (oldValue: string, newValue: string) => {
    const idsToEdit = codes.filter((c) => c.code === oldValue).map((c) => c.id);
    const newArray = codes.map((code) =>
      idsToEdit.includes(code.id) ? { ...code, code: newValue } : code
    );
    setCodes(newArray);
  };

  const separateMultipleCodes = (codeString: string) => {
    const codeList = codeString
      .split(";")
      .map((code) => code.trim())
      .filter(Boolean);
    return codeList;
  };

  return { updateCode, deleteCode, handleKeyDown, editAllInstancesOfCode };
};
