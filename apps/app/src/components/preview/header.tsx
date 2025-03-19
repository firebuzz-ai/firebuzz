import { useTwoPanelsLayout } from "@/hooks/ui/use-two-panels-layout";
import {
  isElementSelectionEnabledAtom,
  selectedElementAtom,
} from "@/lib/workbench/atoms";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { ChevronsRight } from "@firebuzz/ui/icons/lucide";
import { useSetAtom } from "jotai";
import { useState } from "react";

export function Header({ publish }: { publish: () => Promise<void> }) {
  const [isPublishing, setIsPublishing] = useState(false);
  const { closeRightPanel } = useTwoPanelsLayout();
  const setSelectedElement = useSetAtom(selectedElementAtom);
  const setIsElementSelectionEnabled = useSetAtom(
    isElementSelectionEnabledAtom
  );
  return (
    <div className="flex items-center justify-between px-2 border-b h-10">
      {/* Left Part */}
      <div className="flex items-center gap-2">
        <Button
          onClick={() => {
            setSelectedElement(null);
            setIsElementSelectionEnabled(false);
            closeRightPanel();
          }}
          variant="ghost"
          className="h-8 w-8"
        >
          <ChevronsRight className="size-3" />
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Preview</Badge>
        </div>
      </div>
      {/* Right Part */}
      <div className="flex items-center gap-2">
        <Button
          className="h-6"
          onClick={async () => {
            setIsPublishing(true);
            await publish();
            setIsPublishing(false);
          }}
        >
          {isPublishing ? <Spinner size="xs" /> : "Publish"}
        </Button>
      </div>
    </div>
  );
}
