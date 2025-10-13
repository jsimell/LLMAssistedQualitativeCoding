import { useState, useRef, useContext } from "react";
import { WorkflowContext } from "../../context/WorkflowContext";
import { ExclamationTriangleIcon, ArrowRightIcon, ArrowLeftIcon, InformationCircleIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import Button from "../Button";
import InfoBox from "../InfoBox";

const AccessAPICardContent = () => {
  const [currentInput, setCurrentInput] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const { apiKey, setApiKey, proceedAvailable, setProceedAvailable, currentStep, setCurrentStep } = useContext(WorkflowContext);
  const formRef = useRef(null);

  // Set proceed button disabled until a valid api key is entered
  setProceedAvailable(false);

  const handleSubmit = () => {
    setIsValidating(true);
    setIsSubmitted(true);
    setIsValid(false);
    if (currentInput) {
      // TODO: check validity of the key in backend

      // if valid
      setIsValid(true); // for testing
      setApiKey(currentInput);
      console.log("Saved OpenAI API key to the context component.");
    }
  }

  return (
    <div className="flex flex-col w-full h-full items-center gap-4 pt-12 pb-6 px-6.5">
      <div className="flex items-center justify-between max-w-xl w-full gap-4">
        <form ref={formRef} onSubmit={handleSubmit} className="flex items-center gap-3 w-full">
          <label for="apiKey" className="text-nowrap">OpenAI API key:</label>
          <input 
            id="apiKey" 
            type="text" 
            onChange={(e) => setCurrentInput(e.value)}
            spellCheck="false" 
            className="border-1 w-full h-fit" 
          />
        </form>
        <Button label="Submit" onClick={handleSubmit} variant="tertiary"></Button>
      </div>
      {isSubmitted && isValidating && (
        <InfoBox msg="Validating API key..." icon={InformationCircleIcon} variant="neutral"></InfoBox>
      )}
      {isSubmitted && !isValidating && !isValid && (
        <InfoBox msg="Invalid API key" icon={ExclamationTriangleIcon} variant="error"></InfoBox>
      )}
      {isSubmitted && !isValidating && isValid && (
        <InfoBox msg="API key is valid" icon={CheckCircleIcon} variant="success"></InfoBox>
      )}
      <div className="flex w-full h-full items-end justify-between">
        <Button label="Previous step" icon={ArrowLeftIcon} iconPosition="start" onClick={() => setCurrentStep(currentStep - 1)} variant="primary"></Button>
        <Button label="Next step" icon={ArrowRightIcon} onClick={() => setCurrentStep(currentStep + 1)} variant={proceedAvailable ? "primary" : "disabled"}></Button>
      </div>
    </div>
  );
}

export default AccessAPICardContent;