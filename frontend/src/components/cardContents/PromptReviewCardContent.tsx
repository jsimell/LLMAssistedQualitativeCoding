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
  const { reviewedPromptType, setReviewedPromptType, setProceedAvailable } = context;

  const {
    generateHighlightSuggestionsPrompt,
    generateCodeSuggestionsPrompt,
    generateAutocompleteSuggestionPrompt,
  } = usePrompts();

  const highlightPrompt = generateHighlightSuggestionsPrompt(
    context.uploadedFile?.type === "text/csv",
    "<preceding text will be inserted here>",
    "<highlight search area will be inserted here>"
  );
  const codePrompt = generateCodeSuggestionsPrompt(
    context.uploadedFile?.type === "text/csv",
    "<the target passage will be inserted here>",
    "<target passage with context will be inserted here>",
    undefined
  );
  const autocompletePrompt = generateAutocompleteSuggestionPrompt(
    context.uploadedFile?.type === "text/csv",
    "<the current user input will be inserted here>",
    "PRECEDING TEXT HERE",
    "TRAILING TEXT HERE",
    undefined,
    undefined
  );

  // Proceed should always be available at this step
  useEffect(() => {
    setProceedAvailable(true);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5">
        <p className="max-w-[90%]">
          <b>NOTE:</b> This section is for review purposes only to improve transparency.
          Unfortunately the prompts can not be directly edited here. However, you can use
          this feature to see how your actions affect the prompts.
        </p>
        <h2 className="pt-5 font-semibold text-xl">Suggestion Types</h2>
        <p>
          The app uses three kinds of LLM suggestions. Each type has its own prompt and is
          triggered at a different moment in the workflow.
        </p>
        <ol className="flex max-w-[70%] flex-col gap-4 list-decimal list-inside marker:font-bold">
          <li>
            <b>Highlight suggestions:</b> These suggestions propose the next passage to
            highlight, together with an initial coding for the passage. A fetch for
            highlight suggestions is triggered when you finish editing the codes of the
            previous passage, or when you click on an uncoded section in the data, in
            which case the LLM searches for the first relevant passage starting from the
            beginning of that uncoded section.
          </li>
          <li>
            <b>Code suggestions:</b> These are the initial code suggestions that appear on
            the active code input when nothing has been typed in yet. A code suggestions
            fetch is triggered when a code input gets activated.
          </li>
          <li>
            <b>Autocomplete suggestions:</b> When you get stuck while typing in a new code, 
            an autocomplete suggestions fetch is triggered to help you complete your code.
          </li>
        </ol>
        <h2 className="pt-5 font-semibold text-xl">Utilized OpenAI Models</h2>
        <ul className="max-w-[75%] list-disc ml-4 marker:font-bold flex flex-col gap-3">
          <li>
            Code suggestions and autocomplete suggestions use the <b>GPT-4.1 Mini</b>{" "}
            model to balance performance and cost.
          </li>
          <li>
            Highlight suggestions use the <b>GPT-5.1</b> model, because smaller models
            (mini and nano models) tend to struggle with consistently finding the first
            relevant passage in the search area, and GPT-5 models tend to respond too
            slowly for this task. GPT-5.1 was chosen over GPT-4.1 due to lower input token
            costs, which is important in this use case where examples and context can
            increase prompt length significantly.
          </li>
        </ul>
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
