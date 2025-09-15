"use client";

import { type Doc, api, useMutation } from "@firebuzz/convex";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Label } from "@firebuzz/ui/components/ui/label";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import { Switch } from "@firebuzz/ui/components/ui/switch";
import { ArrowLeft, Check, Link, Loader2, X } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { CountryMultiSelect } from "../value-selectors/country-multi-select";

interface GdprAdvancedSettingsProps {
	gdprSettings: NonNullable<Doc<"campaigns">["campaignSettings"]>["gdpr"];
	onGdprChange: (
		gdpr: NonNullable<Doc<"campaigns">["campaignSettings"]>["gdpr"],
	) => void;
	onBack: () => void;
	campaign: Doc<"campaigns">;
}

export const GdprAdvancedSettings = ({
	gdprSettings,
	onGdprChange,
	onBack,
	campaign,
}: GdprAdvancedSettingsProps) => {
	// URL state management
	const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState(
		gdprSettings.privacyPolicyUrl || "",
	);
	const [privacyPolicyState, setPrivacyPolicyState] = useState<
		"idle" | "updating" | "success" | "error"
	>("idle");
	const [privacyPolicyError, setPrivacyPolicyError] = useState<string | null>(
		null,
	);

	const [termsOfServiceUrl, setTermsOfServiceUrl] = useState(
		gdprSettings.termsOfServiceUrl || "",
	);
	const [termsOfServiceState, setTermsOfServiceState] = useState<
		"idle" | "updating" | "success" | "error"
	>("idle");
	const [termsOfServiceError, setTermsOfServiceError] = useState<string | null>(
		null,
	);
	const updateCampaignSettings = useMutation(
		api.collections.campaigns.mutations.updateCampaignSettings,
	).withOptimisticUpdate((localStore, args) => {
		// Get the current campaign data
		const existingCampaign = localStore.getQuery(
			api.collections.campaigns.queries.getById,
			{ id: campaign._id },
		);

		if (existingCampaign) {
			// Update the campaign settings optimistically
			localStore.setQuery(
				api.collections.campaigns.queries.getById,
				{ id: campaign._id },
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

	const handleGdprChange = async (
		updatedGdpr: NonNullable<Doc<"campaigns">["campaignSettings"]>["gdpr"],
	) => {
		try {
			await updateCampaignSettings({
				campaignId: campaign._id,
				campaignSettings: { gdpr: updatedGdpr },
			});
			onGdprChange(updatedGdpr);
		} catch (error) {
			console.error("Failed to update GDPR settings:", error);
		}
	};
	const handleToggle =
		(field: keyof typeof gdprSettings) => (value: boolean) => {
			const updatedGdpr = {
				...gdprSettings,
				[field]: value,
			};
			handleGdprChange(updatedGdpr);
		};

	const handleCountriesChange = (countries: string[]) => {
		const updatedGdpr = {
			...gdprSettings,
			includedCountries: countries,
		};
		handleGdprChange(updatedGdpr);
	};

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
		if (trimmedUrl === (gdprSettings.privacyPolicyUrl || "")) {
			setPrivacyPolicyState("idle");
			return;
		}

		setPrivacyPolicyState("updating");
		setPrivacyPolicyError(null);

		try {
			const updatedGdpr = {
				...gdprSettings,
				privacyPolicyUrl: trimmedUrl || undefined,
			};
			await handleGdprChange(updatedGdpr);
			setPrivacyPolicyState("success");

			setTimeout(() => {
				setPrivacyPolicyState("idle");
			}, 2000);
		} catch (error) {
			setPrivacyPolicyState("error");
			const errorMessage =
				error instanceof Error ? error.message : "Failed to update URL";
			setPrivacyPolicyError(errorMessage);
			setPrivacyPolicyUrl(gdprSettings.privacyPolicyUrl || "");
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
		if (trimmedUrl === (gdprSettings.termsOfServiceUrl || "")) {
			setTermsOfServiceState("idle");
			return;
		}

		setTermsOfServiceState("updating");
		setTermsOfServiceError(null);

		try {
			const updatedGdpr = {
				...gdprSettings,
				termsOfServiceUrl: trimmedUrl || undefined,
			};
			await handleGdprChange(updatedGdpr);
			setTermsOfServiceState("success");

			setTimeout(() => {
				setTermsOfServiceState("idle");
			}, 2000);
		} catch (error) {
			setTermsOfServiceState("error");
			const errorMessage =
				error instanceof Error ? error.message : "Failed to update URL";
			setTermsOfServiceError(errorMessage);
			setTermsOfServiceUrl(gdprSettings.termsOfServiceUrl || "");
		}
	};

	return (
		<div className="flex flex-col h-full">
			{/* Header - Fixed */}
			<div className="flex flex-shrink-0 gap-3 items-center p-4 border-b bg-muted">
				<Button
					size="iconSm"
					variant="outline"
					onClick={onBack}
					className="!px-2 !py-2 !h-auto rounded-lg border bg-brand/10 border-brand text-brand hover:bg-brand/5 hover:text-brand"
				>
					<ArrowLeft className="size-4" />
				</Button>

				<div className="flex-1">
					<div className="flex flex-col">
						<div className="text-lg font-semibold leading-tight">
							GDPR Advanced Settings
						</div>
						<div className="text-sm leading-tight text-muted-foreground">
							Configure detailed privacy and compliance options
						</div>
					</div>
				</div>
			</div>

			{/* Content - Scrollable */}
			<div className="overflow-y-auto flex-1">
				<div className="p-4 space-y-4">
					{/* Advanced Settings */}
					<div className="space-y-4">
						{/* Geo Location Detection */}
						<div className="flex gap-5 justify-between items-center p-3 rounded-md border bg-muted">
							<div className="">
								<Label htmlFor="gdpr-geo" className="text-sm font-medium">
									Geo-location Detection
								</Label>
								<p className="text-xs text-muted-foreground">
									{gdprSettings.geoLocation
										? "Automatically detect visitor location and show consent banners to visitors from the EU."
										: "Show consent banners to visitors to all visitors."}
								</p>
							</div>
							<Switch
								id="gdpr-geo"
								checked={gdprSettings.geoLocation}
								onCheckedChange={handleToggle("geoLocation")}
								disabled={!gdprSettings.enabled}
							/>
						</div>

						{/* Localization */}
						<div className="flex gap-4 justify-between items-center p-3 rounded-md border bg-muted">
							<div className="">
								<Label
									htmlFor="gdpr-localization"
									className="text-sm font-medium"
								>
									Localization
								</Label>
								<p className="text-xs text-muted-foreground">
									{gdprSettings.localization
										? "Show consent banners in the visitor's local language."
										: "Show consent banners in the default language."}
								</p>
							</div>
							<Switch
								id="gdpr-localization"
								checked={gdprSettings.localization}
								onCheckedChange={handleToggle("localization")}
								disabled={!gdprSettings.enabled}
							/>
						</div>

						{/* Do Not Track */}
						<div className="flex gap-5 justify-between items-center p-3 rounded-md border bg-muted">
							<div className="">
								<Label htmlFor="gdpr-dnt" className="text-sm font-medium">
									Respect "Do Not Track"
								</Label>
								<p className="text-xs text-muted-foreground">
									{gdprSettings.respectDNT
										? "Honor browser Do Not Track (DNT) header and limit tracking accordingly."
										: "Do not honor browser Do Not Track (DNT) header and track visitors accordingly."}
								</p>
							</div>
							<Switch
								id="gdpr-dnt"
								checked={gdprSettings.respectDNT}
								onCheckedChange={handleToggle("respectDNT")}
								disabled={!gdprSettings.enabled}
							/>
						</div>

						{/* Legal Document URLs */}
						{gdprSettings.enabled && (
							<>
								<Separator />

								<div className="space-y-4">
									<div>
										<Label className="text-sm font-medium">
											Legal Document URLs
										</Label>
										<p className="mt-1 text-xs text-muted-foreground">
											Provide links to your privacy policy and terms of service
											for compliance
										</p>
									</div>

									{/* Privacy Policy URL */}
									<div className="space-y-2">
										<Label htmlFor="privacy-policy-url" className="text-sm">
											Privacy Policy URL
										</Label>
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
										<Label htmlFor="terms-of-service-url" className="text-sm">
											Terms of Service URL
										</Label>
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
							</>
						)}

						{/* Country Targeting */}
						{gdprSettings.geoLocation && (
							<>
								<Separator />

								<div className="space-y-2">
									<div className="space-y-2">
										{gdprSettings.enabled ? (
											<CountryMultiSelect
												label="Include More Countries"
												values={gdprSettings.includedCountries || []}
												onChange={handleCountriesChange}
												placeholder="All EU countries (default)"
												maxHeight={250}
											/>
										) : (
											<div className="p-4 rounded-md border border-dashed bg-muted/30">
												<p className="text-sm text-center text-muted-foreground">
													Enable GDPR compliance to configure country targeting
												</p>
											</div>
										)}
									</div>
								</div>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
