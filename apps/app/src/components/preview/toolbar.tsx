import {
  isElementSelectionEnabledAtom,
  isIframeLoadedAtom,
} from "@/lib/workbench/atoms";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Input } from "@firebuzz/ui/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
  AlertTriangle,
  Loader2,
  Maximize,
  MousePointerClick,
  RefreshCcw,
} from "@firebuzz/ui/icons/lucide";
import { reloadPreview } from "@webcontainer/api";
import { useAtom, useAtomValue } from "jotai";

export const Toolbar = ({
  url,
  iframeRef,
}: {
  url: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}) => {
  const handleRefresh = () => {
    if (iframeRef?.current) {
      reloadPreview(iframeRef.current, 500);
    }
  };

  const isIframeLoaded = useAtomValue(isIframeLoadedAtom);
  const [isElementSelectionEnabled, setIsElementSelectionEnabled] = useAtom(
    isElementSelectionEnabledAtom
  );

  // Toggle element selection and send message to iframe
  const toggleElementSelection = () => {
    const newValue = !isElementSelectionEnabled;
    setIsElementSelectionEnabled(newValue);

    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: "set-element-selection",
          enabled: newValue,
        },
        "*"
      );
    }
  };

  return (
    <div className="px-2 border-b h-10 flex items-center gap-2">
      {/* Refresh */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            disabled={!isIframeLoaded}
            onClick={handleRefresh}
            variant="ghost"
            size="icon"
            className="!size-8"
          >
            {isIframeLoaded ? (
              <RefreshCcw className="size-3" />
            ) : (
              <Loader2 className="size-3 animate-spin" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Refresh</TooltipContent>
      </Tooltip>
      {/* URL Bar */}
      <Input
        readOnly
        placeholder="https://www.firebuzz.ai"
        className="w-full bg-muted border-none rounded-lg !h-6 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent outline-none"
        value={url}
      />
      {/* Right Bar */}
      <div className="flex items-center gap-0.5">
        {/* Error Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="!size-6">
              <AlertTriangle className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Error</TooltipContent>
        </Tooltip>
        {/* Select Element */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isElementSelectionEnabled ? "default" : "ghost"}
              size="icon"
              className="!size-6"
              onClick={toggleElementSelection}
              type="button"
              aria-pressed={isElementSelectionEnabled}
            >
              <MousePointerClick className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {isElementSelectionEnabled
              ? "Disable Element Selection"
              : "Enable Element Selection"}
          </TooltipContent>
        </Tooltip>
        {/* Fullscreen Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="!size-6"
              type="button"
            >
              <Maximize className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Fullscreen</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};
