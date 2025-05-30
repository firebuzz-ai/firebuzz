import { type Id, api, useMutation } from "@firebuzz/convex";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import {
	Archive,
	ChevronDownIcon,
	ChevronUpIcon,
	RefreshCcw,
	Square,
	Trash2,
} from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { type Dispatch, type SetStateAction, useState } from "react";

interface SelectedMenuProps {
	selections: string[];
	setSelections: Dispatch<SetStateAction<string[]>>;
	totalCount: number;
}

export const SelectedMenu = ({
	selections,
	setSelections,
	totalCount,
}: SelectedMenuProps) => {
	const [isOpen, setIsOpen] = useState(false);
	const selectedCount = selections.length;

	const deselectAll = () => {
		setIsOpen(false);
		setSelections([]);
	};

	// Mutations
	const deleteMediaItems = useMutation(
		api.collections.storage.media.mutations.deleteTemporaryMultiple,
	);
	const archiveMediaItems = useMutation(
		api.collections.storage.media.mutations.archiveMultiple,
	);
	const restoreMediaItems = useMutation(
		api.collections.storage.media.mutations.restoreMultiple,
	);

	const handleDelete = async () => {
		try {
			toast.loading("Deleting media...", {
				description: "This may take a few seconds...",
				id: "delete-media",
			});
			await deleteMediaItems({ ids: selections as Id<"media">[] });
			setSelections([]);
			toast.success("Media Deleted", {
				description: "The media have been deleted from your storage.",
				id: "delete-media",
			});
		} catch (error) {
			console.error("Error deleting media:", error);
			toast.error("Failed to delete media", {
				description: "Please try again later.",
				id: "delete-media",
			});
		}
	};

	const handleArchive = async () => {
		try {
			toast.loading("Archiving media...", {
				description: "This may take a few seconds...",
				id: "archive-media",
			});
			await archiveMediaItems({ ids: selections as Id<"media">[] });
			setSelections([]);
			toast.success("Media Archived", {
				description: "The media have been archived.",
				id: "archive-media",
			});
		} catch (error) {
			console.error("Error archiving media:", error);
			toast.error("Failed to archive media", {
				description: "Please try again later.",
				id: "archive-media",
			});
		}
	};

	const handleRestore = async () => {
		try {
			toast.loading("Restoring media...", {
				description: "This may take a few seconds...",
				id: "restore-media",
			});
			await restoreMediaItems({ ids: selections as Id<"media">[] });
			setSelections([]);
			toast.success("Media Restored", {
				description: "The media have been restored.",
				id: "restore-media",
			});
		} catch (error) {
			console.error("Error restoring media:", error);
			toast.error("Failed to restore media", {
				description: "Please try again later.",
				id: "restore-media",
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
										{/* Background circle */}
										<circle
											stroke="hsl(var(--brand)/0.2)"
											strokeWidth={8}
											fill="none"
											r="12"
											cx="16"
											cy="16"
										/>
										{/* Progress circle */}
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
								<DropdownMenuItem onClick={handleDelete}>
									<Trash2 className="!size-3.5" />
									Delete
								</DropdownMenuItem>
								<DropdownMenuItem onClick={handleArchive}>
									<Archive className="!size-3.5" />
									Archive
								</DropdownMenuItem>
								<DropdownMenuItem onClick={handleRestore}>
									<RefreshCcw className="!size-3.5" />
									Restore
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={deselectAll}>
									<Square className="!size-3.5" />
									Deselect
								</DropdownMenuItem>
							</DropdownMenuGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				</motion.div>
			) : null}
		</AnimatePresence>
	);
};
