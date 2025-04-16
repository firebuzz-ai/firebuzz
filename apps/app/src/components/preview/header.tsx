import { useTwoPanelsLayout } from "@/hooks/ui/use-two-panels-layout";
import {
  isElementSelectionEnabledAtom,
  selectedElementAtom,
} from "@/lib/workbench/atoms";
import type { Id } from "@firebuzz/convex/nextjs";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import { ChevronsRight } from "@firebuzz/ui/icons/lucide";
import { useSetAtom } from "jotai";
import { useParams } from "next/navigation";
import { CreateVariantButton } from "./create-variant-button";
import { PublishButton } from "./publish-button";
import { SettingsButton } from "./settings-button";

export function Header() {
  const { id: landingPageId } = useParams<{ id: Id<"landingPages"> }>();

  const { closeRightPanel } = useTwoPanelsLayout();
  const setSelectedElement = useSetAtom(selectedElementAtom);
  const setIsElementSelectionEnabled = useSetAtom(
    isElementSelectionEnabledAtom
  );

  return (
    <div className="flex items-center justify-between px-2 py-3 border-b">
      {/* Left Part */}
      <div className="flex items-center gap-2">
        <Button
          onClick={() => {
            setSelectedElement(null);
            setIsElementSelectionEnabled(false);
            closeRightPanel();
          }}
          variant="ghost"
          className="w-8 h-8"
        >
          <ChevronsRight className="size-3" />
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Preview</Badge>
        </div>
      </div>
      {/* Right Part */}
      <div className="flex items-center">
        <div className="flex items-center gap-0.5">
          <CreateVariantButton landingPageId={landingPageId} />
          <SettingsButton landingPageId={landingPageId} />
        </div>
        <Separator orientation="vertical" className="h-4 ml-2 mr-4" />
        <PublishButton landingPageId={landingPageId} />
      </div>
    </div>
  );
}
