import { useContext, useEffect } from "react";
import { PromptType, WorkflowContext } from "../../context/WorkflowContext";
import { usePrompts } from "./codingStep/hooks/apiCommunication/usePrompts";

const PromptReviewCardContent = () => {
  const promptTypes = ["highlight", "code", "autocomplete"];

  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error(
      "PromptReviewCardContent must be used within a WorkflowContextProvider"
    );
  }
  const { reviewedPromptType, setReviewedPromptType, setProceedAvailable } =
    context;

  const {
    generateHighlightSuggestionsPrompt,
    generateCodeSuggestionsPrompt,
    generateAutocompleteSuggestionsPrompt,
  } = usePrompts();

  const highlightPrompt = generateHighlightSuggestionsPrompt(
    context.uploadedFile?.type === "text/csv"
  );
  const codePrompt = generateCodeSuggestionsPrompt(
    context.uploadedFile?.type === "text/csv"
  );
  const autocompletePrompt = generateAutocompleteSuggestionsPrompt(
    context.uploadedFile?.type === "text/csv"
  );

  // Proceed should always be available at this step
  useEffect(() => {
    setProceedAvailable(true);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <p>
          The app uses three kinds of LLM suggestions. Each type has its own prompt and is triggered at a different moment in the workflow.
          The prompts can be reviewed below for transparency, but unfortunately they can not be edited. However, in the next step, 
          you will be able to add custom coding guidelines that will be included to all prompts between the TASK and USER'S CODING STYLE sections.
          </p>
        <ol className="flex max-w-[80%] flex-col gap-3 list-decimal list-inside marker:font-bold">
          <li>
            <b>Highlight suggestions:</b> These suggestions propose the next passage to highlight, together with 1-5 possible codes for that passage.
            A fetch for highlight suggestions is triggered when you finish editing the codes of the previous passage, or when you click on an uncoded section in the data.
          </li>
          <li>
            <b>Initial code suggestions:</b> These suggestions provide a complete coding for a specific passage. These suggestions appear in the UI when a code is being
            typed for a passage, but nothing has been typed yet (hence the name "initial code suggestions").
            A code suggestions fetch is triggered when a code in the UI gets activated.
          </li>
          <li>
            <b>Autocomplete suggestions:</b> These suggestions provide a broad set of possible codes for the passage that is currently being coded. These suggestions 
            can contain multiple phrasings of conceptually similar ideas to maximize autocomplete matches during code editing. 
            Autocomplete suggestions are triggered at the same time as code suggestions.
          </li>
        </ol>
      </div>
      <div className="flex items-center gap-2 pt-2">
        <span className="whitespace-nowrap pr-2">Select prompt to review:</span>
        <select
          name="reviewedPrompt"
          className="bg-transparent border border-outline rounded-sm pl-1 min-w-[100px] max-w-[300px] w-full truncate"
          value={reviewedPromptType}
          onChange={(e) => setReviewedPromptType(e.target.value as PromptType)}
        >
          {promptTypes.map((reviewedPrompt) => (
            <option key={reviewedPrompt} value={reviewedPrompt}>
              {reviewedPrompt[0].toUpperCase() +
                reviewedPrompt.slice(1).toLowerCase() +
                " suggestions"}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col bg-slate-200 rounded-md">
        <pre className="whitespace-pre-wrap break-words px-10 pt-1 pb-7">
          {reviewedPromptType === "highlight"
            ? highlightPrompt
            : reviewedPromptType === "code"
            ? codePrompt
            : autocompletePrompt}
        </pre>
      </div>
    </div>
  );
};

export default PromptReviewCardContent;
