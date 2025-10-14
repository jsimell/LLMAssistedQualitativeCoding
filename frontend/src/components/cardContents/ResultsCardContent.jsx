import { useState, useContext } from "react";
import { WorkflowContext } from "../../context/WorkflowContext";

const ResultsCardContent = () => {
  return (
    <div>
      <StepNavigationButtons></StepNavigationButtons>
    </div>
  );
}

export default ResultsCardContent;