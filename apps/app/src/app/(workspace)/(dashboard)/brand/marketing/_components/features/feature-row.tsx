"use client";

import { type Doc, api, useMutation } from "@firebuzz/convex";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@firebuzz/ui/components/ui/table";
import { Copy, MoreHorizontalIcon, Trash } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { useEffect, useRef, useState } from "react";

interface FeatureRowProps {
	feature: Doc<"features">;
	isLast?: boolean;
}

export const FeatureRow = ({ feature, isLast = false }: FeatureRowProps) => {
	const [editedData, setEditedData] = useState({
		name: feature.name,
		description: feature.description,
		benefits: feature.benefits,
		proof: feature.proof,
	});

	const [lastSavedData, setLastSavedData] = useState({
		name: feature.name,
		description: feature.description,
		benefits: feature.benefits,
		proof: feature.proof,
	});

	const [focusedField, setFocusedField] = useState<string | null>(null);

	const nameRef = useRef<HTMLDivElement>(null);
	const descriptionRef = useRef<HTMLDivElement>(null);
	const benefitsRef = useRef<HTMLDivElement>(null);
	const proofRef = useRef<HTMLDivElement>(null);

	const updateFeature = useMutation(
		api.collections.brands.features.mutations.update,
	);
	const duplicateFeature = useMutation(
		api.collections.brands.features.mutations.duplicate,
	);
	const deleteFeature = useMutation(
		api.collections.brands.features.mutations.deletePermanent,
	);

	const handleContentChange = (
		field: keyof typeof editedData,
		element: HTMLDivElement,
	) => {
		const newValue = element.textContent || "";
		setEditedData((prev) => ({ ...prev, [field]: newValue }));
	};

	const handleSave = async (field: keyof typeof editedData) => {
		// Only save if content has changed from last saved version
		if (editedData[field] !== lastSavedData[field]) {
			await updateFeature({
				id: feature._id,
				[field]: editedData[field],
			});
			// Update last saved data
			setLastSavedData((prev) => ({ ...prev, [field]: editedData[field] }));
		}
	};

	const handleKeyDown = (
		field: keyof typeof editedData,
		e: React.KeyboardEvent<HTMLDivElement>,
	) => {
		if (e.key === "Enter") {
			if (e.shiftKey) {
				// Shift + Enter: Allow new line (default behavior)
				return;
			}
			// Enter: Save and blur
			e.preventDefault();
			handleSave(field);
			e.currentTarget.blur();
		}
	};

	const handleFocus = (field: string) => {
		setFocusedField(field);
	};

	const handleBlur = (field: keyof typeof editedData) => {
		setFocusedField(null);
		handleSave(field);
	};

	const handleDuplicate = async () => {
		await duplicateFeature({ id: feature._id });
	};

	const handleDelete = async () => {
		await deleteFeature({ id: feature._id });
	};

	// Update edited data when feature changes
	useEffect(() => {
		setEditedData({
			name: feature.name,
			description: feature.description,
			benefits: feature.benefits,
			proof: feature.proof,
		});

		setLastSavedData({
			name: feature.name,
			description: feature.description,
			benefits: feature.benefits,
			proof: feature.proof,
		});

		// Update content of editable divs
		if (nameRef.current) nameRef.current.textContent = feature.name;
		if (descriptionRef.current)
			descriptionRef.current.textContent = feature.description;
		if (benefitsRef.current) benefitsRef.current.textContent = feature.benefits;
		if (proofRef.current) proofRef.current.textContent = feature.proof;
	}, [feature]);

	const editableDivClasses =
		"min-h-[80px] p-3 border-2 border-transparent focus:outline-none focus:border-brand hover:bg-muted/30 transition-colors duration-200 relative";

	return (
		<>
			<style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
			<TableRow
				className={cn(
					"hover:bg-muted/20 transition-colors border-t border-border",
				)}
			>
				<TableCell className="relative p-0 border-r border-border">
					<div
						ref={nameRef}
						contentEditable
						suppressContentEditableWarning
						className={cn(
							editableDivClasses,
							"font-semibold text-primary",
							isLast && "rounded-bl-xl",
						)}
						onInput={(e) => handleContentChange("name", e.currentTarget)}
						onKeyDown={(e) => handleKeyDown("name", e)}
						onFocus={() => handleFocus("name")}
						onBlur={() => handleBlur("name")}
						data-placeholder="Feature name..."
					>
						{feature.name}
					</div>
					{focusedField === "name" && (
						<div className="absolute flex gap-2 text-xs bottom-2 right-2 text-muted-foreground">
							<Button
								onClick={() => handleBlur("name")}
								variant="outline"
								className="!h-6 text-xs !px-1.5 !gap-1"
								size="sm"
							>
								Save
								<ButtonShortcut>Enter</ButtonShortcut>
							</Button>
						</div>
					)}
				</TableCell>

				<TableCell className="relative p-0 border-r border-border">
					<div
						ref={descriptionRef}
						contentEditable
						suppressContentEditableWarning
						className={editableDivClasses}
						onInput={(e) => handleContentChange("description", e.currentTarget)}
						onKeyDown={(e) => handleKeyDown("description", e)}
						onFocus={() => handleFocus("description")}
						onBlur={() => handleBlur("description")}
						data-placeholder="Describe this feature..."
					>
						{feature.description}
					</div>
					{focusedField === "description" && (
						<div className="absolute flex gap-2 text-xs bottom-2 right-2 text-muted-foreground">
							<Button
								onClick={() => handleBlur("description")}
								variant="outline"
								className="!h-6 text-xs !px-1.5 !gap-1"
								size="sm"
							>
								Save
								<ButtonShortcut>Enter</ButtonShortcut>
							</Button>
						</div>
					)}
				</TableCell>

				<TableCell className="relative p-0 border-r border-border">
					<div
						ref={benefitsRef}
						contentEditable
						suppressContentEditableWarning
						className={editableDivClasses}
						onInput={(e) => handleContentChange("benefits", e.currentTarget)}
						onKeyDown={(e) => handleKeyDown("benefits", e)}
						onFocus={() => handleFocus("benefits")}
						onBlur={() => handleBlur("benefits")}
						data-placeholder="What benefits does this provide..."
					>
						{feature.benefits}
					</div>
					{focusedField === "benefits" && (
						<div className="absolute flex gap-2 text-xs bottom-2 right-2 text-muted-foreground">
							<Button
								onClick={() => handleBlur("benefits")}
								variant="outline"
								className="!h-6 text-xs !px-1.5 !gap-1"
								size="sm"
							>
								Save
								<ButtonShortcut>Enter</ButtonShortcut>
							</Button>
						</div>
					)}
				</TableCell>

				<TableCell className="relative p-0 border-r border-border">
					<div
						ref={proofRef}
						contentEditable
						suppressContentEditableWarning
						className={editableDivClasses}
						onInput={(e) => handleContentChange("proof", e.currentTarget)}
						onKeyDown={(e) => handleKeyDown("proof", e)}
						onFocus={() => handleFocus("proof")}
						onBlur={() => handleBlur("proof")}
						data-placeholder="What evidence supports this..."
					>
						{feature.proof}
					</div>
					{focusedField === "proof" && (
						<div className="absolute flex gap-2 text-xs bottom-2 right-2 text-muted-foreground">
							<Button
								onClick={() => handleBlur("proof")}
								variant="outline"
								className="!h-6 text-xs !px-1.5 !gap-1"
								size="sm"
							>
								Save
								<ButtonShortcut>Enter</ButtonShortcut>
							</Button>
						</div>
					)}
				</TableCell>

				<TableCell className="p-3 text-center">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="iconSm">
								<MoreHorizontalIcon className="w-4 h-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={handleDuplicate}>
								<Copy className="w-4 h-4 mr-2" />
								Duplicate
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={handleDelete}>
								<Trash className="w-4 h-4 mr-2" />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</TableCell>
			</TableRow>
		</>
	);
};
