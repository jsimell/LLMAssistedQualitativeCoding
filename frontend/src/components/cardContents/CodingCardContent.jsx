import React, { useState, useContext, useEffect, useRef } from "react";
import { WorkflowContext } from "../../context/WorkflowContext";

const CodingCardContent = () => {
  const { rawData, codebook, setProceedAvailable } = useContext(WorkflowContext);
  const nextCodeIdRef = useRef(0);
  //const [nextPassageId, setNextPassageId] = useState(1);  // Next available ID for passage identification
  const [activeCodeId, setActiveCodeId] = useState(null);
  const activeCodeRef = useRef(null);  // A reference to the actual input element of the currently active code

  // The following states are the core states that contain all the relevant data required for the data coding interaction.
  // The codeIds array contains all the ids of the codes of that particular passage.
  const [passages, setPassages] = useState([
    { position: 0, text: rawData, codeIds: [] }
  ]);
  // The codes are stored in the separate "codes" state as: {id: <int>, code: <string>}
  // NOTE: This is not like the codebook, which contains all codes only once.
  // Instead, all inserted codes (even duplicates) are stored in this state with a unique id.
  const [codes, setCodes] = useState([]);

  // Moving to the next step should be allowed by default in this step
  useEffect(() => {
    setProceedAvailable(true);
  }, []);

  useEffect(() => {
    if (activeCodeRef.current) {
      activeCodeRef.current.focus();
    }
  }, [activeCodeId])

  // This function gets called when the user highlights a passage in the workspace
  const handleMouseUp = () => {
    const selection = window.getSelection();
    const sourceText = selection.anchorNode.textContent;
    const sourcePosition = Number(selection.anchorNode.parentNode.id);  // The id is equivalent to the position of the sourcePassage in the passages state variable
    const sourcePassage = passages.find(p => p.position === sourcePosition);
    const range = selection.getRangeAt(0);
    const beforeHighlighted = sourceText.slice(0, range.startOffset);
    const highlighted = selection.toString();
    const afterHighlighted = sourceText.slice(range.endOffset);

    // If passage is empty, do nothing
    if (highlighted.trim() === "") {
      return;
    }

    // Make sure that the highlighted passage is not overlapping with previously highlighted passages
    if (range.startContainer !== range.endContainer || sourcePassage.codeIds.length > 0) {
      alert("Overlapping passages not allowed! Please select a new passage or click an existing code to edit it.");
      return;
    }

    // Get the id to use for the new code, and increment nextCodeIdRef
    const newId = nextCodeIdRef.current;
    nextCodeIdRef.current += 1; 

    let newPassages = [];
    if (beforeHighlighted.length === 0 && afterHighlighted.length === 0) { // Edge case: Highlight between two already coded passages
      newPassages = [
        { ...sourcePassage, codeIds: sourcePassage.codeIds.concat(newId) }
      ]
    } else if (beforeHighlighted.length === 0) { // Edge case: Highlight in the beginning of data or immediately after a coded passage
      newPassages = [
        { position: sourcePosition, text: highlighted, codeIds: [newId] },
        { position: sourcePosition + 1, text: afterHighlighted, codeIds: [] }
      ]
    } else if (afterHighlighted.length === 0) { // Edge case: Highlight at the end of the data or right before a coded passage
      newPassages = [
        { position: sourcePosition, text: beforeHighlighted, codeIds: [] },
        { position: sourcePosition + 1, text: highlighted, codeIds: [newId] }
      ]
    } else { // Default case: Highlight in the middle of (an uncoded) passage
      newPassages = [
        { position: sourcePosition, text: beforeHighlighted, codeIds: [] },
        { position: sourcePosition + 1, text: highlighted, codeIds: [newId] },
        { position: sourcePosition + 2, text: afterHighlighted, codeIds: [] }
      ]
    }

    setPassages(prev => {
      const updated = [
        ...prev.filter(p => p.position !== sourcePosition).map(p =>
          p.position > sourcePosition ? { ...p, position: p.position + (newPassages.length - 1) } : p
        ),
        ...newPassages
      ];
      const sorted = updated.sort((a, b) => a.position - b.position);
      return sorted.map((p, index) => ({ ...p, position: index }));
    });

    setCodes(prev => [...prev, { id: newId, code: "" }]);
    setActiveCodeId(newId);
  };

  const handleKeyDown = (e) => {
    if (["Enter", "Tab", "Escape"].includes(e.key)) {
      e.preventDefault();  // Prevents default behaviour of the tab button
      e.target.blur();
      setActiveCodeId(null);
      return;
    } 
    if (e.key === "Delete") {
      e.preventDefault();
      deleteCode(activeCodeId);
    }
  }

  const updateCode = (id, newValue) => {
    setCodes(prev =>
      prev.map(c => (c.id === id ? { ...c, code: newValue } : c))
    );
  }

  const deleteCode = (id) => {
    // Delete the code from the codes state
    setCodes(prev => prev.filter(c => c.id !== id));
    // Make sure that the activeCodeId state is not pointing to the deleted code
    setActiveCodeId(null);

    // Update the passages state
    setPassages(prev => {
      // Step 1: find the passage that the code is attached to, and remove the code from the codeIds array of that passage.
      // NOTE: Remember that code ids are unique even for duplicate codes.
      const passage = prev.find(p => p.codeIds.includes(id));
      if (!passage) return prev; // nothing to delete, return current state
      let updatedPassage = { 
        ...passage, 
        codeIds: passage.codeIds.filter(codeId => codeId !== id) 
      };

      // Step 2: If the passage still has codes, simply update it
      if (updatedPassage.codeIds.length > 0) {
        return prev.map(p => p.position === passage.position ? updatedPassage : p);
      }

      // Step 3: Passage has no codes left - merge it with uncoded neighboring passages
      const pos = passage.position;
      const prevPassage = prev.find(p => p.position === pos - 1);
      const nextPassage = prev.find(p => p.position === pos + 1);
      const mergePrevious = prevPassage && prevPassage.codeIds.length === 0;
      const mergeNext = nextPassage && nextPassage.codeIds.length === 0;
      // Merge the passages
      const mergedText =
        (mergePrevious ? prevPassage.text : "") +
        updatedPassage.text +
        (mergeNext ? nextPassage.text : "");

      updatedPassage = { ...updatedPassage, text: mergedText, codeIds: [] };

      // Step 4: build the new array
      const positionsToRemove = [pos];
      if (mergePrevious) positionsToRemove.push(pos - 1);
      if (mergeNext) positionsToRemove.push(pos + 1);
      // Remove passages to be replaced by the merged passage
      let newPassages = prev.filter(p => !positionsToRemove.includes(p.position));
      // Insert the merged passage in the right position, and update the positions
      const insertPosition = Math.min(...positionsToRemove);
      newPassages.splice(insertPosition, 0, updatedPassage);
      newPassages = newPassages.map((p, index) => ({ ...p, position: index }));
      return newPassages;
    });
  };

  const renderCodeBlob = (codeId, hasTrailingBreak) => {
    const codeObject = codes.find((c) => c.id === codeId);
    if (!codeObject) return null;
    return (
      <span key={`code${codeId}`}>
        <input
          value={codeObject.code}
          size={Math.max(codeObject.code.length + 1, 8)}
          placeholder="Type code..."
          onChange={(e) => {
            updateCode(codeId, e.target.value);
            handleCodeBlobSizing(e);
          }}
          onFocus={() => setActiveCodeId(codeId)}
          onKeyDown={handleKeyDown}
          ref={activeCodeId === codeId ? activeCodeRef : null} // attach ref only to active code
          className="bg-tertiaryContainer border border-gray-500 rounded-full px-2 mr-1.5 mt-1 hover:bg-tertiaryContainerHover focus:bg-tertiaryContainerHover focus:outline-none focus:ring-1 focus:ring-onBackground"
        />
        {hasTrailingBreak && <br/>}
      </span>
    );
  }; 

  const handleCodeBlobSizing = (e) => {
    const target = e.target;
    target.style.width = "1px";
    target.style.width = `${target.scrollWidth + 4}px`;
  }

  const renderPassage = (p) => {
    // If the passage ends with a line break, a line break should be added after the last code blob
    const endsWithLineBreak = p.text.endsWith("\n");

    return (
      <React.Fragment key={p.position}>
        <span
          key={p.position}
          id={p.position}
          onClick={() => setActiveCodeId(p.codeIds[0])}
          className={p.codeIds?.length > 0 ? "bg-tertiaryContainer hover:bg-tertiaryContainerHover cursor-pointer rounded-sm px-1 w-fit mr-1" : ""}
        >
          {p.text}
        </span>
        {p.codeIds?.length > 0 && p.codeIds.map((codeId) => {
          return renderCodeBlob(codeId, endsWithLineBreak);
        })}
      </React.Fragment>
    );
  }

  return (
    <div className="flex w-full gap-7">
      <div onMouseUp={handleMouseUp} className="flex-1 rounded-xl border-1 border-outline p-8 text-onBackground text-base whitespace-pre-wrap">
        {passages.map((p) => (
          renderPassage(p)
        ))}
      </div>
      <div className="flex flex-col items-center w-fit h-fit min-w-60 sticky top-5 rounded-xl border-1 border-outline">
        <div className="flex h-fit w-full items-center justify-center px-4.5 pt-4 pb-3.5 border-b border-outline rounded-t-xl bg-container text-primary">
          <p className="text-lg font-semibold">Codebook</p>
        </div>
        {codebook[0].length === 0 && <p className="px-4.5 py-4 ">No codes yet</p>}
        {codebook[0].length > 0 && (codebook[0].map((code) => <p>{code}</p>))}
      </div>
    </div>
  );
}

export default CodingCardContent;