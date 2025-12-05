import StepIndicator from "./StepIndicator"

const Sidebar = () => {
  return (
    <div className="flex flex-col gap-6 p-12 border-r-1 border-outline bg-container">
      <StepIndicator label={"Upload Data"} idx={1}/>
      <StepIndicator label={"Access OpenAI API"} idx={2}/>
      <StepIndicator label={"Research Context"} idx={3}/>
      <StepIndicator label={"Prompt Review"} idx={4}/>
      <StepIndicator label={"Data Coding"} idx={5}/>
      <StepIndicator label={"Export Results"} idx={6}/>
    </div>
  );
}

export default Sidebar;