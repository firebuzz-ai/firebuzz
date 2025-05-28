import type { Doc, Id } from "@firebuzz/convex";
import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@firebuzz/ui/components/ui/accordion";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { buttonVariants } from "@firebuzz/ui/components/ui/button";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
	ArrowUpFromDot,
	Eye,
	EyeOff,
	Grip,
	Trash2,
} from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { Reorder, useDragControls } from "motion/react";
import type React from "react";
import { useState } from "react";

export interface ThemeItemDoc extends Doc<"themes"> {}

interface ThemeReorderableItemProps {
	item: ThemeItemDoc;
	setOpenAccordionIdForDrag: (id: string) => void;
	editingNameId: Id<"themes"> | null;
	setEditingNameId: (id: Id<"themes"> | null) => void;
	currentNameValue: string;
	setCurrentNameValue: (value: string) => void;
	handleNameChange: (id: Id<"themes">, newName: string) => void;
	handleDescriptionChange: (id: Id<"themes">, newDescription: string) => void;
	handleDelete: (id: Id<"themes">) => void;
	handleVisibilityChange: (id: Id<"themes">) => void;
	handlePromote: (id: Id<"themes">) => void;
}

export const ThemeReorderableItem: React.FC<ThemeReorderableItemProps> = ({
	item,
	setOpenAccordionIdForDrag,
	editingNameId,
	setEditingNameId,
	currentNameValue,
	setCurrentNameValue,
	handleNameChange,
	handleDescriptionChange,
	handleDelete,
	handleVisibilityChange,
	handlePromote,
}) => {
	const dragControls = useDragControls();
	const [isDragging, setIsDragging] = useState(false);

	return (
		<Reorder.Item
			key={item._id}
			value={item}
			className={cn(
				"list-none border rounded-lg shadow-sm bg-background relative",
				isDragging && "shadow-lg scale-105 z-10",
				!item.isVisible && "opacity-60",
			)}
			dragListener={false}
			dragControls={dragControls}
			onDragStart={() => setIsDragging(true)}
			onDragEnd={() => setIsDragging(false)}
		>
			<AccordionItem value={item._id} className="border-b-0">
				<AccordionTrigger className="flex items-center gap-2 px-3 py-2 text-sm hover:no-underline w-full data-[state=open]:rounded-b-none data-[state=open]:border-b-0 rounded-lg hover:bg-transparent">
					<div className="flex items-center flex-grow min-w-0 gap-2">
						<Grip
							className="size-3.5 cursor-grab"
							onClick={(e) => {
								e.stopPropagation();
								setOpenAccordionIdForDrag("");
							}}
							onPointerDown={(event) => {
								event.stopPropagation();
								event.preventDefault();
								setOpenAccordionIdForDrag("");

								requestAnimationFrame(() => {
									dragControls.start(event);
								});
							}}
						/>
						<Input
							value={editingNameId === item._id ? currentNameValue : item.name}
							onChange={(e) => {
								if (editingNameId === item._id) {
									setCurrentNameValue(e.target.value);
								}
							}}
							onFocus={(e) => {
								e.stopPropagation();
								setEditingNameId(item._id);
								setCurrentNameValue(item.name);
							}}
							onClick={(e) => {
								e.stopPropagation();
								if (editingNameId !== item._id) {
									setEditingNameId(item._id);
									setCurrentNameValue(item.name);
								}
							}}
							onBlur={() => {
								if (editingNameId === item._id) {
									if (
										currentNameValue.trim() !== "" &&
										currentNameValue !== item.name
									) {
										handleNameChange(item._id, currentNameValue);
									}
									setEditingNameId(null);
								}
							}}
							onKeyDown={(e) => {
								if (editingNameId === item._id) {
									e.stopPropagation();
									if (e.key === "Enter") {
										if (
											currentNameValue.trim() !== "" &&
											currentNameValue !== item.name
										) {
											handleNameChange(item._id, currentNameValue);
										}
										setEditingNameId(null);
										(e.target as HTMLInputElement).blur();
									} else if (e.key === "Escape") {
										setEditingNameId(null);
										(e.target as HTMLInputElement).blur();
									}
								}
							}}
							className="!px-0 !py-0 h-6 text-sm bg-transparent border-none outline-none focus-visible:ring-transparent focus-visible:ring-0 focus-visible:ring-offset-0 max-w-fit"
						/>
					</div>

					{!item.isSystem ? (
						<Tooltip delayDuration={0}>
							<TooltipTrigger asChild>
								<div
									className={buttonVariants({
										variant: "ghost",
										size: "iconXs",
										className: "size-6",
									})}
									onClick={(e) => {
										e.stopPropagation();
										handlePromote(item._id);
									}}
								>
									<ArrowUpFromDot
										className={cn(item.isSystem && "opacity-50", "!size-3.5")}
									/>
								</div>
							</TooltipTrigger>
							<TooltipContent side="left">Promote</TooltipContent>
						</Tooltip>
					) : (
						<Badge>Default</Badge>
					)}

					<Tooltip delayDuration={0}>
						<TooltipTrigger asChild>
							<div
								className={buttonVariants({
									variant: "ghost",
									size: "iconXs",
									className: "size-6",
								})}
								onClick={(e) => {
									e.stopPropagation();
									if (!item.isSystem) {
										toast.message("Are you sure you?", {
											id: "delete-theme",
											position: "top-right",
											description:
												"Are you sure you want to delete this theme? This action is irreversible and you will not be able to recover it.",
											action: {
												label: "Delete",

												onClick: () => handleDelete(item._id),
											},
											cancel: {
												label: "Cancel",
												onClick: () => toast.dismiss("delete-theme"),
											},
										});
									}
								}}
							>
								<Trash2
									className={cn(item.isSystem && "opacity-50", "!size-3.5")}
								/>
							</div>
						</TooltipTrigger>
						<TooltipContent side="left">
							{item.isSystem ? "System themes are not deletable." : "Delete"}
						</TooltipContent>
					</Tooltip>

					<Tooltip delayDuration={0}>
						<TooltipTrigger asChild>
							<div
								className={buttonVariants({
									variant: "ghost",
									size: "iconXs",
									className: "size-6",
								})}
								onClick={(e) => {
									e.stopPropagation();
									if (!item.isSystem) {
										handleVisibilityChange(item._id);
									}
								}}
							>
								{item.isVisible ? (
									<Eye
										className={cn(item.isSystem && "opacity-50", "!size-3.5")}
									/>
								) : (
									<EyeOff
										className={cn(item.isSystem && "opacity-50", "!size-3.5")}
									/>
								)}
							</div>
						</TooltipTrigger>
						<TooltipContent side="left">
							{item.isSystem
								? "System themes cannot be hidden."
								: item.isVisible
									? "Hide"
									: "Show"}
						</TooltipContent>
					</Tooltip>
				</AccordionTrigger>
				<AccordionContent className="p-4 border-t rounded-b-md">
					<Textarea
						id={`description-${item._id}`}
						placeholder="Enter a description (optional)"
						value={item.description ?? ""}
						onChange={(e) => {
							handleDescriptionChange(item._id, e.target.value);
						}}
					/>
				</AccordionContent>
			</AccordionItem>
		</Reorder.Item>
	);
};
