import WorkspaceCard from "./WorkspaceCard";
import DataUploadCardContent from "./cardContents/dataUploadStep/DataUploadCardContent";
import AccessAPICardContent from "./cardContents/AccessAPICardContent";
import ResearchContextCardContent from "./cardContents/ResearchContextCardContent";
import CodingCardContent from "./cardContents/codingStep/CodingCardContent";
import ResultsCardContent from "./cardContents/ResultsCardContent";
import PromptReviewCardContent from "./cardContents/PromptReviewCardContent";
import { useContext } from "react";
import { WorkflowContext } from "../context/WorkflowContext";
import { QuestionMarkCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import OverlayWindow from "./OverlayWindow";

function Workspace() {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error("Workspace must be used within a WorkflowProvider");
  }
  const { currentStep, showCodingInstructionsOverlay, setShowCodingInstructionsOverlay } =
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

      {showCodingInstructionsOverlay && (
        <OverlayWindow
          isVisible={showCodingInstructionsOverlay}
          onClose={() => setShowCodingInstructionsOverlay(false)}
          maxWidth="max-w-[60%]"
          maxHeight="max-h-[80%]"
        >
          <div className="px-2 pb-4">
            <div className="flex justify-between items-center bg-background pt-2 pb-6 z-10">
              <p className="text-lg font-semibold">Coding Instructions</p>
              <XMarkIcon
                title="Close window"
                className="w-8 h-8 p-0.5 flex-shrink-0 rounded-full text-black hover:bg-gray-700/10 cursor-pointer stroke-2"
                onClick={() => setShowCodingInstructionsOverlay(false)}
              />
            </div>
            <div>
              <h2 className="font-semibold pb-3">Workflow</h2>
              <p className="pb-3">
                Use your mouse to highlight passages in the data. This will spawn a code
                input where you can add codes for that passage. You can add multiple codes
                to a passage by separating them in the input with semicolons.
              </p>
              <p>
                Once you press enter or click outside the input, the code(s) will be added
                to the passage and the codebook will get updated. If you have AI
                suggestions enabled, the AI will then suggest the next passage to code.
              </p>
              <h2 className="font-semibold pb-3 pt-5">AI Suggestions Settings</h2>
              <p className="pb-3">
                You toggle the AI suggestions on/off in the coding settings card. You can
                also adjust the context window size for the suggestions, define additional
                coding guidelines that will be included in the suggestion prompts, and
                define how you want the few-shot examples to be selected for the AI
                prompts.
              </p>
              <p>For the few-shot examples, you can either:</p>
              <ul className="list-disc list-inside pt-2 pb-3">
                <li>
                  Let the system select random few-shot examples from the coded data, up
                  to a number of your choice.
                </li>
                <li>
                  OR choose manual selection, and define the few-shot examples yourself in
                  the coding view.
                </li>
              </ul>
              <p>
                The recommended approach is to use random selection until you have so many
                coded passages that it is reasonable to choose only the best examples
                using manual selection.
              </p>
              <h2 className="font-semibold pb-3 pt-5">Codebook Management</h2>
              <p>
                You can either import a codebook, or start coding directly. In either
                case, new codebook entries will be created automatically as codes are
                added to the data. All codebook codes, used and unused, are included in
                the coding suggestion prompts.
              </p>
              <p className="pt-3">
                Note that if you delete all instances of a code in the coding window, the
                code will still remain in the codebook unless you remove it manually from
                there as well.
              </p>
              <h2 className="font-semibold pb-3 pt-5">Reviewing and Exporting Results</h2>
              <p>
                You can review and export your coded data in the next step. Exported data
                will be a CSV file with three columns: context, passage, and codes. If you
                uploaded a CSV file for coding, the exporting will result in separate CSV
                files for each column in the original data that you added some codes to.
              </p>
            </div>
          </div>
        </OverlayWindow>
      )}
    </>
  );
}

export default Workspace;
