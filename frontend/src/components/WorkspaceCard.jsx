import WorkspaceCardHeader from "./WorkspaceCardHeader";

const WorkspaceCard = ({ title, children }) => {
  return (
    <div className="flex flex-col w-full h-full border-2 rounded-3xl border-outline">
      <WorkspaceCardHeader title={title}></WorkspaceCardHeader>
      <div className="flex flex-col w-full h-full items-center bg-background text-onBackground text-base rounded-b-3xl">
        {children}
      </div>
    </div>
  );
}

export default WorkspaceCard;