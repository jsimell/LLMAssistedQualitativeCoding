interface HoverMessageProps {
  children: React.ReactNode;
  className?: string; // Extra classes for positioning
}

const HoverMessage = ({ children, className }: HoverMessageProps) => {
  return (
    <div className={`rounded-sm p-4 border border-outline bg-gray-200 shadow-md text-md z-10 ${className ?? ""}`}>
      {children}
    </div>
  );
};

export default HoverMessage;