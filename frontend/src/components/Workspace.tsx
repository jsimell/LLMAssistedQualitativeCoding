import WorkspaceCard from "./WorkspaceCard";
import DataUploadCardContent from "./cardContents/dataUploadStep/DataUploadCardContent";
import AccessAPICardContent from "./cardContents/AccessAPICardContent";
import ResearchContextCardContent from "./cardContents/ResearchContextCardContent";
import CodingCardContent from "./cardContents/codingStep/CodingCardContent";
import ResultsCardContent from "./cardContents/ResultsCardContent";
import PromptReviewCardContent from "./cardContents/PromptReviewCardContent";
import { useContext } from "react";
import { WorkflowContext } from "../context/WorkflowContext";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";

function Workspace() {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error("Workspace must be used within a WorkflowProvider");
  }
  const { currentStep, setShowCodingInstructionsOverlay } =
    context;

  return (
    <>
      {currentStep === 1 && (
        <WorkspaceCard title="Step 1: Upload Data">
          <DataUploadCardContent />
        </WorkspaceCard>
      )}
      {currentStep === 2 && (
        <WorkspaceCard title="Step 2: Access OpenAI API">
          <AccessAPICardContent />
        </WorkspaceCard>
      )}
      {currentStep === 3 && (
        <WorkspaceCard title="Step 3: Research Context">
          <ResearchContextCardContent />
        </WorkspaceCard>
      )}
      {currentStep === 4 && (
        <WorkspaceCard title="Step 4: Prompt Review">
          <PromptReviewCardContent />
        </WorkspaceCard>
      )}
      {currentStep === 5 && (
        <WorkspaceCard
          title="Step 5: Data Coding"
          headerButtonLabel="Instructions"
          headerButtonIcon={QuestionMarkCircleIcon}
          headerButtonIconPosition="end"
          onHeaderButtonClick={() => {
            setShowCodingInstructionsOverlay(true);
          }}
        >
          <CodingCardContent />
        </WorkspaceCard>
      )}
      {currentStep === 6 && (
        <WorkspaceCard title="Step 6: Export Results">
          <ResultsCardContent />
        </WorkspaceCard>
      )}
      {(currentStep < 1 || currentStep > 6) && (
        <WorkspaceCard title="Unknown Step">
          <p>No content</p>
        </WorkspaceCard>
      )}
    </>
  );
}

export default Workspace;
