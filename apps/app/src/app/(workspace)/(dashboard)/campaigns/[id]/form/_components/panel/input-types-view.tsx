"use client";

import { type Id, api, useCachedQuery, useMutation } from "@firebuzz/convex";
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
import { toast } from "@firebuzz/ui/lib/utils";
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
	onScreenChange: (screen: PanelScreen) => void;
	onFieldSelect: (fieldId: string) => void;
}

export const InputTypesView = ({
	campaignId,
	onScreenChange,
	onFieldSelect,
}: InputTypesViewProps) => {
	const updateFormMutation = useMutation(
		api.collections.forms.mutations.update,
	);

	// Get form data directly from Convex
	const form = useCachedQuery(api.collections.forms.queries.getByCampaignId, {
		campaignId,
	});

	// Convert DB schema to client format
	const formFields: FormField[] = useMemo(() => {
		if (!form?.schema) return [];

		return form.schema.map((field) => ({
			id: field.id,
			title: field.title,
			type: field.type,
			inputType: field.inputType,
			required: field.required,
			unique: field.unique,
			default: field.default,
			options: field.options,
			placeholder: field.placeholder || "",
			description: field.description || "",
		}));
	}, [form?.schema]);

	const saveFormFields = async (newFields: FormField[]) => {
		if (!form || !form._id) return;

		try {
			const dbSchema = newFields.map((field) => ({
				id: field.id,
				title: field.title,
				placeholder: field.placeholder || undefined,
				description: field.description || undefined,
				type: field.type,
				inputType: field.inputType,
				required: field.required,
				unique: field.unique,
				default: field.default,
				options: field.options,
			}));

			await updateFormMutation({
				id: form._id,
				schema: dbSchema,
			});
		} catch {
			toast.error("Failed to save form", {
				description: "Please try again",
			});
		}
	};

	const handleAddField = async (inputType: FormField["inputType"]) => {
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
			default: inputTypeOption.defaultSettings.default,
			options: inputTypeOption.defaultSettings.options,
		};

		const updatedFields = [...formFields, newField];
		await saveFormFields(updatedFields);

		// Select the newly created field and navigate to field settings
		onFieldSelect(newField.id);
		onScreenChange("field-settings");
	};

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="flex gap-2 items-center px-4 py-3 border-b bg-muted">
				<Button
					size="iconXs"
					variant="outline"
					className="!p-1.5"
					onClick={() => onScreenChange("form-settings")}
				>
					<ArrowLeft className="size-3" />
				</Button>

				<h2 className="font-semibold">Add Field</h2>
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
