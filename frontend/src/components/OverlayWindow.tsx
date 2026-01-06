import React, { useEffect } from "react";

interface OverlayWindowProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm?: () => void; // Function for confirmation use case
  widthClass?: string; // Optional width style class for the overlay window
  heightClass?: string; // Optional height style class for the overlay window
  children?: React.ReactNode;
}

const OverlayWindow: React.FC<OverlayWindowProps> = ({
  isVisible,
  onClose,
  onConfirm,
  widthClass = "max-w-[80vw]",
  heightClass = "max-h-[80vh]",
  children,
}) => {
  // Lock background scroll while the overlay is visible
  useEffect(() => {
    if (!isVisible) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      className="
        fixed inset-0 z-50
        flex items-center justify-center
        bg-black/40
        backdrop-blur-sm
      "
      onClick={onClose}
    >
      <div
        className={`
          bg-background rounded-lg shadow-xl w-fit h-fit overflow-y-auto ${widthClass} ${heightClass}
        `} 
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the window
      >
        {children}
      </div>
    </div>
  );
};

export default OverlayWindow;