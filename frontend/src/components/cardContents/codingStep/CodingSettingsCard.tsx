import { useContext, useState } from "react";
import { WorkflowContext } from "../../../context/WorkflowContext";
import ToggleSwitch from "../../ToggleSwitch";
import QuestionMarkCircleIcon from "@heroicons/react/24/solid/QuestionMarkCircleIcon";
import HoverMessage from "../../HoverMessage";
import SmallButton from "../../SmallButton";
import OverlayWindow from "../../OverlayWindow";
import ExamplesSelectionWindowContent from "./ExamplesSelectionWindowContent";

interface CodingSettingsCardContentProps {
  preventCodeBlobDeactivationRef: React.RefObject<boolean>;
}

const CodingSettingsCardContent = ({
  preventCodeBlobDeactivationRef,
}: CodingSettingsCardContentProps) => {
  const [showCodeSuggHoverMsg, setShowCodeSuggHoverMsg] = useState(false);
  const [showHighlightSuggHoverMsg, setShowHighlightSuggHoverMsg] = useState(false);
  const [showFewShotHoverMsg, setShowFewShotHoverMsg] = useState(false);
  const [showExamplesSelectionWindow, setShowExamplesSelectionWindow] = useState(false);

  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error("CodingSettingsCard must be used within a WorkflowProvider");
  }

  const {
    aiSuggestionsEnabled,
    setAiSuggestionsEnabled,
    codeSuggestionContextWindowSize,
    setCodeSuggestionContextWindowSize,
    highlightSuggestionContextWindowSize,
    setHighlightSuggestionContextWindowSize,
    codingGuidelines,
    setCodingGuidelines,
    highlightGuidelines,
    setHighlightGuidelines,
    fewShotExamplesSelectionMode,
    setFewShotExamplesSelectionMode,
    randomFewShotExamplesCount,
    setRandomFewShotExamplesCount,
    uploadedFile,
    fewShotExamples,
    examplesPrecedingContextSize,
    setExamplesPrecedingContextSize,
    examplesTrailingContextSize,
    setExamplesTrailingContextSize,
  } = context;

  const dataIsCSV = uploadedFile?.type === "text/csv";

  return (
    <div className="w-full h-fit flex flex-col items-center justify-center">
      <div className="flex flex-col w-full px-6 items-center py-7 gap-5">
        <div className="flex gap-2 w-full items-center justify-between">
          <p>AI suggestions</p>
          <ToggleSwitch
            booleanState={aiSuggestionsEnabled}
            setBooleanState={setAiSuggestionsEnabled}
            onMouseDown={() => {
              preventCodeBlobDeactivationRef.current = true;
            }}
            onMouseLeave={() => {
              preventCodeBlobDeactivationRef.current = false;
            }}
          />
        </div>
        <div className="flex gap-4 items-center justify-between">
          <p>Context window for code suggestions (words):</p>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={codeSuggestionContextWindowSize ?? ""}
              onChange={(e) =>
                setCodeSuggestionContextWindowSize(
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
              onBlur={(e) => {
                if (e.target.value === "" || e.target.value === null) {
                  setCodeSuggestionContextWindowSize(0); // Set to minimum value if input is empty
                }
              }}
              onKeyDown={(e) => {
                e.key === "Enter" && (e.target as HTMLInputElement).blur();
              }}
              className="border-1 border-outline rounded-md p-1 max-w-[80px] accent-[#006851]"
            />
            <div className="relative">
              <QuestionMarkCircleIcon
                className="size-5 text-tertiary"
                onMouseEnter={() => setShowCodeSuggHoverMsg(true)}
                onMouseLeave={() => setShowCodeSuggHoverMsg(false)}
              />
              {showCodeSuggHoverMsg && (
                <HoverMessage className="w-[360px] absolute right-full top-1/2 -translate-y-[10%] mr-1">
                  <div className="flex flex-col gap-4">
                    <p>
                      The number of words that are included in the LLM prompts as
                      surrounding context when generating code suggestions for a
                      highlighted passage. Approximately 70% of the words go before the passage, 30%
                      after. A value of 0 means the highlighted passage is included alone
                      with no surrounding context.
                    </p>
                    <p>
                      After the specified number of words are reached, the window is cut
                      intelligently (e.g., at a line break, or sentence end).
                    </p>
                    <p>
                      Larger windows may improve suggestion relevance up to a certain
                      point, but they also increase cost and too large windows may
                      decrease suggestion quality and rapidness.
                    </p>
                  </div>
                </HoverMessage>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-4 items-center justify-between">
          <p>Highlight suggestions search area size (words):</p>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={highlightSuggestionContextWindowSize ?? ""}
              onChange={(e) =>
                setHighlightSuggestionContextWindowSize(
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
              onBlur={(e) => {
                if (e.target.value === "" || e.target.value === null) {
                  setHighlightSuggestionContextWindowSize(0); // Set to minimum value if input is empty
                }
              }}
              onKeyDown={(e) => {
                e.key === "Enter" && (e.target as HTMLInputElement).blur();
              }}
              className="border-1 border-outline rounded-md p-1 max-w-[80px] accent-[#006851]"
            />
            <div className="relative">
              <QuestionMarkCircleIcon
                className="size-5 text-tertiary"
                onMouseEnter={() => setShowHighlightSuggHoverMsg(true)}
                onMouseLeave={() => setShowHighlightSuggHoverMsg(false)}
              />
              {showHighlightSuggHoverMsg && (
                <HoverMessage className="w-[360px] absolute right-full top-1/2 -translate-y-[10%] mr-1">
                  <div className="flex flex-col gap-4">
                    <p>
                      The size of the window from which the LLM will suggest the next text
                      passage to highlight. The size of the window should be large enough
                      to always include a passage that needs to be coded.
                    </p>
                    <p>
                      The starting point of the context window is determined based on the
                      latest entered code or a click on an uncoded section in the data, in
                      which case the AI searches for a suggestion starting from the
                      beginning of that uncoded section.
                    </p>
                    <p>
                      20% of the context window will be included as preceding context for
                      the LLM, and 80% of the context window will serve as the actual
                      search area from which the LLM will search for the next suggestion.
                      The context window is cut intelligently (e.g., at a line break, or
                      sentence end).
                    </p>
                  </div>
                </HoverMessage>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col w-full">
          <label htmlFor="codingGuidelines">Code style guidelines for the LLM:</label>
          <ul className="list-disc ml-3 pb-2 pt-0.5 text-sm">
            <li>Guidelines on the preferred style of the suggested codes.</li>
          </ul>
          <textarea
            id="codingGuidelines"
            value={codingGuidelines}
            onChange={(e) => setCodingGuidelines(e.target.value)}
            className="flex-1 border-1 border-outline rounded-md p-1 accent-[#006851] resize-none text-sm"
          />
        </div>
        <div className="flex flex-col w-full">
          <label htmlFor="codingGuidelines">
            Highlight selection guidelines for the LLM:
          </label>
          <ul className="list-disc ml-3 pb-2 pt-0.5 text-sm">
            <li>Guidelines on the preferred passage selection style.</li>
          </ul>
          <textarea
            id="codingGuidelines"
            value={highlightGuidelines}
            onChange={(e) => setHighlightGuidelines(e.target.value)}
            className="flex-1 border-1 border-outline rounded-md p-1 accent-[#006851] resize-none text-sm"
          />
        </div>
        <div className="flex gap-2 items-center justify-between w-full">
          <p>Examples for the LLM:</p>
          <form className="flex gap-3">
            <div className="flex flex-col">
              <label htmlFor="random" className="font-medium">
                Random
              </label>
              <input
                id="random"
                type="radio"
                value="random"
                checked={fewShotExamplesSelectionMode === "random"}
                onChange={() => setFewShotExamplesSelectionMode("random")}
                className="accent-[#006851]"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="manual" className="font-medium">
                Manual
              </label>
              <input
                id="manual"
                type="radio"
                value="manual"
                checked={fewShotExamplesSelectionMode === "manual"}
                onChange={() => setFewShotExamplesSelectionMode("manual")}
                className="accent-[#006851]"
              />
            </div>
          </form>
        </div>
        {fewShotExamplesSelectionMode === "random" && (
          <div className="flex flex-col gap-2.5 w-full pt-1">
            <div className="flex w-full gap-2 items-center justify-between">
              <p className="pr-2">Number of few-shot examples:</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={randomFewShotExamplesCount ?? ""}
                  onChange={(e) =>
                    setRandomFewShotExamplesCount(
                      e.target.value === "" ? 0 : Number(e.target.value)
                    )
                  }
                  onBlur={(e) => {
                    if (e.target.value === "" || e.target.value === null) {
                      setRandomFewShotExamplesCount(0); // Set to minimum value if input is empty
                    }
                  }}
                  onKeyDown={(e) => {
                    e.key === "Enter" && (e.target as HTMLInputElement).blur();
                  }}
                  className="border-1 border-outline rounded-md p-1 max-w-[80px]"
                />

                <div className="relative">
                  <QuestionMarkCircleIcon
                    className="size-5 text-tertiary"
                    onMouseEnter={() => setShowFewShotHoverMsg(true)}
                    onMouseLeave={() => setShowFewShotHoverMsg(false)}
                  />
                  {showFewShotHoverMsg && (
                    <HoverMessage className="w-[360px] absolute right-full top-1/2 -translate-y-[90%] mr-1">
                      <div className="flex flex-col gap-4">
                        <p>
                          The system will randomly select the specified number of few-shot
                          examples, if there are that many available. If there are fewer
                          available examples than the specified number, all coded passages
                          will be used as examples.
                        </p>
                        <p>
                          New random examples will be selected for each suggestion
                          request.
                        </p>
                      </div>
                    </HoverMessage>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between w-full gap-2">
              <p>Preceding context in examples (words):</p>
              <input
                type="number"
                value={examplesPrecedingContextSize ?? ""}
                onChange={(e) =>
                  setExamplesPrecedingContextSize(
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
                onBlur={(e) => {
                  if (e.target.value === "" || e.target.value === null) {
                    setExamplesPrecedingContextSize(0); // Set to minimum value if input is empty
                  }
                }}
                onKeyDown={(e) => {
                  e.key === "Enter" && (e.target as HTMLInputElement).blur();
                }}
                className="border-1 border-outline bg-background rounded-md p-1 max-w-[80px] accent-[#006851]"
              />
            </div>
            <div className="flex items-center w-full justify-between gap-2">
              <p>Trailing context in examples (words):</p>
              <input
                type="number"
                value={examplesTrailingContextSize ?? ""}
                onChange={(e) =>
                  setExamplesTrailingContextSize(
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
                onBlur={(e) => {
                  if (e.target.value === "" || e.target.value === null) {
                    setExamplesTrailingContextSize(0); // Set to minimum value if input is empty
                  }
                }}
                onKeyDown={(e) => {
                  e.key === "Enter" && (e.target as HTMLInputElement).blur();
                }}
                className="border-1 border-outline bg-background rounded-md p-1 max-w-[80px] accent-[#006851]"
              />
            </div>
            <p className="text-sm pt-2">
              <b>NOTE:</b> After the specified windows, the content is cut intelligently (e.g. at a line break or sentence end.)
            </p>
          </div>
        )}
        {fewShotExamplesSelectionMode === "manual" && (
          <div className="flex flex-col w-full items-center gap-3">
            <SmallButton
              label={`${fewShotExamples.length === 0 ? "Select" : "Change"} examples`}
              onClick={() => setShowExamplesSelectionWindow(true)}
              variant="tertiary"
            />
            <p className={fewShotExamples.length === 0 ? "text-red-600" : ""}>
              {fewShotExamples.length > 0
                ? `Currently ${fewShotExamples.length} examples selected`
                : "No examples selected"}
            </p>
          </div>
        )}
      </div>
      <OverlayWindow
        isVisible={showExamplesSelectionWindow}
        onClose={() => setShowExamplesSelectionWindow(false)}
        heightClass="max-h-[75vh]"
      >
        <ExamplesSelectionWindowContent
          setShowExamplesSelectionWindow={setShowExamplesSelectionWindow}
          dataIsCSV={dataIsCSV}
        />
      </OverlayWindow>
    </div>
  );
};

export default CodingSettingsCardContent;
