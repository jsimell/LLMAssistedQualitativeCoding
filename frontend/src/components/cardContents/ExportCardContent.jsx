import { useState, useContext } from "react";
import { WorkflowContext } from "../../context/WorkflowContext";

const ExportCardContent = () => {
  return (
    <div>
      <StepNavigationButtons hideNext={true}></StepNavigationButtons>
    </div>
  );
}

export default ExportCardContent;