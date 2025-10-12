"use client";

import { api, ConvexError, type Id, useMutation } from "@firebuzz/convex";
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

interface TestimonialSelectedMenuProps {
	selections: Id<"testimonials">[];
	setSelections: Dispatch<SetStateAction<Id<"testimonials">[]>>;
	totalCount: number;
}

export const TestimonialSelectedMenu = ({
	selections,
	setSelections,
	totalCount,
}: TestimonialSelectedMenuProps) => {
	const [isOpen, setIsOpen] = useState(false);
	const selectedCount = selections.length;

	const deselectAll = () => {
		setIsOpen(false);
		setSelections([]);
	};

	// Mutations for testimonials
	const deleteTestimonialsMutation = useMutation(
		api.collections.brands.testimonials.mutations.deletePermanentMany,
	);
	const duplicateTestimonialsMutation = useMutation(
		api.collections.brands.testimonials.mutations.duplicateMany,
	);

	const handleDelete = async () => {
		if (selections.length === 0) return;
		try {
			toast.loading("Deleting testimonials...", {
				description: "This may take a few seconds...",
				id: "delete-testimonials",
			});
			await deleteTestimonialsMutation({ ids: selections });
			setSelections([]);
			toast.success("Testimonials Deleted", {
				description: "The selected testimonials have been permanently deleted.",
				id: "delete-testimonials",
			});
		} catch (error) {
			console.error("Error deleting testimonials:", error);
			const errorMessage =
				error instanceof ConvexError ? error.data : "Please try again later.";
			toast.error("Failed to delete testimonials", {
				description: errorMessage,
				id: "delete-testimonials",
			});
		}
	};

	const handleDuplicate = async () => {
		if (selections.length === 0) return;
		try {
			toast.loading("Duplicating testimonials...", {
				description: "This may take a few seconds...",
				id: "duplicate-testimonials",
			});
			await duplicateTestimonialsMutation({ ids: selections });
			// Not clearing selections on duplicate as the originals are still there
			toast.success("Testimonials Duplicated", {
				description: "The selected testimonials have been duplicated.",
				id: "duplicate-testimonials",
			});
		} catch (error) {
			console.error("Error duplicating testimonials:", error);
			const errorMessage =
				error instanceof ConvexError ? error.data : "Please try again later.";
			toast.error("Failed to duplicate testimonials", {
				description: errorMessage,
				id: "duplicate-testimonials",
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
