import { useState } from 'react'
import { useContext } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import WorkspaceCard from './components/WorkspaceCard'
import DataUploadCardContent from './components/cardContents/DataUploadCardContent'
import AccessAPICardContent from './components/cardContents/AccessAPICardContent'
import { WorkflowContext } from './context/WorkflowContext'
import ResearchQuestionsCardContent from './components/cardContents/ResearchQuestionsCardContent'
import CodingCardContent from './components/cardContents/CodingCardContent'
import ResultsCardContent from './components/cardContents/ResultsCardContent'
import ExportCardContent from './components/cardContents/ExportCardContent'

function App() {
  const { currentStep } = useContext(WorkflowContext);

  return (
    <div className='flex flex-col w-screen h-screen'>
      <Header />
      <div className='flex w-full h-full'>
          <Sidebar/>
          <div className='flex w-full h-full p-9 bg-background'>
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
              <WorkspaceCard title="Step 3: Research Question">
                <ResearchQuestionsCardContent />
              </WorkspaceCard>
            )}
            {currentStep === 4 && (
              <WorkspaceCard title="Step 4: Data Coding">
                <CodingCardContent />
              </WorkspaceCard>
            )}
            {currentStep === 5 && (
              <WorkspaceCard title="Step 5: Summary of Results">
                <ResultsCardContent />
              </WorkspaceCard>
            )}
            {currentStep === 6 && (
              <WorkspaceCard title="Step 6: Export Data">
                <ExportCardContent />
              </WorkspaceCard>
            )}
          </div>
      </div>
    </div>
  )
}

export default App
