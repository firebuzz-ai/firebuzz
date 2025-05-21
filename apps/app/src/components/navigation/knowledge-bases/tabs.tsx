"use client";

import { useNewDocumentModal } from "@/app/(workspace)/(dashboard)/storage/documents/_components/modals/new-document/use-new-document-modal";
import { useNewKnowledgeBaseModal } from "@/hooks/ui/use-new-knowledgebase-modal";
import { useNewMemoryItem } from "@/hooks/ui/use-new-memory-item";
import { useSheet } from "@/hooks/ui/use-sheet";
import type { Id } from "@firebuzz/convex";
import {
  AnimatedTabs,
  type TabItem,
} from "@firebuzz/ui/components/ui/animated-tabs";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { ChevronDown, Pencil, Plus, Upload } from "@firebuzz/ui/icons/lucide";
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
  const { setState: setNewDocumentModalState } = useNewDocumentModal();
  const [, setNewMemoryItemState] = useNewMemoryItem();

  const openNewMemoryItemModal = () => {
    setNewMemoryItemState({
      createMemoryItem: true,
      knowledgeBase: id,
    });
  };

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
          <DropdownMenu>
            <DropdownMenuTrigger className="group" asChild>
              <Button variant="outline" className="h-8 !p-0">
                <div className="flex items-center gap-2 pl-3">
                  <Plus className="!size-3.5" /> New Memory Item
                </div>
                <div className="flex items-center justify-center h-full pl-2 pr-2 border-l">
                  <ChevronDown className="transition-transform duration-100 ease-in-out !size-3.5 group-aria-expanded:rotate-180" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="bottom"
              align="end"
              sideOffset={10}
              className="w-[--radix-dropdown-menu-trigger-width]"
            >
              <DropdownMenuItem
                onClick={() => {
                  if (id) {
                    setNewDocumentModalState({
                      isOpen: true,
                      isKnowledgeBaseEnabled: true,
                      selectedKnowledgeBase: id,
                      files: [],
                    });
                  }
                }}
              >
                <Upload className="!size-3.5" />
                Upload Document
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openNewMemoryItemModal}>
                <Pencil className="!size-3.5" />
                Write a New
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
