import { useState, useContext, useEffect, useRef } from "react";
import { WorkflowContext } from "../../../context/WorkflowContext";
import { useCodeManager } from "./hooks/useCodeManager";
import { CheckIcon, PencilIcon, XMarkIcon } from "@heroicons/react/24/solid";

interface SuggestionBlobProps {
  passageId: number;
  suggestionId: number;
  hasTrailingBreak: boolean;
  onAccept: (suggestionId: number) => void;
  onEdit: (suggestionId: number) => void;
  onReject: (suggestionId: number) => void;
}

const SuggestionBlob = ({
  passageId,
  suggestionId,
  hasTrailingBreak,
  onAccept,
  onEdit,
  onReject,
}: SuggestionBlobProps) => {
  const context = useContext(WorkflowContext)!; // Non-null assertion since parent already ensures WorkflowContext is provided
  const { passages } = context;

  const passage = passages.find((p) => p.id === passageId);
  if (!passage) return null;

  const suggestionString = passage.aiSuggestions.find(
    (s) => s.id === suggestionId
  )?.suggestedCodes;
  if (!suggestionString) {
    console.warn(`No suggestion found for suggestionId ${suggestionId} in passageId ${passageId}`);
    return null;
  }

  const handleSuggestionAccept = () => {
    onAccept(suggestionId);
  };
  const handleSuggestionEdit = () => {
    onEdit(suggestionId);
  };
  const handleSuggestionReject = () => {
    onReject(suggestionId);
  };

  return (
    <>
      <span
        className={`
          inline-flex items-center w-fit px-2 mr-1
        bg-gray-200 border-1 my-0.5 border-gray-400 rounded-full hover:bg-gray-300 
          text-gray-700
        `}
      >
        {suggestionString}
        <div className="flex pl-2.5 gap-0.5 items-center">
          <div onClick={handleSuggestionAccept} className="rounded-full p-0.5 bg-green-300 hover:bg-green-400">
            <CheckIcon className="size-4 cursor-pointer" />
          </div>
          <div onClick={handleSuggestionEdit} className="rounded-full p-1 bg-blue-300 hover:bg-blue-400">
            <PencilIcon className="size-3 cursor-pointer" />
          </div>
          <div onClick={handleSuggestionReject} className="rounded-full p-0.5 bg-red-300 hover:bg-red-400">
            <XMarkIcon className="size-4 cursor-pointer" />
          </div>
        </div>
      </span>
      {hasTrailingBreak && <br />}
    </>
  );
};

export default SuggestionBlob;