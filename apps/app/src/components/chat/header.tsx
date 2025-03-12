import { useTwoPanelsLayout } from "@/hooks/ui/use-two-panels-layout";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { ChevronsLeft } from "@firebuzz/ui/icons/lucide";
export function ChatHeader({ title, type }: { title: string; type: string }) {
  const { openRightPanel, isRightPanelClosing, isRightPanelOpen } =
    useTwoPanelsLayout();
  return (
    <div className="flex items-center justify-between px-2 border-b h-10">
      <div className="flex items-center gap-2">
        <Badge variant="outline">{type}</Badge>
        <div>{title}</div>
      </div>
      <div>
        {!isRightPanelClosing && !isRightPanelOpen && (
          <Button onClick={openRightPanel} variant="ghost" className="h-8 w-8">
            <ChevronsLeft className="size-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
