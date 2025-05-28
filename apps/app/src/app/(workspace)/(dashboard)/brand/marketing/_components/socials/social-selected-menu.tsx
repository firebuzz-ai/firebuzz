"use client";

import { ConvexError, type Id, api, useMutation } from "@firebuzz/convex";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  Copy,
  Square,
  Trash2,
} from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { type Dispatch, type SetStateAction, useState } from "react";

interface SocialSelectedMenuProps {
  selections: Id<"socials">[];
  setSelections: Dispatch<SetStateAction<Id<"socials">[]>>;
  totalCount: number;
}

export const SocialSelectedMenu = ({
  selections,
  setSelections,
  totalCount,
}: SocialSelectedMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedCount = selections.length;

  const deselectAll = () => {
    setIsOpen(false);
    setSelections([]);
  };

  // Mutations for socials
  const deleteSocialsMutation = useMutation(
    api.collections.brands.socials.mutations.deletePermanentMany
  );
  const duplicateSocialsMutation = useMutation(
    api.collections.brands.socials.mutations.duplicateMany
  );

  const handleDelete = async () => {
    if (selections.length === 0) return;
    try {
      toast.loading("Deleting social accounts...", {
        description: "This may take a few seconds...",
        id: "delete-socials",
      });
      await deleteSocialsMutation({ ids: selections });
      setSelections([]);
      toast.success("Social Accounts Deleted", {
        description:
          "The selected social accounts have been permanently deleted.",
        id: "delete-socials",
      });
    } catch (error) {
      console.error("Error deleting social accounts:", error);
      const errorMessage =
        error instanceof ConvexError ? error.data : "Please try again later.";
      toast.error("Failed to delete social accounts", {
        description: errorMessage,
        id: "delete-socials",
      });
    }
  };

  const handleDuplicate = async () => {
    if (selections.length === 0) return;
    try {
      toast.loading("Duplicating social accounts...", {
        description: "This may take a few seconds...",
        id: "duplicate-socials",
      });
      await duplicateSocialsMutation({ ids: selections });
      // Not clearing selections on duplicate as the originals are still there
      toast.success("Social Accounts Duplicated", {
        description: "The selected social accounts have been duplicated.",
        id: "duplicate-socials",
      });
    } catch (error) {
      console.error("Error duplicating social accounts:", error);
      const errorMessage =
        error instanceof ConvexError ? error.data : "Please try again later.";
      toast.error("Failed to duplicate social accounts", {
        description: errorMessage,
        id: "duplicate-socials",
      });
    }
  };

  return (
    <AnimatePresence>
      {selectedCount > 0 && totalCount > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{
            opacity: 0,
            y: 20,
            transition: { duration: 0.1, ease: "easeInOut" },
          }}
          className="absolute left-0 right-0 z-20 flex items-center justify-center p-2 rounded-md pointer-events-none select-none bottom-5"
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
                <DropdownMenuItem
                  onClick={handleDuplicate}
                  disabled={selections.length === 0}
                >
                  <Copy className="!size-3.5" />
                  Duplicate
                </DropdownMenuItem>
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
