import { useState } from 'react'
import { useContext } from 'react'
import { WorkflowContext } from './context/WorkflowContext'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Workspace from './components/Workspace'


function App() {
  const { currentStep } = useContext(WorkflowContext);

  return (
    <div className='flex flex-col w-screen h-screen'>
      <Header />
      <div className='flex flex-1'>
          <Sidebar/>
          <main className='flex-1 p-9 bg-background'>
            <Workspace/>
          </main>
      </div>
    </div>
  )
}

export default App
