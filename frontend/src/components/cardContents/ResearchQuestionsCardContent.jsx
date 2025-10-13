import { useState, useContext } from "react";
import { WorkflowContext } from "../../context/WorkflowContext";
import StepNavigationButtons from "../StepNavigationButtons";

const ResearchQuestionsCardContent = () => {
  return (
    <div className="flex flex-col w-full h-full items-center gap-4 pt-12 pb-6 px-6.5">
      <form action="" className="flex flex-col gap-4 w-full px-15 py-10">
        <div>
          <label for="RQs" className="text-nowrap">Research question(s):</label>
          <input id="RQs" type="text" className="border-1 w-full h-fit" />
        </div>
        <div className="flex flex-col">
          <label for="contextInfo">Contextual information:</label>
          <textarea id="contextInfo" type="" className="border-1" />
        </div>
      </form>
      <StepNavigationButtons></StepNavigationButtons>
    </div>
  );
}

export default ResearchQuestionsCardContent;