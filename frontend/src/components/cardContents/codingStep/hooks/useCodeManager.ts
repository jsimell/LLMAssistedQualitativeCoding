import { useContext, useRef, useEffect } from "react";
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

  const { codes, setCodes, passages, setPassages, nextCodeId, setNextCodeId } = context;
  const { updateSuggestionsForPassage } = useAIsuggestionManager();

  // Track which passage needs suggestion update
  const passageNeedingUpdateRef = useRef<number | null>(null);

  // Takes care of updating suggestions for passages whose codes were changed
  useEffect(() => {
    const passageId = passageNeedingUpdateRef.current;
    if (passageId !== null) {
      updateSuggestionsForPassage(passageId);
      passageNeedingUpdateRef.current = null; // Reset after update
    }
  }, [codes]);

  /** Adds a new code to a passage.
   * 
   * @param passageId Id of the passage to which the code will be added
   * @param codeValue The code content (can be a single code or multiple codes separated by ';')
   */
  const addCode = (passageId: number, codeValue: string) => {
    const codeList = separateMultipleCodes(codeValue.trim());
    let newCodeId = nextCodeId;

    setCodes((prev) => {
      const newCodes = codeList.map((code) => {
        const codeObj: Code = {
          id: newCodeId++,
          passageId: passageId,
          code: code,
        };
        return codeObj;
      });
      return [...prev, ...newCodes];
    });

    // Update passage to include new code IDs
    const newCodeIds = Array.from(
      { length: codeList.length },
      (_, i) => nextCodeId + i
    );
    setPassages((prev) =>
      prev.map((p) =>
        p.id === passageId
          ? { ...p, codeIds: [...p.codeIds, ...newCodeIds] }
          : p
      )
    );

    // Mark passage for AI suggestion update
    passageNeedingUpdateRef.current = passageId;

    // Update nextCodeId
    setNextCodeId(newCodeId);
  };


  /** Updates the value of a specific code.
   * 
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

    // Mark passage for AI suggestion update
    passageNeedingUpdateRef.current = passageId;

    // No code should be active after update -> set activeCodeId to null
    setActiveCodeId(null);
    return;
  };

  /**
   * Deletes a code.
   * @param id - the id of the code to be deleted
   */
  const deleteCode = (id: number) => {

    setPassages((prev) => {
      // 1. Find affected passage
      const affectedPassage = prev.find((p) => p.codeIds.includes(id));
      if (!affectedPassage) return prev;

      // 2. Remove code from passage's codeIds
      const updatedPassage = {
        ...affectedPassage,
        codeIds: affectedPassage.codeIds.filter((cid) => cid !== id),
      };

      // 3. Mark the passage for AI suggestion update
      passageNeedingUpdateRef.current = updatedPassage.id;

      // 4. Check if passage still has codes
      if (updatedPassage.codeIds.length > 0) {
        // Still has codes - just update this passage
        return prev.map((p) =>
          p.id === updatedPassage.id ? updatedPassage : p
        );
      }

      // 5. Otherwise: passage has no codes left and it may have to be merged with neighboring passages.
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

    // 6. Remove code from codes array
    setCodes((prev) => prev.filter((c) => c.id !== id));

    // 7. No code should be active after deletion -> set activeCodeId to null
    setActiveCodeId(null);
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

  return { addCode, updateCode, deleteCode, editAllInstancesOfCode };
};
