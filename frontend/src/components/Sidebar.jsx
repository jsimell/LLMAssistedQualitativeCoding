import StepConnectorLine from "./StepConnectorLine"
import StepIndicator from "./StepIndicator"

const Sidebar = ({ stepIdx }) => {
  return (
    <div className='flex h-full'>
      <div className="flex flex-col gap-6 h-full p-12 bg-container">
        <StepIndicator label={"Upload Data"} idx={1}/>
        <StepIndicator label={"Access OpenAI API"} idx={2}/>
        <StepIndicator label={"Research Question"} idx={3}/>
        <StepIndicator label={"Data Coding"} idx={4}/>
        <StepIndicator label={"Summary of Results"} idx={5}/>
        <StepIndicator label={"Export Data"} idx={6}/>
      </div>
    </div>
  );
}

export default Sidebar;