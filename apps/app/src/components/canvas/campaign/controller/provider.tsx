"use client";

import {
  type Dispatch,
  type SetStateAction,
  createContext,
  useContext,
  useState,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";

export const controllerContext = createContext<{
  mode: "select" | "drag";
  isAddingNote: boolean;
  setIsAddingNote: Dispatch<SetStateAction<boolean>>;
  setMode: (mode: "select" | "drag") => void;
}>({
  mode: "select",
  isAddingNote: false,
  setIsAddingNote: () => {},
  setMode: () => {},
});

const ControllerProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<"select" | "drag">("select");
  const [isAddingNote, setIsAddingNote] = useState(false);

  useHotkeys("v", () => setMode("select"), {});
  useHotkeys("h", () => setMode("drag"), {});

  return (
    <controllerContext.Provider
      value={{
        mode,
        setMode,
        isAddingNote,
        setIsAddingNote,
      }}
    >
      {children}
    </controllerContext.Provider>
  );
};

export const useCanvasController = () => {
  const ctx = useContext(controllerContext);
  if (!ctx) {
    throw new Error(
      "useCanvasController must be used within a ControllerProvider"
    );
  }
  return ctx;
};

export const CanvasControllerProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <ControllerProvider>{children}</ControllerProvider>;
};
