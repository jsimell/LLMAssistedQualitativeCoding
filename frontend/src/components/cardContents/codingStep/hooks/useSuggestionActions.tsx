import { useContext } from "react";
import { WorkflowContext } from "../../../../context/WorkflowContext";
import { useCodeManager } from "./useCodeManager";
import { useAIsuggestionManager } from "./useAIsuggestionManager";

interface UseSuggestionActionsProps {
  activeCodeId: number | null;
  setActiveCodeId: React.Dispatch<React.SetStateAction<number | null>>;
  setShowCodeSuggestionsFor: React.Dispatch<React.SetStateAction<number | null>>;
}

export const useSuggestionActions = ({
  activeCodeId,
  setActiveCodeId,
  setShowCodeSuggestionsFor,
}: UseSuggestionActionsProps) => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error("useSuggestionActions must be used within a WorkflowProvider");
  }

  const { addCode } = useCodeManager({ activeCodeId, setActiveCodeId });

  const { removeSuggestionFromPassage } = useAIsuggestionManager();

  const { passages, setCodes, setPassages, nextCodeId, setNextCodeId } = context;


  /** Handles the user accepting an AI suggestion. Adds the suggested codes as a new code to the passage.
   * 
   * @param suggestionId 
   */
  const handleAcceptSuggestion = (suggestionId: number) => {
    const parentPassage = passages.find((p) =>
      p.aiSuggestions.some((s) => s.id === suggestionId)
    );
    if (!parentPassage) return;
    
    const suggestionString = parentPassage.aiSuggestions.find(s => s.id === suggestionId)?.suggestedCodes;
    if (!suggestionString) return;

    addCode(parentPassage.id, suggestionString);

    // Remove the accepted suggestion from the passage's aiSuggestions
    removeSuggestionFromPassage(parentPassage.id, suggestionId);
    setShowCodeSuggestionsFor(null);
  }

  const handleEditSuggestion = (suggestionId: number) => {
    // Same as accept, but make the code active for editing after adding
    const codeIdToSetActive = nextCodeId; // store the correct codeId for activation
    handleAcceptSuggestion(suggestionId);
    setActiveCodeId(codeIdToSetActive);
  };

  /** Rejects an AI suggestion. Removes it from the passage's aiSuggestions.
   * 
   * @param suggestionId 
   */
  const handleRejectSuggestion = (suggestionId: number) => {
    setPassages((prev) =>
      prev.map((p) => ({
        ...p,
        aiSuggestions: p.aiSuggestions?.filter((s) => s.id !== suggestionId),
      }))
    );
    setShowCodeSuggestionsFor(null);
  };

  return {
    handleAcceptSuggestion,
    handleEditSuggestion,
    handleRejectSuggestion,
  };
};