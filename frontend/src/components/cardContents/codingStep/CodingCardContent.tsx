import { useState, useContext, useEffect, useRef } from "react";
import { CodeId, Passage, PassageId, WorkflowContext } from "../../../context/WorkflowContext";
import ToggleSwitch from "../../ToggleSwitch";
import Codebook from "./Codebook";
import CodeBlob from "./CodeBlob";
import { usePassageSegmenter } from "./hooks/usePassageSegmenter";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/solid";
import SuggestionBlob from "./SuggestionBlob";

const CodingCardContent = () => {
  // Local state for tracking the currently active passage and code input
  const [activeCodeId, setActiveCodeId] = useState<CodeId | null>(null);
  const [activePassageId, setActivePassageId] = useState<PassageId | null>(null);
  const [hoveredPassageId, setHoveredPassageId] = useState<PassageId | null>(null);

  const { createNewPassage } = usePassageSegmenter({
    setActiveCodeId,
  });

  const visibleHighlightSuggestionRef = useRef<HTMLSpanElement>(null);
  const activeCodeRef = useRef<HTMLSpanElement>(null);

  // Get global states and setters from the context
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error("WorkflowContext must be used within a WorkflowProvider");
  }
  const {
    passages,
    setProceedAvailable,
    aiSuggestionsEnabled,
    setAiSuggestionsEnabled,
    contextWindowSize,
    setContextWindowSize,
  } = context;

  // Moving to the next step should be allowed by default in this step
  useEffect(() => {
    setProceedAvailable(true);
  }, []);

  // Effect hook to keep activePassageId in sync with activeCodeId
  useEffect(() => {
    if (activeCodeId === null) {
      setActivePassageId(null);
      return;
    } else {
      const activePassage = context.codes.find(
        (c) => c.id === activeCodeId
      )?.passageId;
      setActivePassageId(activePassage !== undefined ? activePassage : null);
    }
  }, [activeCodeId]);

  // The purpose of the below is:
  // 1. ensure that the active code automatically gets focus when it is first created
  // 2. ensure that the codebook gets updated when activeCodeId changes (i.e., when user clicks on a code blob, or outside to defocus)
  //    This removes the need to use the onBlur event on the editable span of the code blob.
  useEffect(() => {
    if (activeCodeRef.current) {
      activeCodeRef.current.focus();
    }
  }, [activeCodeId]);

  /**
   *
   * @param p - the passage to be rendered
   * @returns - the jsx code of the passage
   */
  const renderPassage = (p: Passage) => {
    return (
      <span 
        key={p.id}
        onMouseEnter={() => {
          if (activePassageId !== p.id) setHoveredPassageId(p.id);
        }}
        onMouseLeave={() => setHoveredPassageId(null)}
        className="inline-block"
      >
        <span>
          <span
            id={p.id}
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering parent onMouseUp event
              if (p.isHighlighted && p.codeIds.length > 0)
                setActiveCodeId(p.codeIds[p.codeIds.length - 1]);
            }}
            className={`
              ${
                p.isHighlighted
                  ? "bg-tertiaryContainer hover:bg-tertiaryContainerHover cursor-pointer rounded-sm px-1 w-fit mr-1 "
                  : ""
              }
              ${
                activePassageId === p.id
                  ? "bg-tertiaryContainerHover underline decoration-onBackground"
                  : ""
              }
            `}
          >
            {renderPassageText(p)}
          </span>
          <span 
            className="inline-flex items-center"
          >
            {p.codeIds?.length > 0 &&
              p.codeIds.map((codeId) => (
                <CodeBlob
                  key={codeId}
                  parentPassage={p}
                  codeId={codeId}
                  activeCodeId={activeCodeId}
                  setActiveCodeId={setActiveCodeId}
                  setActivePassageId={setActivePassageId}
                  activeCodeRef={activeCodeRef}
                />  
              ))}
          </span>
        </span>
      </span>
    );
  };


  /**
   * Handles accepting a highlight suggestion when it is clicked.
   * @param passage - the passage for which to accept the suggestion
   */
  const handleAcceptSuggestion = (
    e: React.MouseEvent<HTMLSpanElement, MouseEvent>,
    parentPassage: Passage
  ) => {
    e.stopPropagation();

    const suggestionText = parentPassage.nextHighlightSuggestion?.passage;
    if (!suggestionText) return;

    const startIdx = parentPassage.text.indexOf(suggestionText);
    if (startIdx === -1) return;
    const endIdx = startIdx + suggestionText.length;

    // 1) Hide suggestion so the passage DOM becomes a single text node again
    setHoveredPassageId(null);
    setActivePassageId(null);

    // 2) Next frame, build a Range on the plain text node and call createNewPassage
    requestAnimationFrame(() => {
      const root = document.getElementById(parentPassage.id);
      const textNode = root?.firstChild as Text | null;

      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        const range = document.createRange();
        range.setStart(textNode, startIdx);
        range.setEnd(textNode, endIdx);
        createNewPassage(range, [parentPassage.nextHighlightSuggestion!.code]);
      } else {
        // Fallback: select full contents if text node not available
        if (root) {
          const range = document.createRange();
          range.selectNodeContents(root);
          createNewPassage(range);
        }
      }
    });
  };


  /** 
   * Renders the text content of a passage, with highlight suggestion set to show on hover if available.
   * @param p passage to render
   * @returns 
   */
  const renderPassageText = (p: Passage) => {
    const showSuggestion = 
      !p.isHighlighted && 
      p.nextHighlightSuggestion && 
      hoveredPassageId === p.id && 
      activePassageId === null;

    if (!showSuggestion) return p.text;

    const suggestionText = p.nextHighlightSuggestion!.passage;
    const startIdx = p.text.indexOf(suggestionText);
    
    if (startIdx === -1) return p.text;

    const endIdx = startIdx + suggestionText.length;

    return (
      <>
        {p.text.slice(0, startIdx)}
        <span 
          onClick={(e) => {
            e.stopPropagation();
            handleAcceptSuggestion(e, p);
          }}
          className="inline-block"
        >
          <span
            ref={visibleHighlightSuggestionRef}
            className=" bg-gray-300 cursor-pointer select-none hover:bg-gray-400 mr-1"
          >
            {p.text.slice(startIdx, endIdx)}
          </span>
        </span>
        <SuggestionBlob 
          passage={p} 
          onClick={(e) => {
            e.stopPropagation();
            handleAcceptSuggestion(e, p);
          }}
        />
        {p.text.slice(endIdx)}
      </>
    );
  };

  return (
    <div className="flex w-full gap-7">
      <div
        onMouseUp={() => {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            createNewPassage(selection.getRangeAt(0));
          }
        }}
        className="flex-1 rounded-xl border-1 border-outline p-8 text-onBackground text-base whitespace-pre-wrap"
      >
        {passages.map((p) => renderPassage(p))}
      </div>
      <div className="flex flex-col items-center gap-4 sticky top-5 h-fit w-fit min-w-50 max-w-sm">
        <Codebook />
        <div className="flex flex-col gap-3 items-center justify-center rounded-xl border-1 border-outline p-6">
          <div className="flex gap-2 w-full items-center justify-between">
            <p>AI suggestions</p>
            <ToggleSwitch
              booleanState={aiSuggestionsEnabled}
              setBooleanState={setAiSuggestionsEnabled}
            />
          </div>
          <div className="flex gap-4 items-center justify-between">
            <div className="flex gap-1 items-center">
              <p>Context window size</p>
              <QuestionMarkCircleIcon
                className="size-4.5 text-tertiary"
                title="The number of characters that the LLM will consider when suggesting codes for a highlighted passage. A larger context window may provide more relevant suggestions, but also increases response time."
              />
            </div>
            <input
              type="number"
              value={contextWindowSize ?? ""}
              onChange={(e) =>
                setContextWindowSize(
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
              onBlur={(e) => {
                if (e.target.value === "" || e.target.value === null) {
                  setContextWindowSize(500); // Reset to default if input is empty
                }
              }}
              onKeyDown={(e) => {
                e.key === "Enter" && (e.target as HTMLInputElement).blur();
              }}
              className="border-1 border-outline rounded-md p-1 max-w-[80px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodingCardContent;
