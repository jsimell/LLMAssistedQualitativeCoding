import { useState, useContext } from "react";
import { WorkflowContext } from "../../context/WorkflowContext";
import StepNavigationButtons from "../StepNavigationButtons";

const CodingCardContent = () => {
  const { rawData } = useContext(WorkflowContext);
  const [highlightedPassage, setHighlightedPassage] = useState(null); //TODO: What if there are multiple similar passages in the text?

  return (
    <div className="flex flex-col w-full h-fit gap-4">
      <div className="flex flex-col h-full w-full rounded-xl border-1 border-outline">
        <p className="p-8 text-onBackground text-base whitespace-pre-wrap">{rawData}</p>
      </div>
    </div>
  );
}

export default CodingCardContent;