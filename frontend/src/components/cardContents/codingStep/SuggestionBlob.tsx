import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import { Passage } from "../../../context/WorkflowContext";

interface SuggestionBlobProps {
  passage: Passage;
  onAccept: () => void
  onDecline: () => void
}

const SuggestionBlob = ({
  passage,
  onAccept,
  onDecline
}: SuggestionBlobProps) => {

  if (passage.isHighlighted || !passage.nextHighlightSuggestion) {
    return null;
  }

  return (
    <>
      <span
        className={`
          inline-flex items-center w-fit px-2 mr-1
        bg-gray-300 border-1 my-0.5 border-gray-500 rounded-full hover:bg-gray-400/70
          text-gray-700
        `}
        onClick={(e) => {
          e.stopPropagation();
          onAccept();
        }}
      >
        {passage.nextHighlightSuggestion?.codes[0]}
        <span
          className="bg-transparent ml-1.5 rounded-full hover:text-gray-800 hover:bg-onBackground/20 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering the onAccept when clicking the decline button
            onDecline();
          }}
        >
          <XMarkIcon className="size-5" />
        </span>
      </span>
    </>
  );
};

export default SuggestionBlob;