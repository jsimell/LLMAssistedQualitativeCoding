import SmallButton from "./SmallButton";

interface WorkspaceCardHeaderProps {
  title: string;
  buttonLabel?: string;
  buttonIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  buttonIconPosition?: "start" | "end";
  onButtonClick?: () => void;
}

const WorkspaceCardHeader = ({
  title,
  buttonLabel,
  buttonIcon,
  buttonIconPosition,
  onButtonClick,
}: WorkspaceCardHeaderProps) => {
  return (
    <div className="flex h-fit w-full items-center justify gap-8 px-6 py-5 border-b border-outline rounded-t-xl bg-container text-primary">
      <div className="text-3xl font-semibold">{title}</div>
      {buttonLabel && (
        <SmallButton
          label={buttonLabel}
          icon={buttonIcon}
          iconPosition={buttonIconPosition}
          onClick={onButtonClick ?? (() => {})}
          variant="tertiary"
        />
      )}
    </div>
  );
};

export default WorkspaceCardHeader;
