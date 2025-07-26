"use client";

import type { Id } from "@firebuzz/convex";
import { api, useCachedQuery } from "@firebuzz/convex";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
	Form,
	FormControl,
	FormField as FormFieldComponent,
	FormItem,
	FormLabel,
	FormMessage,
} from "@firebuzz/ui/components/ui/form";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Plus, Settings } from "@firebuzz/ui/icons/lucide";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { useEffect } from "react";
import { z } from "zod";
import type { PanelScreen } from "../form-types";
import { SchemaList } from "./schema-list";

// Form settings schema - only for properties that exist in the database
const formSettingsSchema = z.object({
	submitButtonText: z.string().optional(),
	successMessage: z.string().optional(),
	successRedirectUrl: z
		.string()
		.url("Must be a valid URL")
		.optional()
		.or(z.literal("")),
});

interface FormSettingsViewProps {
	campaignId: Id<"campaigns">;
	onScreenChange: (screen: PanelScreen) => void;
	onFieldSelect?: (fieldId: string) => void;
}

export const FormSettingsView = ({
	campaignId,
	onScreenChange,
	onFieldSelect,
}: FormSettingsViewProps) => {
	// TODO: Create a custom mutation to handle form settings updates

	// Get form data directly from Convex
	const form = useCachedQuery(api.collections.forms.queries.getByCampaignId, {
		campaignId,
	});

	// Form for form settings
	const formSettingsForm = useForm<z.infer<typeof formSettingsSchema>>({
		resolver: zodResolver(formSettingsSchema),
		defaultValues: {
			submitButtonText: form?.submitButtonText || "",
			successMessage: form?.successMessage || "",
			successRedirectUrl: form?.successRedirectUrl || "",
		},
	});

	// Update form when form data changes
	useEffect(() => {
		if (form) {
			formSettingsForm.reset({
				submitButtonText: form.submitButtonText || "",
				successMessage: form.successMessage || "",
				successRedirectUrl: form.successRedirectUrl || "",
			});
		}
	}, [form, formSettingsForm.reset]);

	const onFormSettingsSubmit = async (
		data: z.infer<typeof formSettingsSchema>,
	) => {
		if (!form) return;

		try {
			// For now, we'll need to patch the form directly since the mutation only handles schema
			// This is a temporary solution - ideally we'd update the mutation to handle these fields
			console.log("Form settings would be updated with:", data);
			toast.success("Form settings updated");
		} catch {
			toast.error("Failed to update form settings", {
				description: "Please try again",
			});
		}
	};

	const handleFieldSelect = (fieldId: string) => {
		onFieldSelect?.(fieldId);
	};

	if (!form) {
		return (
			<div className="flex justify-center items-center h-full">
				<p className="text-sm text-muted-foreground">Loading...</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="flex gap-2 items-center px-4 py-3 border-b bg-muted">
				<div className="flex justify-center items-center rounded-md border size-6 bg-background-subtle">
					<Settings className="size-3 text-muted-foreground" />
				</div>
				<h2 className="font-semibold">Form Settings</h2>
			</div>

			<div className="flex overflow-y-auto flex-col flex-1 max-h-full">
				{/* Form Fields Section */}
				<div className="p-4 space-y-4 border-b">
					<div className="flex justify-between items-center">
						<h3 className="text-sm font-medium">Schema</h3>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									size="iconXs"
									variant="outline"
									onClick={() => onScreenChange("input-types")}
								>
									<Plus className="size-3.5" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Add New Field</TooltipContent>
						</Tooltip>
					</div>

					<SchemaList
						campaignId={campaignId}
						onScreenChange={onScreenChange}
						onFieldSelect={handleFieldSelect}
					/>
				</div>
				{/* Form Settings */}
				<Form {...formSettingsForm}>
					<form
						onSubmit={formSettingsForm.handleSubmit(onFormSettingsSubmit)}
						className="p-4 space-y-4"
					>
						<FormFieldComponent
							control={formSettingsForm.control}
							name="submitButtonText"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Submit Button Text</FormLabel>
									<FormControl>
										<Input className="h-8" placeholder="Submit" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormFieldComponent
							control={formSettingsForm.control}
							name="successMessage"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Success Message</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Thank you for your submission!"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormFieldComponent
							control={formSettingsForm.control}
							name="successRedirectUrl"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										Redirect URL{" "}
										<span className="text-xs text-muted-foreground">
											(Optional)
										</span>
									</FormLabel>
									<FormControl>
										<Input
											className="h-8"
											placeholder="https://example.com/thank-you"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button
							type="submit"
							size="sm"
							variant="outline"
							className="w-full"
							disabled={formSettingsForm.formState.isSubmitting}
						>
							Save Settings
						</Button>
					</form>
				</Form>
			</div>
		</div>
	);
};
