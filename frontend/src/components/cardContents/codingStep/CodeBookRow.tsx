import { ArrowUturnLeftIcon, PencilSquareIcon } from "@heroicons/react/24/solid";
import { useContext, useState } from "react";
import { WorkflowContext } from "../../../context/WorkflowContext";
import { useCodeManager } from "./hooks/useCodeManager.js";
import SmallButton from "../../SmallButton.jsx";

interface CodeBookRowProps {
  code: string;
}

const CodeBookRow = ({ code }: CodeBookRowProps) => {
  if (!code.trim()) return null;

  const { codes } = useContext(WorkflowContext)!; // Non-null assertion since parent already ensures WorkflowContext is provided

  const [editInputValue, setEditInputValue] = useState(code);
  const [showEditInteraction, setShowEditInteraction] = useState(false);

  const { editAllInstancesOfCode } = useCodeManager({
    activeCodeId: null,
    setActiveCodeId: () => {},
  }); // Dummy setters since we don't need them here

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      saveChanges();
    } else if (e.key === "Escape") {
      cancelChanges
    }
  };

  const saveChanges = () => {
    editAllInstancesOfCode(code, editInputValue);
    setShowEditInteraction(false);
  };

  const cancelChanges = () => {
    setEditInputValue(code); // Reset to original code
    setShowEditInteraction(false);
  };

  return (
    <div
      key={code}
      className={`flex justify-between items-center gap-10 w-full ${
        showEditInteraction ? "flex rounded-lg mb-4" : ""
      }`}
    >
      {showEditInteraction ? (
        <div className="flex flex-col gap-1">
          <span className="ml-[1px]">Edit all instances:</span>
          <div className="relative">
            <input
              type="text"
              value={editInputValue}
              onChange={(e) => setEditInputValue(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e)}
              onBlur={() => saveChanges()}
              className="border border-outline rounded-sm pl-[1px] h-fit pr-8"
              autoFocus
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 right-0 p-1 hover:bg-onBackground/10 rounded-sm cursor-pointer flex items-center justify-center"
              onClick={() => setEditInputValue(code)}
              title="Cancel changes"
            >
              <ArrowUturnLeftIcon title="Undo changes" className="size-4 text-onBackground" />
            </div>
          </div>
        </div>
      ) : (
        <span className="flex items-center gap-1.5 py-1">
          {code.trim()}
          <PencilSquareIcon
            onClick={() => setShowEditInteraction(true)}
            className="w-6 h-6 p-0.5 flex-shrink-0 rounded-sm text-[#007a60] hover:bg-tertiary/10 cursor-pointer"
          />
        </span>
      )}
      <span>{`(${
        codes.filter((c) => (c.code ?? "").trim() === code.trim()).length
      })`}</span>
    </div>
  );
};

export default CodeBookRow;
