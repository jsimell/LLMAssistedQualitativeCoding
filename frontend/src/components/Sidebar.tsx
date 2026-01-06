import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import SmallButton from "./SmallButton";
import StepIndicator from "./StepIndicator"

interface SidebarProps {
  // Props to control collapse state from parent
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

const Sidebar = ({ isCollapsed, setIsCollapsed }: SidebarProps) => {
  return (
    <div className={`${isCollapsed ? "w-25 px-8 py-10" : "w-66 p-10"} fixed h-full flex flex-col items-center gap-6 border-r-1 border-outline bg-container`}>
      <div className={`flex w-full pb-5 ${isCollapsed ? "justify-center ml-1.5" : "justify-end -mr-10"}`}>
        {isCollapsed  
          ? <ChevronRightIcon className="size-10 pl-0.5 rounded-lg text-black hover:bg-gray-700/10 cursor-pointer stroke-2" onClick={() => setIsCollapsed(!isCollapsed)}></ChevronRightIcon>
          : <ChevronLeftIcon className="size-10 pr-0.5 rounded-lg text-black hover:bg-gray-700/10 cursor-pointer stroke-2" onClick={() => setIsCollapsed(!isCollapsed)}></ChevronLeftIcon>
        }
      </div>
      <StepIndicator label={"Upload Data"} idx={1} showLabels={!isCollapsed} />
      <StepIndicator label={"Access OpenAI API"} idx={2} showLabels={!isCollapsed} />
      <StepIndicator label={"Research Context"} idx={3} showLabels={!isCollapsed} />
      <StepIndicator label={"Prompt Review"} idx={4} showLabels={!isCollapsed} />
      <StepIndicator label={"Data Coding"} idx={5} showLabels={!isCollapsed} />
      <StepIndicator label={"Export Results"} idx={6} showLabels={!isCollapsed} />
    </div>
  );
}

export default Sidebar;