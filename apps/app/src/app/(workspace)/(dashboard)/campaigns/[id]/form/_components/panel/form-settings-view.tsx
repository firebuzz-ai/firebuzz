"use client";

import { api, type Id, useMutation, useQuery } from "@firebuzz/convex";
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
import { Separator } from "@firebuzz/ui/components/ui/separator";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
	Check,
	Link,
	Loader2,
	Plus,
	Settings,
	X,
} from "@firebuzz/ui/icons/lucide";
import { cn, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { useNodes, useReactFlow } from "@xyflow/react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { z } from "zod";
import type { FormNodeData } from "@/components/canvas/forms/nodes/form-node";
import { PanelHeader } from "@/components/ui/panel-header";
import type { PanelScreen } from "../form-types";
import { SchemaList } from "./schema-list";

// Form settings schema - only for properties that exist in the form node
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
	formId: Id<"forms">;
	onScreenChange: (screen: PanelScreen) => void;
	onFieldSelect?: (fieldId: string) => void;
}

export const FormSettingsView = ({
	campaignId,
	formId,
	onScreenChange,
	onFieldSelect,
}: FormSettingsViewProps) => {
	// URL state management
	const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState("");
	const [privacyPolicyState, setPrivacyPolicyState] = useState<
		"idle" | "updating" | "success" | "error"
	>("idle");
	const [privacyPolicyError, setPrivacyPolicyError] = useState<string | null>(
		null,
	);

	const [termsOfServiceUrl, setTermsOfServiceUrl] = useState("");
	const [termsOfServiceState, setTermsOfServiceState] = useState<
		"idle" | "updating" | "success" | "error"
	>("idle");
	const [termsOfServiceError, setTermsOfServiceError] = useState<string | null>(
		null,
	);

	const [successRedirectUrl, setSuccessRedirectUrl] = useState("");
	const [successRedirectState, setSuccessRedirectState] = useState<
		"idle" | "updating" | "success" | "error"
	>("idle");
	const [successRedirectError, setSuccessRedirectError] = useState<
		string | null
	>(null);

	// Get campaign data for GDPR settings
	const campaign = useQuery(api.collections.campaigns.queries.getById, {
		id: campaignId,
	});

	// Canvas-only approach - modify node data directly
	const nodes = useNodes();

	const formNode = useMemo(
		() => nodes?.find((n) => n.type === "form"),
		[nodes],
	);

	// Update React Flow state - canvas will detect and sync to server
	const { updateNodeData } = useReactFlow();

	// Campaign settings mutation
	const updateCampaignSettings = useMutation(
		api.collections.campaigns.mutations.updateCampaignSettings,
	).withOptimisticUpdate((localStore, args) => {
		// Get the current campaign data
		const existingCampaign = localStore.getQuery(
			api.collections.campaigns.queries.getById,
			{ id: campaignId },
		);

		if (existingCampaign) {
			// Update the campaign settings optimistically
			localStore.setQuery(
				api.collections.campaigns.queries.getById,
				{ id: campaignId },
				{
					...existingCampaign,
					campaignSettings: {
						...existingCampaign.campaignSettings,
						...args.campaignSettings,
					},
				},
			);
		}
	});

	const updateFormData = (updatedNodeData: FormNodeData) => {
		if (!formNode) return;

		// Use updateNodeData like campaigns do - this triggers onNodesChange
		updateNodeData(formNode.id, updatedNodeData);
	};

	// Get current form settings from node data
	const currentFormSettings = useMemo(() => {
		if (formNode) {
			const nodeData = formNode.data as unknown as FormNodeData;
			return {
				submitButtonText: nodeData.submitButtonText || "",
				successMessage: nodeData.successMessage || "",
				successRedirectUrl: nodeData.successRedirectUrl || "",
			};
		}
		return {
			submitButtonText: "",
			successMessage: "",
			successRedirectUrl: "",
		};
	}, [formNode]);

	// Form for form settings
	const formSettingsForm = useForm<z.infer<typeof formSettingsSchema>>({
		resolver: zodResolver(formSettingsSchema),
		values: currentFormSettings,
	});

	// Initialize URL states when campaign and form data changes
	useMemo(() => {
		// Privacy policy and terms of service come from campaign GDPR settings
		const gdprSettings = campaign?.campaignSettings?.gdpr;
		setPrivacyPolicyUrl(gdprSettings?.privacyPolicyUrl || "");
		setTermsOfServiceUrl(gdprSettings?.termsOfServiceUrl || "");

		// Success redirect URL comes from form node data
		setSuccessRedirectUrl(currentFormSettings.successRedirectUrl || "");
	}, [
		campaign?.campaignSettings?.gdpr,
		currentFormSettings.successRedirectUrl,
	]);

	// URL validation function
	const validateUrl = (url: string): string | null => {
		if (!url.trim()) return null; // Empty URLs are allowed

		try {
			const urlObj = new URL(url.trim());
			if (!["http:", "https:"].includes(urlObj.protocol)) {
				return "URL must use HTTP or HTTPS protocol";
			}
			return null;
		} catch {
			return "Please enter a valid URL";
		}
	};

	// Privacy Policy URL handlers
	const handlePrivacyPolicyUrlChange = (value: string) => {
		setPrivacyPolicyUrl(value);
		setPrivacyPolicyError(null);
		setPrivacyPolicyState("idle");
	};

	const handlePrivacyPolicyUrlBlur = async () => {
		const trimmedUrl = privacyPolicyUrl.trim();
		const validationError = validateUrl(trimmedUrl);

		if (validationError) {
			setPrivacyPolicyError(validationError);
			setPrivacyPolicyState("error");
			return;
		}

		// If URL hasn't changed, do nothing
		const currentUrl = campaign?.campaignSettings?.gdpr?.privacyPolicyUrl || "";
		if (trimmedUrl === currentUrl) {
			setPrivacyPolicyState("idle");
			return;
		}

		setPrivacyPolicyState("updating");
		setPrivacyPolicyError(null);

		try {
			if (!campaign) return;

			// Update campaign GDPR settings
			const currentGdpr = campaign.campaignSettings?.gdpr || {};
			const updatedGdpr = {
				...currentGdpr,
				privacyPolicyUrl: trimmedUrl || undefined,
			};

			await updateCampaignSettings({
				campaignId: campaignId,
				campaignSettings: { gdpr: updatedGdpr },
			});
			setPrivacyPolicyState("success");

			setTimeout(() => {
				setPrivacyPolicyState("idle");
			}, 2000);
		} catch (error) {
			setPrivacyPolicyState("error");
			const errorMessage =
				error instanceof Error ? error.message : "Failed to update URL";
			setPrivacyPolicyError(errorMessage);
			setPrivacyPolicyUrl(
				campaign?.campaignSettings?.gdpr?.privacyPolicyUrl || "",
			);
		}
	};

	// Terms of Service URL handlers
	const handleTermsOfServiceUrlChange = (value: string) => {
		setTermsOfServiceUrl(value);
		setTermsOfServiceError(null);
		setTermsOfServiceState("idle");
	};

	const handleTermsOfServiceUrlBlur = async () => {
		const trimmedUrl = termsOfServiceUrl.trim();
		const validationError = validateUrl(trimmedUrl);

		if (validationError) {
			setTermsOfServiceError(validationError);
			setTermsOfServiceState("error");
			return;
		}

		// If URL hasn't changed, do nothing
		const currentUrl =
			campaign?.campaignSettings?.gdpr?.termsOfServiceUrl || "";
		if (trimmedUrl === currentUrl) {
			setTermsOfServiceState("idle");
			return;
		}

		setTermsOfServiceState("updating");
		setTermsOfServiceError(null);

		try {
			if (!campaign) return;

			// Update campaign GDPR settings
			const currentGdpr = campaign.campaignSettings?.gdpr || {};
			const updatedGdpr = {
				...currentGdpr,
				termsOfServiceUrl: trimmedUrl || undefined,
			};

			await updateCampaignSettings({
				campaignId: campaignId,
				campaignSettings: { gdpr: updatedGdpr },
			});
			setTermsOfServiceState("success");

			setTimeout(() => {
				setTermsOfServiceState("idle");
			}, 2000);
		} catch (error) {
			setTermsOfServiceState("error");
			const errorMessage =
				error instanceof Error ? error.message : "Failed to update URL";
			setTermsOfServiceError(errorMessage);
			setTermsOfServiceUrl(
				campaign?.campaignSettings?.gdpr?.termsOfServiceUrl || "",
			);
		}
	};

	// Success Redirect URL handlers
	const handleSuccessRedirectUrlChange = (value: string) => {
		setSuccessRedirectUrl(value);
		setSuccessRedirectError(null);
		setSuccessRedirectState("idle");
	};

	const handleSuccessRedirectUrlBlur = async () => {
		const trimmedUrl = successRedirectUrl.trim();
		const validationError = validateUrl(trimmedUrl);

		if (validationError) {
			setSuccessRedirectError(validationError);
			setSuccessRedirectState("error");
			return;
		}

		// If URL hasn't changed, do nothing
		if (trimmedUrl === (currentFormSettings.successRedirectUrl || "")) {
			setSuccessRedirectState("idle");
			return;
		}

		setSuccessRedirectState("updating");
		setSuccessRedirectError(null);

		try {
			const nodeData = formNode?.data as unknown as FormNodeData;
			if (!formNode || !nodeData) return;

			const updatedNodeData = {
				...nodeData,
				successRedirectUrl: trimmedUrl || undefined,
			};
			updateFormData(updatedNodeData);
			setSuccessRedirectState("success");

			setTimeout(() => {
				setSuccessRedirectState("idle");
			}, 2000);
		} catch (error) {
			setSuccessRedirectState("error");
			const errorMessage =
				error instanceof Error ? error.message : "Failed to update URL";
			setSuccessRedirectError(errorMessage);
			setSuccessRedirectUrl(currentFormSettings.successRedirectUrl || "");
		}
	};

	// Canvas-only save function with optimistic updates (for non-URL fields)
	const saveSettings = () => {
		if (!formNode || !formId) return;

		const data = formSettingsForm.getValues();
		const nodeData = formNode.data as unknown as FormNodeData;

		// Check if data has actually changed to prevent unnecessary updates
		const newSubmitButtonText = data.submitButtonText || "Submit";
		const newSuccessMessage = data.successMessage || "Thank you!";

		const hasChanged =
			nodeData.submitButtonText !== newSubmitButtonText ||
			nodeData.successMessage !== newSuccessMessage;

		if (!hasChanged) return;

		// Update React Flow state directly - canvas will sync to server
		updateFormData({
			...nodeData,
			submitButtonText: newSubmitButtonText,
			successMessage: newSuccessMessage,
		});
	};

	const handleFieldSelect = (fieldId: string) => {
		onFieldSelect?.(fieldId);
	};

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<PanelHeader
				icon={Settings}
				title="Form Settings"
				description="Configure your form fields and settings"
			/>

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
						formId={formId}
						onScreenChange={onScreenChange}
						onFieldSelect={handleFieldSelect}
					/>
				</div>
				{/* Form Settings */}
				<Form {...formSettingsForm}>
					<form className="p-4 space-y-4">
						<FormFieldComponent
							control={formSettingsForm.control}
							name="submitButtonText"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Submit Button Text</FormLabel>
									<FormControl>
										<Input
											className="h-8"
											placeholder="Submit"
											{...field}
											onBlur={saveSettings}
										/>
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
											onBlur={saveSettings}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Success Redirect URL */}
						<div className="space-y-2">
							<FormLabel htmlFor="success-redirect-url" className="text-sm">
								Redirect URL{" "}
								<span className="text-xs text-muted-foreground">
									(Optional)
								</span>
							</FormLabel>
							<div className="relative">
								<Input
									id="success-redirect-url"
									value={successRedirectUrl}
									onChange={(e) =>
										handleSuccessRedirectUrlChange(e.target.value)
									}
									onBlur={handleSuccessRedirectUrlBlur}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.currentTarget.blur();
										}
									}}
									placeholder="https://example.com/thank-you"
									className={cn(
										"pr-10 h-8",
										successRedirectState === "error" &&
											"border-destructive focus-visible:ring-destructive",
									)}
								/>
								<div className="absolute inset-y-0 right-0 flex items-center px-2.5 bg-accent/50 border-l border-l-border rounded-r-md">
									<AnimatePresence mode="wait">
										{successRedirectState === "idle" && (
											<motion.div
												key="idle"
												className="flex justify-center items-center"
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												exit={{ opacity: 0 }}
											>
												<Link className="w-3 h-3 text-muted-foreground" />
											</motion.div>
										)}
										{successRedirectState === "updating" && (
											<motion.div
												key="updating"
												className="flex justify-center items-center"
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												exit={{ opacity: 0 }}
											>
												<Loader2 className="w-3 h-3 animate-spin text-brand" />
											</motion.div>
										)}
										{successRedirectState === "success" && (
											<motion.div
												key="success"
												className="flex justify-center items-center"
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												exit={{ opacity: 0 }}
											>
												<Check className="w-3 h-3 text-green-600" />
											</motion.div>
										)}
										{successRedirectState === "error" && (
											<motion.div
												key="error"
												className="flex justify-center items-center"
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												exit={{ opacity: 0 }}
											>
												<X className="w-3 h-3 text-destructive" />
											</motion.div>
										)}
									</AnimatePresence>
								</div>
							</div>
							{successRedirectError && (
								<motion.p
									initial={{ opacity: 0, y: -5 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -5 }}
									className="text-xs text-destructive"
								>
									{successRedirectError}
								</motion.p>
							)}
						</div>

						<Separator />

						{/* Legal Document URLs */}
						<div className="space-y-4">
							<div>
								<h4 className="text-sm font-medium">Legal Document URLs</h4>
								<p className="mt-1 text-xs text-muted-foreground">
									Provide links to your privacy policy and terms of service for
									compliance
								</p>
							</div>

							{/* Privacy Policy URL */}
							<div className="space-y-2">
								<FormLabel htmlFor="privacy-policy-url" className="text-sm">
									Privacy Policy URL
								</FormLabel>
								<div className="relative">
									<Input
										id="privacy-policy-url"
										value={privacyPolicyUrl}
										onChange={(e) =>
											handlePrivacyPolicyUrlChange(e.target.value)
										}
										onBlur={handlePrivacyPolicyUrlBlur}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.currentTarget.blur();
											}
										}}
										placeholder="https://example.com/privacy-policy"
										className={cn(
											"pr-10 h-8",
											privacyPolicyState === "error" &&
												"border-destructive focus-visible:ring-destructive",
										)}
									/>
									<div className="absolute inset-y-0 right-0 flex items-center px-2.5 bg-accent/50 border-l border-l-border rounded-r-md">
										<AnimatePresence mode="wait">
											{privacyPolicyState === "idle" && (
												<motion.div
													key="idle"
													className="flex justify-center items-center"
													initial={{ opacity: 0 }}
													animate={{ opacity: 1 }}
													exit={{ opacity: 0 }}
												>
													<Link className="w-3 h-3 text-muted-foreground" />
												</motion.div>
											)}
											{privacyPolicyState === "updating" && (
												<motion.div
													key="updating"
													className="flex justify-center items-center"
													initial={{ opacity: 0 }}
													animate={{ opacity: 1 }}
													exit={{ opacity: 0 }}
												>
													<Loader2 className="w-3 h-3 animate-spin text-brand" />
												</motion.div>
											)}
											{privacyPolicyState === "success" && (
												<motion.div
													key="success"
													className="flex justify-center items-center"
													initial={{ opacity: 0 }}
													animate={{ opacity: 1 }}
													exit={{ opacity: 0 }}
												>
													<Check className="w-3 h-3 text-green-600" />
												</motion.div>
											)}
											{privacyPolicyState === "error" && (
												<motion.div
													key="error"
													className="flex justify-center items-center"
													initial={{ opacity: 0 }}
													animate={{ opacity: 1 }}
													exit={{ opacity: 0 }}
												>
													<X className="w-3 h-3 text-destructive" />
												</motion.div>
											)}
										</AnimatePresence>
									</div>
								</div>
								{privacyPolicyError && (
									<motion.p
										initial={{ opacity: 0, y: -5 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -5 }}
										className="text-xs text-destructive"
									>
										{privacyPolicyError}
									</motion.p>
								)}
							</div>

							{/* Terms of Service URL */}
							<div className="space-y-2">
								<FormLabel htmlFor="terms-of-service-url" className="text-sm">
									Terms of Service URL
								</FormLabel>
								<div className="relative">
									<Input
										id="terms-of-service-url"
										value={termsOfServiceUrl}
										onChange={(e) =>
											handleTermsOfServiceUrlChange(e.target.value)
										}
										onBlur={handleTermsOfServiceUrlBlur}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.currentTarget.blur();
											}
										}}
										placeholder="https://example.com/terms-of-service"
										className={cn(
											"pr-10 h-8",
											termsOfServiceState === "error" &&
												"border-destructive focus-visible:ring-destructive",
										)}
									/>
									<div className="absolute inset-y-0 right-0 flex items-center px-2.5 bg-accent/50 border-l border-l-border rounded-r-md">
										<AnimatePresence mode="wait">
											{termsOfServiceState === "idle" && (
												<motion.div
													key="idle"
													className="flex justify-center items-center"
													initial={{ opacity: 0 }}
													animate={{ opacity: 1 }}
													exit={{ opacity: 0 }}
												>
													<Link className="w-3 h-3 text-muted-foreground" />
												</motion.div>
											)}
											{termsOfServiceState === "updating" && (
												<motion.div
													key="updating"
													className="flex justify-center items-center"
													initial={{ opacity: 0 }}
													animate={{ opacity: 1 }}
													exit={{ opacity: 0 }}
												>
													<Loader2 className="w-3 h-3 animate-spin text-brand" />
												</motion.div>
											)}
											{termsOfServiceState === "success" && (
												<motion.div
													key="success"
													className="flex justify-center items-center"
													initial={{ opacity: 0 }}
													animate={{ opacity: 1 }}
													exit={{ opacity: 0 }}
												>
													<Check className="w-3 h-3 text-green-600" />
												</motion.div>
											)}
											{termsOfServiceState === "error" && (
												<motion.div
													key="error"
													className="flex justify-center items-center"
													initial={{ opacity: 0 }}
													animate={{ opacity: 1 }}
													exit={{ opacity: 0 }}
												>
													<X className="w-3 h-3 text-destructive" />
												</motion.div>
											)}
										</AnimatePresence>
									</div>
								</div>
								{termsOfServiceError && (
									<motion.p
										initial={{ opacity: 0, y: -5 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -5 }}
										className="text-xs text-destructive"
									>
										{termsOfServiceError}
									</motion.p>
								)}
							</div>
						</div>
					</form>
				</Form>
			</div>
		</div>
	);
};
