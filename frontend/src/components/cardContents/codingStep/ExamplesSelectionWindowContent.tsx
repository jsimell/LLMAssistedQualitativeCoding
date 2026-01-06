import { XMarkIcon } from "@heroicons/react/24/outline";
import { useContext } from "react";
import { WorkflowContext } from "../../../context/WorkflowContext";
import { getPassageWithSurroundingContext } from "./utils/passageUtils";
import Button from "../../Button";

interface ExamplesSelectionWindowContentProps {
  setShowExamplesSelectionWindow: React.Dispatch<React.SetStateAction<boolean>>;
  dataIsCSV: boolean;
}

const ExamplesSelectionWindowContent = ({
  setShowExamplesSelectionWindow,
  dataIsCSV,
}: ExamplesSelectionWindowContentProps) => {
  const {
    passages,
    codes,
    fewShotExamples,
    setFewShotExamples,
    examplesPrecedingContextSize,
    setExamplesPrecedingContextSize,
    examplesTrailingContextSize,
    setExamplesTrailingContextSize,
  } = useContext(WorkflowContext)!;

  return (
    <>
      <div className="flex justify-between items-center bg-gray-300 w-full h-fit px-6 py-4 rounded-t-lg z-10 sticky top-0">
        <div className="flex items-center">
          <p className="text-xl font-semibold mr-12">Select examples for the LLM</p>
          <div className="flex flex-col gap-2">
            <div className="flex">
              <div className="flex gap-2 mr-7 items-center">
                <p>Preceding context (words):</p>
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
              <div className="flex gap-2 mr-7 items-center">
                <p>Trailing context (words):</p>
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
            </div>
            <p className="text-sm">
              <b>NOTE:</b> After the above windows, the content is cut intelligently (e.g. at a line break or sentence end.)
            </p>
          </div>
        </div>
        <Button
          label="Confirm examples"
          onClick={() => setShowExamplesSelectionWindow(false)}
          variant="tertiary"
        />
      </div>
      <div className="flex flex-col px-12 pt-10 overflow-y-auto">
        {passages
          .filter((p) => p.isHighlighted)
          .map((passage) => {
            const { precedingContext, passageText, trailingContext } =
              getPassageWithSurroundingContext(
                passage,
                passages,
                examplesPrecedingContextSize ?? 30,
                examplesTrailingContextSize ?? 15,
                dataIsCSV
              );
            const isInExamples = Boolean(
              fewShotExamples.find((example) => example.passageId === passage.id)
            );
            return (
              <div key={passage.id}>
                <div className="flex gap-6 items-center pl-4">
                  <input
                    type="checkbox"
                    className="accent-[#006851]"
                    checked={isInExamples}
                    onChange={() => {
                      setFewShotExamples((prev) => {
                        if (prev.find((example) => example.passageId === passage.id)) {
                          // If already in few-shot examples, remove it
                          return prev.filter(
                            (example) => example.passageId !== passage.id
                          );
                        } else {
                          // Else, add it
                          return [
                            ...prev,
                            {
                              passageId: passage.id,
                              precedingText: precedingContext,
                              codedPassage: passageText,
                              trailingText: trailingContext,
                              codes: passage.codeIds
                                .map(
                                  (codeId) =>
                                    codes.find((code) => code.id === codeId)?.code
                                )
                                .filter(Boolean) as string[],
                            },
                          ];
                        }
                      });
                    }}
                  />
                  <div
                    key={passage.id}
                    className={`pr-6 whitespace-pre-wrap ${
                      isInExamples
                        ? "border-l-7 pl-2 rounded-sm border-[#006851] bg-[#e9ecf0] mr-5"
                        : ""
                    }`}
                  >
                    <span>{precedingContext}</span>
                    <span className="bg-tertiaryContainer rounded-sm w-fit mr-1">
                      {passageText}
                    </span>
                    {passage.codeIds.map((codeId) => {
                      const code = codes.find((c) => c.id === codeId);
                      return code ? (
                        <span
                          key={code.id}
                          className="inline-flex items-center self-center w-fit pl-2 pr-1.5 mr-1 my-0.5 bg-tertiaryContainer border-1 border-gray-400 rounded-full"
                        >
                          {code.code}
                        </span>
                      ) : null;
                    })}
                    <span>{trailingContext}</span>
                  </div>
                </div>
                <span className="block my-8 w-full border-t border-outline"></span>
              </div>
            );
          })}
        {passages.filter((p) => p.isHighlighted).length === 0 && (
          <p className="text-center px-6">
            You must code some passages to be able to select examples.
          </p>
        )}
      </div>
    </>
  );
};
export default ExamplesSelectionWindowContent;
