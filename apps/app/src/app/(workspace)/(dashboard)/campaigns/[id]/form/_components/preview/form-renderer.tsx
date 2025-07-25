"use client";

import type { Id } from "@firebuzz/convex";
import { api, useCachedQuery, useMutation } from "@firebuzz/convex";
import { DottedGridBackground } from "@firebuzz/ui/components/reusable/dotted-grid-background";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@firebuzz/ui/components/ui/card";
import { Checkbox } from "@firebuzz/ui/components/ui/checkbox";
import { DatePicker } from "@firebuzz/ui/components/ui/date-picker";
import {
	Form,
	FormControl,
	FormField as FormFieldComponent,
	FormItem,
	FormLabel,
	FormMessage,
} from "@firebuzz/ui/components/ui/form";
import { Input } from "@firebuzz/ui/components/ui/input";
import {
	RadioGroup,
	RadioGroupItem,
} from "@firebuzz/ui/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@firebuzz/ui/components/ui/select";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import { Eye } from "@firebuzz/ui/icons/lucide";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { useCallback, useEffect, useMemo } from "react";
import { z } from "zod";
import type { FormField } from "../form-types";
import { AIFormGenerator } from "./ai-form-generator";

interface FormRendererProps {
	campaignId: Id<"campaigns">;
}

export const FormRenderer = ({ campaignId }: FormRendererProps) => {
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
			visible: field.visible,
			default: field.default,
			options: field.options,
			placeholder: field.placeholder || "", // Use actual database value
			description: field.description || "", // Use actual database value
		}));
	}, [form?.schema]);

	// Handle AI-generated schema updates
	const handleSchemaUpdate = useCallback(
		async (
			newSchema: FormField[],
			submitButtonText?: string,
			successMessage?: string,
		) => {
			if (!form?._id) return;

			try {
				const dbSchema = newSchema.map((field) => ({
					id: field.id,
					title: field.title,
					placeholder: field.placeholder || undefined,
					description: field.description || undefined,
					type: field.type,
					inputType: field.inputType,
					required: field.required,
					unique: field.unique,
					visible: field.visible,
					default: field.default,
					options: field.options,
				}));

				await updateFormMutation({
					id: form._id,
					schema: dbSchema,
					submitButtonText,
					successMessage,
				});

				toast.success("Form updated successfully!", {
					description: "Your AI-generated form has been applied.",
				});
			} catch (error) {
				console.error("Failed to update form:", error);
				toast.error("Failed to update form", {
					description: "Please try again.",
				});
			}
		},
		[form?._id, updateFormMutation],
	);

	// Create dynamic schema based on form fields
	const formSchema = useMemo(() => {
		if (!formFields.length) return z.object({});

		const schemaFields = formFields.reduce(
			(acc, field) => {
				let fieldSchema: z.ZodTypeAny;

				switch (field.type) {
					case "string": {
						if (field.required) {
							fieldSchema = z.string().min(1, `${field.title} is required`);
						} else {
							fieldSchema = z.string().optional();
						}
						break;
					}
					case "number": {
						if (field.required) {
							fieldSchema = z.number().min(0, `${field.title} is required`);
						} else {
							fieldSchema = z.number().optional();
						}
						break;
					}
					case "boolean": {
						if (field.required) {
							fieldSchema = z.boolean();
						} else {
							fieldSchema = z.boolean().optional();
						}
						break;
					}
					default:
						fieldSchema = z.string().optional();
				}

				acc[field.id] = fieldSchema;
				return acc;
			},
			{} as Record<string, z.ZodTypeAny>,
		);

		return z.object(schemaFields);
	}, [formFields]);

	// Compute default values
	const defaultValues = useMemo(() => {
		const defaults: Record<string, unknown> = {};
		for (const field of formFields) {
			if (field.default !== undefined) {
				defaults[field.id] = field.default;
			} else {
				// Set appropriate default based on field type and input type
				switch (field.type) {
					case "boolean":
						defaults[field.id] = false;
						break;
					case "number":
						defaults[field.id] = undefined;
						break;
					case "string":
						// For select and radio, don't set to empty string if no default
						if (field.inputType === "select" || field.inputType === "radio") {
							defaults[field.id] = undefined;
						} else {
							defaults[field.id] = "";
						}
						break;
				}
			}
		}
		return defaults;
	}, [formFields]);

	// Initialize form with dynamic schema and default values
	const formInstance = useForm({
		resolver: zodResolver(formSchema),
		defaultValues,
	});

	// Reset form when default values change
	useEffect(() => {
		formInstance.reset(defaultValues);
	}, [defaultValues, formInstance]);

	const onSubmit = (data: z.infer<typeof formSchema>) => {
		console.log("Form submitted:", data);
	};

	const renderFormField = (field: FormField) => {
		return (
			<FormFieldComponent
				key={`${field.id}-${field.default}`}
				control={formInstance.control}
				name={field.id}
				render={({ field: formField }) => (
					<FormItem>
						<FormLabel className="text-sm font-medium text-foreground">
							{field.title}
							{field.required && (
								<span className="ml-1 text-destructive">*</span>
							)}
						</FormLabel>
						<FormControl>
							{(() => {
								switch (field.inputType) {
									case "text":
									case "email":
									case "url":
									case "tel":
									case "password": {
										return (
											<Input
												className="h-8"
												placeholder={
													field.placeholder ||
													`Enter ${field.title.toLowerCase()}...`
												}
												type={field.inputType}
												{...formField}
												value={String(formField.value || "")}
											/>
										);
									}
									case "number": {
										return (
											<Input
												className="h-8"
												placeholder={
													field.placeholder ||
													`Enter ${field.title.toLowerCase()}...`
												}
												type="number"
												{...formField}
												value={formField.value as number | ""}
												onChange={(e) =>
													formField.onChange(
														Number.parseFloat(e.target.value) || "",
													)
												}
											/>
										);
									}
									case "textarea": {
										return (
											<Textarea
												className="min-h-16"
												placeholder={
													field.placeholder ||
													`Enter ${field.title.toLowerCase()}...`
												}
												{...formField}
												value={String(formField.value || "")}
											/>
										);
									}
									case "checkbox": {
										return (
											<div className="flex items-center space-x-2">
												<Checkbox
													id={field.id}
													checked={Boolean(formField.value)}
													onCheckedChange={formField.onChange}
												/>
												<label htmlFor={field.id} className="text-sm">
													{field.placeholder || field.title}
												</label>
											</div>
										);
									}
									case "radio": {
										return (
											<RadioGroup
												value={String(formField.value || "")}
												onValueChange={formField.onChange}
											>
												{field.options?.map((option) => (
													<div
														key={option.value}
														className="flex items-center space-x-2"
													>
														<RadioGroupItem
															value={option.value}
															id={`${field.id}-${option.value}`}
														/>
														<label
															htmlFor={`${field.id}-${option.value}`}
															className="text-sm"
														>
															{option.label}
														</label>
													</div>
												))}
											</RadioGroup>
										);
									}
									case "select": {
										return (
											<Select
												value={String(formField.value || "")}
												onValueChange={formField.onChange}
											>
												<SelectTrigger className="h-8">
													<SelectValue
														placeholder={
															field.placeholder ||
															`Select ${field.title.toLowerCase()}...`
														}
													/>
												</SelectTrigger>
												<SelectContent>
													{field.options?.map((option) => (
														<SelectItem key={option.value} value={option.value}>
															{option.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										);
									}
									case "date": {
										return (
											<DatePicker
												value={formField.value as Date | undefined}
												onChange={formField.onChange}
												placeholder={field.placeholder || "Select date..."}
											/>
										);
									}
									case "time": {
										return (
											<Input
												className="h-8"
												type="time"
												{...formField}
												value={String(formField.value || "")}
											/>
										);
									}
									default:
										return (
											<Input
												className="h-8"
												placeholder={field.placeholder}
												{...formField}
												value={String(formField.value || "")}
											/>
										);
								}
							})()}
						</FormControl>
						{field.description && (
							<p className="mt-1 text-xs text-muted-foreground">
								{field.description}
							</p>
						)}
						<FormMessage />
					</FormItem>
				)}
			/>
		);
	};

	if (!form) {
		return (
			<div className="flex relative justify-center items-center w-full h-full">
				<Spinner size="sm" />
			</div>
		);
	}

	if (formFields.length === 0) {
		return (
			<div className="relative w-full h-full">
				<DottedGridBackground />
				<div className="flex relative z-10 justify-center items-center w-full h-full">
					<div className="p-4 max-w-sm text-sm leading-relaxed text-center rounded-lg border text-muted-foreground bg-muted">
						Preview will be available here once you add fields to your form. Use{" "}
						<Badge variant="outline" className="text-xs">
							⌘G AI
						</Badge>{" "}
						to generate fields or manage it from the{" "}
						<Badge variant="outline" className="text-xs">
							Form Settings
						</Badge>{" "}
						tab.
					</div>
				</div>

				{/* AI Form Generator - Always visible when no fields */}
				<AIFormGenerator
					isVisible={true}
					existingSchema={formFields}
					onSchemaUpdate={handleSchemaUpdate}
				/>
			</div>
		);
	}

	return (
		<div className="relative w-full h-full">
			<DottedGridBackground />
			<Badge
				variant="outline"
				className="flex absolute top-4 left-4 gap-1 bg-muted"
			>
				<Eye className="size-3.5" />
				Preview
			</Badge>
			{/* Preview */}
			<div className="flex relative z-10 justify-center items-center p-6 w-full h-full">
				<Card className="w-full max-w-md shadow-lg backdrop-blur-sm bg-card/90">
					<CardHeader className="text-center sr-only">
						<CardTitle className="text-xl font-bold text-foreground">
							{form.campaign?.title || "Lead Generation Form"}
						</CardTitle>
					</CardHeader>
					<CardContent className="pt-4">
						<Form {...formInstance}>
							<form
								onSubmit={formInstance.handleSubmit(onSubmit)}
								className="space-y-4"
							>
								{formFields
									.filter((field) => field.visible !== false)
									.map(renderFormField)}
								<Button size="sm" type="submit" className="mt-6 w-full">
									{form.submitButtonText || "Submit"}
								</Button>
							</form>
						</Form>
					</CardContent>
				</Card>
			</div>

			{/* AI Form Generator */}
			<AIFormGenerator
				isVisible={true}
				existingSchema={formFields}
				onSchemaUpdate={handleSchemaUpdate}
			/>
		</div>
	);
};
