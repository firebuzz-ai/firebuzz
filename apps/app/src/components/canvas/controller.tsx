import {
  Hand,
  Maximize,
  Minus,
  MousePointer,
  Plus,
  StickyNote,
} from "@firebuzz/ui/icons/lucide";

import {
  Panel,
  type PanelProps,
  useKeyPress,
  useReactFlow,
  useViewport,
} from "@xyflow/react";

import { Button } from "@firebuzz/ui/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipShortcut,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { cn } from "@firebuzz/ui/lib/utils";
import { createContext, useEffect, useState } from "react";
import { useCanvasController } from "./provider";

type ControllerProps = Omit<PanelProps, "children">;

interface ControllerContextValue {
  mode: "select" | "drag";
  setMode: (mode: "select" | "drag") => void;
  isAddingNote: boolean;
  setIsAddingNote: (isAdding: boolean) => void;
}

const controllerContext = createContext<ControllerContextValue | null>(null);

export const ControllerProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [mode, setMode] = useState<"select" | "drag">("select");
  const [isAddingNote, setIsAddingNote] = useState(false);

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

export function Controller({ className, ...props }: ControllerProps) {
  const { zoom } = useViewport();
  const { zoomTo, zoomIn, zoomOut, fitView } = useReactFlow();
  const { mode, setMode, isAddingNote, setIsAddingNote } =
    useCanvasController();
  const zoomOutPressed = useKeyPress(["Meta+ArrowDown", "Strg+ArrowDown"]);
  const zoomInPressed = useKeyPress(["Meta+ArrowUp", "Strg+ArrowUp"]);
  const resetZoomPressed = useKeyPress(["Meta+0", "Strg+0"]);
  const fitViewPressed = useKeyPress(["Meta+f", "Strg+f"]);
  const addNotePressed = useKeyPress(["Meta+4", "Strg+4"]);

  useEffect(() => {
    if (zoomOutPressed) {
      zoomOut({ duration: 300 });
    }
    if (zoomInPressed) {
      zoomIn({ duration: 300 });
    }
    if (resetZoomPressed) {
      zoomTo(1, { duration: 300 });
    }
    if (fitViewPressed) {
      fitView({ duration: 300, maxZoom: 2 });
    }
    if (addNotePressed && mode !== "drag") {
      // Use center of viewport for keyboard shortcut
      const bounds = document
        .querySelector(".react-flow")
        ?.getBoundingClientRect();
      if (bounds) {
        window.mouseX = bounds.x + bounds.width / 2;
        window.mouseY = bounds.y + bounds.height / 2;
      }
      setIsAddingNote(true);
    }
  }, [
    zoomOutPressed,
    zoomInPressed,
    resetZoomPressed,
    fitViewPressed,
    addNotePressed,
    mode,
    fitView,
    zoomIn,
    zoomOut,
    zoomTo,
    setIsAddingNote,
  ]);

  const handleAddNoteClick = (event: React.MouseEvent) => {
    // Store mouse position globally
    window.mouseX = event.clientX;
    window.mouseY = event.clientY;
    setIsAddingNote(true);
  };

  return (
    <Panel
      position="bottom-center"
      className={cn(
        "flex items-stretch justify-between rounded-lg border dark:bg-muted bg-background shadow-md",
        className
      )}
      {...props}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            className="size-8 border-none rounded-none"
            onClick={() => zoomOut({ duration: 300 })}
          >
            <Minus className="size-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent sideOffset={10}>
          Zoom out <TooltipShortcut>⌘ ↓</TooltipShortcut>
        </TooltipContent>
      </Tooltip>
      <div className="h-8 w-px bg-border" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            className="size-8 border-none rounded-none"
            onClick={() => zoomIn({ duration: 300 })}
          >
            <Plus className="size-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent sideOffset={10}>
          Zoom in <TooltipShortcut>⌘ ↑</TooltipShortcut>
        </TooltipContent>
      </Tooltip>
      <div className="h-8 w-px bg-border" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="min-w-20 tabular-nums border-none h-8 rounded-none"
            variant="ghost"
            onClick={() => zoomTo(1, { duration: 300 })}
          >
            {(100 * zoom).toFixed(0)}%
          </Button>
        </TooltipTrigger>
        <TooltipContent sideOffset={10}>
          Reset zoom <TooltipShortcut>⌘ 0</TooltipShortcut>
        </TooltipContent>
      </Tooltip>
      <div className="h-8 w-px bg-border" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            className="size-8 rounded-none border-none"
            onClick={() => fitView({ duration: 300, maxZoom: 2 })}
          >
            <Maximize className="size-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent sideOffset={10}>
          Fit view <TooltipShortcut>⌘ F</TooltipShortcut>
        </TooltipContent>
      </Tooltip>
      <div className="h-8 w-px bg-border" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "size-8 rounded-none border-none",
              mode === "select" && "text-brand hover:text-brand"
            )}
            onClick={() => setMode("select")}
          >
            <MousePointer className="size-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent sideOffset={10}>
          Select Mode <TooltipShortcut>V</TooltipShortcut>
        </TooltipContent>
      </Tooltip>
      <div className="h-8 w-px bg-border" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "size-8 rounded-none border-none",
              mode === "drag" && "text-brand hover:text-brand"
            )}
            onClick={() => setMode("drag")}
          >
            <Hand className="size-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent sideOffset={10}>
          Drag Mode <TooltipShortcut>H</TooltipShortcut>
        </TooltipContent>
      </Tooltip>
      <div className="h-8 w-px bg-border" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "size-8 rounded-none border-none",
              isAddingNote && "text-brand hover:text-brand"
            )}
            onClick={handleAddNoteClick}
            disabled={mode === "drag"}
          >
            <StickyNote className="size-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent sideOffset={10}>
          Add Note <TooltipShortcut>⌘ +</TooltipShortcut>
        </TooltipContent>
      </Tooltip>
    </Panel>
  );
}
