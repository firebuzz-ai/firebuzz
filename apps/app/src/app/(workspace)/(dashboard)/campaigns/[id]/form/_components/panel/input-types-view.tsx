"use client";
import type { FormNodeData } from "@/components/canvas/forms/nodes/form-node";
import type { Id } from "@firebuzz/convex";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Card, CardContent } from "@firebuzz/ui/components/ui/card";
import {
	AlignLeft,
	ArrowLeft,
	Calendar,
	Check,
	ChevronDown,
	Circle,
	Clock,
	Hash,
	Link,
	Mail,
	Palette,
	Phone,
	Type,
} from "@firebuzz/ui/icons/lucide";
import { useNodes, useReactFlow } from "@xyflow/react";
import { nanoid } from "nanoid";
import { useMemo } from "react";
import {
	type FormField,
	INPUT_TYPES,
	type InputTypeOption,
	type PanelScreen,
} from "../form-types";

// Icon mapping for input types
const ICON_MAP = {
	Type,
	AlignLeft,
	Mail,
	Hash,
	Phone,
	Link,
	ChevronDown,
	Circle,
	Check,
	Calendar,
	Clock,
	Palette,
};

interface InputTypesViewProps {
	campaignId: Id<"campaigns">;
	formId: Id<"forms">;
	onScreenChange: (screen: PanelScreen) => void;
	onFieldSelect: (fieldId: string) => void;
}

export const InputTypesView = ({
	formId,
	onScreenChange,
	onFieldSelect,
}: InputTypesViewProps) => {
	// Canvas-only approach - modify node data through React Flow
	const nodes = useNodes();
	const { updateNodeData } = useReactFlow();

	const formNode = useMemo(
		() => nodes?.find((n) => n.type === "form"),
		[nodes],
	);

	// Update React Flow state - canvas will detect and sync to server
	const updateFormData = (updatedNodeData: FormNodeData) => {
		if (!formNode) return;

		// Use updateNodeData like campaigns do - this triggers onNodesChange
		updateNodeData(formNode.id, updatedNodeData);
	};

	const handleAddField = (inputType: FormField["inputType"]) => {
		if (!formNode || !formId) return;

		const inputTypeOption = INPUT_TYPES.find((type) => type.type === inputType);
		if (!inputTypeOption) return;

		const newField: FormField = {
			id: `fd-${nanoid(6)}`,
			title: `${inputTypeOption.label} Field`,
			placeholder: inputTypeOption.defaultSettings.placeholder || "",
			description: "",
			inputType,
			type: inputTypeOption.defaultSettings.type || "string",
			required: inputTypeOption.defaultSettings.required || false,
			unique: false,
			visible: true,
			default: inputTypeOption.defaultSettings.default,
			options: inputTypeOption.defaultSettings.options,
		};

		const nodeData = formNode.data as unknown as FormNodeData;
		const updatedSchema = [...(nodeData.schema || []), newField];

		// Update React Flow state directly - canvas will sync to server
		updateFormData({
			...nodeData,
			schema: updatedSchema,
		});

		// Select the newly created field and navigate to field settings
		onFieldSelect(newField.id);
		onScreenChange("field-settings");
	};

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="flex flex-shrink-0 gap-3 items-center p-4 border-b bg-muted">
				<Button
					size="iconSm"
					variant="outline"
					onClick={() => onScreenChange("form-settings")}
					className="!px-2 !py-2 !h-auto rounded-lg border bg-brand/10 border-brand text-brand hover:bg-brand/5 hover:text-brand"
				>
					<ArrowLeft className="size-4" />
				</Button>

				<div className="flex-1">
					<div className="flex flex-col">
						<div className="text-lg font-semibold leading-tight">Add Field</div>
						<div className="text-sm leading-tight text-muted-foreground">
							Choose a field type to add to your form
						</div>
					</div>
				</div>
			</div>

			<div className="overflow-y-auto flex-1 min-h-0">
				<div className="grid gap-2 p-4">
					{INPUT_TYPES.map((inputType: InputTypeOption) => {
						const Icon = ICON_MAP[inputType.icon as keyof typeof ICON_MAP];
						return (
							<Card
								key={inputType.type}
								className="shadow-none transition-all duration-200 ease-in-out cursor-pointer hover:bg-muted hover:border-muted-foreground/10"
								onClick={() => handleAddField(inputType.type)}
							>
								<CardContent className="px-4 py-2">
									<div className="flex gap-3 items-center">
										<div className="p-2 rounded-lg border bg-muted">
											<Icon className="size-4" />
										</div>
										<div className="flex-1">
											<h4 className="text-sm font-medium leading-none">
												{inputType.label}
											</h4>
											<p className="text-xs text-muted-foreground">
												{inputType.description}
											</p>
										</div>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			</div>
		</div>
	);
};
