"use client";

import { useNewKnowledgeBaseModal } from "@/hooks/ui/use-new-knowledgebase-modal";
import { useSheet } from "@/hooks/ui/use-sheet";
import type { Id } from "@firebuzz/convex";
import {
  AnimatedTabs,
  type TabItem,
} from "@firebuzz/ui/components/ui/animated-tabs";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Pencil, Plus, Settings } from "@firebuzz/ui/icons/lucide";
import { usePathname } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";

interface KnowledgeBaseTabsProps {
  id: Id<"knowledgeBases"> | undefined;
  setId: Dispatch<SetStateAction<Id<"knowledgeBases"> | undefined>>;
  tabs: TabItem[];
}

export const KnowledgeBaseTabs = ({
  id,
  setId,
  tabs,
}: KnowledgeBaseTabsProps) => {
  const pathname = usePathname();
  const { setIsOpen: setIsSettingsSheetOpen } = useSheet(
    "knowledge-base-settings"
  );
  const [, setIsNewModalOpen] = useNewKnowledgeBaseModal();

  // Handle save
  const handleSave = async () => {};

  // Handle publish
  const handlePublish = async () => {};

  return (
    <div className="relative flex items-center justify-between px-2 border-b">
      {/* Tabs */}
      <div className="flex items-center gap-1">
        <AnimatedTabs
          tabs={tabs}
          value={id}
          onValueChange={(value) => setId(value as Id<"knowledgeBases">)}
          currentPath={pathname}
          indicatorPadding={0}
          tabsContainerClassName="flex items-center gap-2"
          withBorder={false}
          indicatorRelativeToParent
        />
        <div className="flex items-center gap-2">
          {/* Plus Button */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="bg-muted"
                size="iconXs"
                onClick={() => setIsNewModalOpen({ create: true })}
              >
                <Plus className="!size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              Create New
            </TooltipContent>
          </Tooltip>
          {/* Edit Button */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="bg-muted"
                size="iconXs"
                onClick={() => setIsSettingsSheetOpen(true)}
              >
                <Pencil className="!size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              Edit
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Plus className="!size-3.5" />
            New Document
            <ButtonShortcut>⌘S</ButtonShortcut>
          </Button>
          <Separator orientation="vertical" className="h-4" />
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button variant="outline" size="iconSm" onClick={handlePublish}>
                <Settings className="!size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="end" sideOffset={5}>
              Settings
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
