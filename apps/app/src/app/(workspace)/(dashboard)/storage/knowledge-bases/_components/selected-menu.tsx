"use client";

import {
  ConvexError,
  type Id,
  api,
  useCachedRichQuery,
  useMutation,
} from "@firebuzz/convex";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  Copy,
  CornerDownRight,
  Square,
  Trash2,
} from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { type Dispatch, type SetStateAction, useState } from "react";

interface SelectedMenuProps {
  selections: Id<"memoizedDocuments">[];
  setSelections: Dispatch<SetStateAction<Id<"memoizedDocuments">[]>>;
  totalCount: number;
  currentKnowledgeBaseId?: Id<"knowledgeBases">; // Optional, as it might not always be relevant or available
}

export const SelectedMenu = ({
  selections,
  setSelections,
  totalCount,
  currentKnowledgeBaseId,
}: SelectedMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedCount = selections.length;

  const { data: knowledgeBases } = useCachedRichQuery(
    api.collections.storage.knowledgeBases.queries.getAll,
    {
      showHidden: true, // To allow moving/duplicating to hidden KBs
    }
  );

  const deselectAll = () => {
    setIsOpen(false);
    setSelections([]);
  };

  // Mutations for memoized documents
  const deleteMemoizedDocumentsMutation = useMutation(
    api.collections.storage.documents.memoized.mutations.deletePermanentMultiple // Assuming this mutation exists or will be created for bulk operations
  );
  const moveToKnowledgeBaseMutation = useMutation(
    api.collections.storage.documents.memoized.mutations.moveToKnowledgeBase
  );
  const duplicateToKnowledgeBaseMutation = useMutation(
    api.collections.storage.documents.memoized.mutations
      .duplicateToKnowledgeBase
  );

  const handleDelete = async () => {
    if (selections.length === 0) return;
    try {
      toast.loading("Deleting memories...", {
        description: "This may take a few seconds...",
        id: "delete-memories",
      });
      // Assuming deletePermanentMultiple takes an array of memoizedDocumentIds
      await deleteMemoizedDocumentsMutation({ ids: selections });
      setSelections([]);
      toast.success("Memories Deleted", {
        description: "The selected memories have been permanently deleted.",
        id: "delete-memories",
      });
    } catch (error) {
      console.error("Error deleting memories:", error);
      const errorMessage =
        error instanceof ConvexError ? error.data : "Please try again later.";
      toast.error("Failed to delete memories", {
        description: errorMessage,
        id: "delete-memories",
      });
    }
  };

  const handleMoveToKnowledgeBase = async (
    targetKnowledgeBaseId: Id<"knowledgeBases">
  ) => {
    if (selections.length === 0) return;
    try {
      toast.loading("Moving memories...", {
        description: "This may take a few seconds...",
        id: "move-memories",
      });
      for (const memoizedDocumentId of selections) {
        await moveToKnowledgeBaseMutation({
          memoizedDocumentId,
          knowledgeBaseId: targetKnowledgeBaseId,
        });
      }
      setSelections([]);
      toast.success("Memories Moved", {
        description: "The selected memories have been moved.",
        id: "move-memories",
      });
    } catch (error) {
      console.error("Error moving memories:", error);
      const errorMessage =
        error instanceof ConvexError ? error.data : "Please try again later.";
      toast.error("Failed to move memories", {
        description: errorMessage,
        id: "move-memories",
      });
    }
  };

  const handleDuplicateToKnowledgeBase = async (
    targetKnowledgeBaseId: Id<"knowledgeBases">
  ) => {
    if (selections.length === 0) return;
    try {
      toast.loading("Duplicating memories...", {
        description: "This may take a few seconds...",
        id: "duplicate-memories",
      });
      for (const memoizedDocumentId of selections) {
        await duplicateToKnowledgeBaseMutation({
          memoizedDocumentId,
          knowledgeBaseId: targetKnowledgeBaseId,
        });
      }
      // Not clearing selections on duplicate as the originals are still there
      toast.success("Memories Duplicated", {
        description: "The selected memories have been duplicated.",
        id: "duplicate-memories",
      });
    } catch (error) {
      console.error("Error duplicating memories:", error);
      const errorMessage =
        error instanceof ConvexError ? error.data : "Please try again later.";
      toast.error("Failed to duplicate memories", {
        description: errorMessage,
        id: "duplicate-memories",
      });
    }
  };

  return (
    <AnimatePresence>
      {selectedCount > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{
            opacity: 0,
            y: 20,
            transition: { duration: 0.1, ease: "easeInOut" },
          }}
          className="absolute left-0 right-0 z-20 flex items-center justify-center p-2 rounded-md pointer-events-none select-none bottom-10"
        >
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger className="border rounded-md pointer-events-auto bg-background hover:bg-background border-border">
              <div className="flex items-center gap-1 pl-4 pr-2">
                <div className="relative flex items-center justify-center size-5">
                  <svg className="rotate-[-90deg]" viewBox="0 0 32 32">
                    <circle
                      stroke="hsl(var(--brand)/0.2)"
                      strokeWidth={8}
                      fill="none"
                      r="12"
                      cx="16"
                      cy="16"
                    />
                    <motion.circle
                      initial={{ strokeDashoffset: 75.4 }}
                      animate={{
                        strokeDashoffset:
                          75.4 * (1 - selectedCount / totalCount),
                      }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      stroke="hsl(var(--brand))"
                      strokeWidth={8}
                      fill="none"
                      r="12"
                      cx="16"
                      cy="16"
                      strokeDasharray="75.4"
                      className="origin-center"
                    />
                  </svg>
                </div>
                <div className="w-full text-sm font-medium text-brand">
                  Selected{" "}
                  <span className="text-xs text-brand/50 tabular-nums">
                    ({selectedCount}) of {totalCount}
                  </span>
                </div>
                <div className="py-2 pl-2 border-l border-border">
                  {isOpen ? (
                    <ChevronUpIcon className="w-3 h-3" />
                  ) : (
                    <ChevronDownIcon className="w-3 h-3" />
                  )}
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={selections.length === 0}
                >
                  <Trash2 className="!size-3.5" />
                  Delete
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger disabled={selections.length === 0}>
                    <CornerDownRight className="!size-3.5" />
                    Move to
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent sideOffset={10}>
                    {knowledgeBases?.map((kb) => (
                      <DropdownMenuItem
                        key={kb._id}
                        disabled={
                          kb._id === currentKnowledgeBaseId ||
                          selections.length === 0
                        }
                        onSelect={() => handleMoveToKnowledgeBase(kb._id)}
                      >
                        {kb.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger disabled={selections.length === 0}>
                    <Copy className="!size-3.5" />
                    Duplicate to
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent sideOffset={10}>
                    {knowledgeBases?.map((kb) => (
                      <DropdownMenuItem
                        key={kb._id}
                        disabled={
                          kb._id === currentKnowledgeBaseId || // Optionally allow duplicating to the same KB if logic supports it
                          selections.length === 0
                        }
                        onSelect={() => handleDuplicateToKnowledgeBase(kb._id)}
                      >
                        {kb.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={deselectAll}>
                  <Square className="!size-3.5" />
                  Deselect All
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
