import { useState } from "react";
import { Cog8ToothIcon, BookOpenIcon } from "@heroicons/react/24/solid";
import { BookOpenIcon as OutlineBookOpenIcon, Cog8ToothIcon as OutlineCog8ToothIcon } from "@heroicons/react/24/outline";

interface CodingSidePanelProps {
  preventCodeBlobDeactivationRef: React.RefObject<boolean>;
  children: React.ReactNode[]; // Expecting two children: settings and codebook
}

const CodingSidePanel = ({ preventCodeBlobDeactivationRef, children }: CodingSidePanelProps) => {
  const [showWindow, setShowWindow] = useState("settings"); // 'settings' | 'codebook'

  return (
    <div className="flex flex-col sticky top-31 items-center w-full h-fit rounded-lg border-1 border-outline max-h-[84vh] min-w-50 max-w-110">
      <div className="flex h-fit w-full items-center justify-around border-b border-outline bg-gray-200 rounded-t-lg text-primary">
        <div
          className={`flex justify-center pb-1.5 gap-2 pl-2 pr-4 pt-3.5 flex-1 rounded-t-lg hover:bg-primary/10 border-b-2 ${
            showWindow === "settings" ? "border-primary" : "cursor-pointer border-transparent"
          }`}
          onClick={() => setShowWindow("settings")}
          onMouseDown={() => {
            preventCodeBlobDeactivationRef.current = true;
          }}
          onMouseLeave={() => {
            preventCodeBlobDeactivationRef.current = false;
          }}
        >
          {showWindow === "settings" ? (
            <Cog8ToothIcon
              className={`size-6 text-primary`}
            />
          ) : (
            <OutlineCog8ToothIcon
              className={`size-6 text-gray-600`}
            />
          )}
          <p
            className={
              showWindow === "settings"
                ? "font-semibold"
                : "font-normal text-gray-600"
            }
          >
            Settings
          </p>
        </div>
        <div
          className={`flex justify-center pb-1.5 gap-2 pl-2 pr-4 pt-3.5 flex-1 rounded-t-lg hover:bg-primary/10 border-b-2 ${
            showWindow === "codebook" ? "border-primary" : "cursor-pointer border-transparent"
          }`}
          onClick={() => setShowWindow("codebook")}
          onMouseDown={() => {
            preventCodeBlobDeactivationRef.current = true;
          }}
          onMouseLeave={() => {
            preventCodeBlobDeactivationRef.current = false;
          }}
        >
          {showWindow === "codebook" ? (
            <BookOpenIcon
              className={`size-6 text-primary`}
            />
          ) : (
            <OutlineBookOpenIcon
              className={`size-6 text-gray-600`}
            />
          )}
          <p
            className={
              showWindow === "codebook"
                ? "font-semibold"
                : "font-normal text-gray-600"
            }
          >
            Codebook
          </p>
        </div>
      </div>
      <div className="overflow-y-auto">
        {showWindow === "settings" ? children[0] : children[1]}
      </div>
    </div>
  );
};

export default CodingSidePanel;
