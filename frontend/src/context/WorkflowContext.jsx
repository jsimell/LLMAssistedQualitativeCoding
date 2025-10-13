import React, { createContext, useState } from "react";

export const WorkflowContext = createContext();

export function WorkflowProvider({ children }) {

  // Global states
  const [apiKey, setApiKey] = useState(null);
  const [researchQuestions, setResearchQuestions] = useState([]);
  const [contextInfo, setContextInfo] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);    // Stores the name and size of the uploaded file
  const [rawData, setRawData] = useState("");           // Entire imported text
  const [codedData, setCodedData] = useState([]);       // Data with codes applied
  const [codebook, setCodebook] = useState([], []);         // Codes and their definitions
  const [aiSuggestionsEnabled, setAiSuggestionsEnabled] = useState(true); // Global toggle
  const [currentStep, setCurrentStep] = useState(1);    // The current step of the workflow
  const [proceedAvailable, setProceedAvailable] = useState(false);  // Defines whether or not user can currently proceed to the next step

  // Combine all states + updaters into one object
  const value = {
    apiKey, setApiKey,
    researchQuestions, setResearchQuestions,
    contextInfo, setContextInfo,
    rawData, setRawData,
    codedData, setCodedData,
    codebook, setCodebook,
    aiSuggestionsEnabled, setAiSuggestionsEnabled,
    currentStep, setCurrentStep,
    proceedAvailable, setProceedAvailable,
    fileInfo, setFileInfo
  };

  // Make the states available to all children components
  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
}