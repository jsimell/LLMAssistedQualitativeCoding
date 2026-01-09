import { MagnifyingGlassIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { PencilSquareIcon } from "@heroicons/react/24/solid";
import highlightExample from "/src/images/highlight-example.png";
import highlightSuggestionExample from "/src/images/highlight-suggestion-example.png";
import settingsExample from "/src/images/settings-example.png";
import codebookExample from "/src/images/codebook-example.png";
import resultsCardExample from "/src/images/resultsCard-example.png";
import Button from "../../Button";

interface InstructionsContentProps {
  setShowCodingInstructionsOverlay: React.Dispatch<React.SetStateAction<boolean>>;
}

const InstructionsContent = ({
  setShowCodingInstructionsOverlay,
}: InstructionsContentProps) => {
  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center bg-gray-300 w-full h-fit px-6 py-4 rounded-t-lg z-10">
        <p className="text-2xl font-semibold">Instructions</p>
        <XMarkIcon
          title="Close window"
          className="w-8 h-8 p-0.5 flex-shrink-0 rounded-full text-black hover:bg-gray-700/10 cursor-pointer stroke-2"
          onClick={() => setShowCodingInstructionsOverlay(false)}
        />
      </div>
      <div className="flex flex-col gap-5 px-12 pt-8 pb-10 overflow-y-auto max-h-[70vh]">
        <h2 className="font-semibold text-xl">Workflow</h2>
        <ul className="list-disc list-inside flex flex-col gap-1">
          <li>Highlight passages in your data to add codes to them.</li>
          <li>
            You can add multiple codes by <b>separating them with semicolons</b>.
          </li>
          <li>
            Accept code suggestions with the <b>Tab</b> key, and decline them with the{" "}
            <b>Escape</b> key.
          </li>
          <li>
            Declining shows the next suggestion, if available. It is often beneficial to
            escape through the suggestions as it may reveal aspects you hadn't considered.
          </li>
          <li>
            If you get stuck while typing a new code, the AI will suggest an autocomplete
            based on your input so far.
          </li>
          <li>
            The system will also automatically suggest autocompletion for codebook codes
            as you type.
          </li>
        </ul>
        <div className="flex justify-center w-full py-4 pr-2">
          <img
            src={highlightExample}
            alt="Passage highlighting example image"
            className="rounded-md border border-outline"
          />
        </div>
        <ul className="list-disc list-inside flex flex-col gap-1">
          <li>Finalize editing by pressing Enter or clicking outside the input.</li>
          <li>
            The AI will then suggest the next passage to code, which is shown as a gray
            ghost highlight <b>(see image below)</b>.
          </li>
          <li>
            Just like code suggestions, accept highlight suggestions by pressing the{" "}
            <b>Tab</b> key or by <b>clicking the suggested code</b>.
          </li>
          <li>
            Decline highlight suggestions by pressing the <b>Escape</b> key or by{" "}
            <b>clicking the X symbol</b> on the suggestion blob.
          </li>
          <li>
            Declining triggers the AI to search for the next possible passage to highlight
            after the declined one.
          </li>
          <li>
            Click on an uncoded section to search for a highlight suggestion <b>starting from the beginning of that section</b>.
          </li>
          <li>
            You can use the arrow keys to scroll the data vertically.
          </li>
        </ul>
        <div className="flex justify-center w-full py-4 pr-2">
          <img
            src={highlightSuggestionExample}
            alt="Highlight suggestion example image"
            className="rounded-md border border-outline"
          />
        </div>
        <hr className="w-full border-t border-outline my-2" />
        <h2 className="font-semibold pt-4 text-xl">Side Panel</h2>
        <div className="flex gap-6 items-start">
          <div className="flex flex-col gap-6 flex-1 min-w-0">
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <p className="font-semibold">Coding settings</p>
              <p>You can:</p>
              <ul className="list-disc list-inside flex flex-col gap-1 flex-1 min-w-0">
                <li>Toggle AI suggestions on/off.</li>
                <li>
                  Define how much context is provided to the AI when fetching coding
                  suggestions.
                </li>
                <li>
                  Define additional guidelines for the AI to customize its behavior.
                </li>
                <li>Choose how the few-shot examples are chosen for the AI.</li>
              </ul>
            </div>
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <p className="font-semibold">Codebook</p>
              <ul className="list-disc list-inside flex flex-col gap-1 flex-1 min-w-0">
                <li>You can either import a codebook, or start coding directly.</li>
                <li>
                  Codebook entries will be created automatically as codes are added to the
                  data.
                </li>
                <li>
                  You can also manually add codes using the <PlusIcon className="size-5 inline -mt-1" /> icon at the bottom of
                  the codebook.
                </li>
                <li>
                  Modify all instances of a specific code by clicking the pen symbol (
                  <PencilSquareIcon className="size-5 inline" />) next to
                  the code.
                </li>
                <li>
                  Review all instances of a code by clicking on the magnifying glass symbol (
                  <MagnifyingGlassIcon className="size-5 inline" />) next to the
                  code.
                </li>
                <li>
                  All codebook codes, used and unused, are provided to the AI.
                </li>
                <li>
                  You can download the codebook as a single column CSV file at any time
                  using the download button at the top of the codebook card.
                </li>
              </ul>
            </div>
          </div>
          <div className="flex gap-5 flex-wrap max-w-full justify-center">
            <img
              src={settingsExample}
              alt="Image illustrating coding settings"
              className="rounded-md border border-outline max-h-[600px] w-auto"
            />
            <img
              src={codebookExample}
              alt="Image illustrating the codebook"
              className="rounded-md border border-outline max-h-[600px] w-auto"
            />
          </div>
        </div>
        <hr className="w-full border-t border-outline mb-2 mt-6" />
        <h2 className="font-semibold pt-4 text-xl">Exporting Results</h2>
        <ul className="list-disc list-inside flex flex-col gap-1 flex-1 min-w-0">
          <li>In the next step, there is a barplot of the frequencies of your codes.</li>
          <li>
            You can also download a CSV file containing the coded passages, or download
            the codebook separately.
          </li>
        </ul>
        <div className="flex justify-center my-5">
          <img
            src={resultsCardExample}
            alt="Image from the results review and export step"
            className="rounded-md border border-outline w-[85%] h-auto"
          />
        </div>
        <div className="flex justify-center">
          <Button
            label="Understood"
            onClick={() => setShowCodingInstructionsOverlay(false)}
            variant="tertiary"
          />
        </div>
      </div>
    </div>
  );
};

export default InstructionsContent;
