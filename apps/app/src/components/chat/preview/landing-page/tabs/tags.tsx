"use client";

import { api, ConvexError, useAction } from "@firebuzz/convex";
import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { TextShimmer } from "@firebuzz/ui/components/reusable/text-shimmer";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@firebuzz/ui/components/ui/form";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	FacebookIcon,
	GoogleAnalyticsIcon,
	GoogleIcon,
	GoogleTagManagerIcon,
} from "@firebuzz/ui/icons/social";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useLandingPageContext } from "@/hooks/agent/use-landing-page";
import { useSandbox } from "@/hooks/agent/use-sandbox";

// Define schema for Tags configuration
const tagsSchema = z.object({
	googleTagManagerId: z.string().nullable(),
	googleAnalyticsId: z.string().nullable(),
	googleSiteVerificationId: z.string().nullable(),
	facebookPixelId: z.string().nullable(),
});

type TagsConfigType = z.infer<typeof tagsSchema>;

export const TagsTab = () => {
	const {
		sandboxStatus,
		sandboxDbId,
		isLoading: isLoadingSandbox,
	} = useSandbox();
	const { landingPageId } = useLandingPageContext();
	const [isSaving, setIsSaving] = useState(false);

	const readTagsAction = useAction(
		api.collections.sandboxes.actions.readTagsFile,
	);
	const saveTagsAndVersionAction = useAction(
		api.collections.sandboxes.actions.saveTagsAndVersion,
	);

	// Fetch tags file content
	const {
		data: tagsResult,
		isLoading: isLoadingTags,
		error,
		refetch,
	} = useQuery({
		queryKey: ["tags", sandboxDbId],
		queryFn: async () => {
			if (!sandboxDbId) {
				throw new Error("Sandbox not available");
			}

			const readTags = await readTagsAction({ sandboxId: sandboxDbId });

			if (!readTags.success) {
				throw new Error(readTags.error?.message || "Failed to read tags file");
			}

			return readTags;
		},
		enabled: !!sandboxDbId && sandboxStatus === "running",
		retry: 2,
		staleTime: 1000 * 60, // 1 minute
	});

	// Parse the Tags configuration from file content
	const parsedConfig = useMemo(() => {
		if (!tagsResult?.content) return null;

		// Extract the configuration object from the string
		const configStr = tagsResult.content;
		const match = configStr.match(
			/export const tagsConfiguration = ({[\s\S]*?});/,
		);
		if (!match?.[1]) return null;

		try {
			// Use Function constructor to safely evaluate the object expression
			const obj = new Function(`return ${match[1]}`)();
			return obj as TagsConfigType;
		} catch (error) {
			console.error("Failed to parse Tags configuration:", error);
			return null;
		}
	}, [tagsResult?.content]);

	const form = useForm<TagsConfigType>({
		resolver: zodResolver(tagsSchema),
		defaultValues: parsedConfig || {
			googleTagManagerId: null,
			googleAnalyticsId: null,
			googleSiteVerificationId: null,
			facebookPixelId: null,
		},
		mode: "onChange",
	});

	// Reset form when parsedConfig changes
	useEffect(() => {
		if (parsedConfig) {
			form.reset(parsedConfig);
		}
	}, [parsedConfig, form]);

	// Handle save button click - updates tags and creates version
	const handleSave = useCallback(async () => {
		if (!sandboxDbId || !landingPageId || sandboxStatus !== "running") return;

		setIsSaving(true);
		try {
			const values = form.getValues();

			// Only update if form is valid
			const valid = await form.trigger();
			if (!valid) {
				setIsSaving(false);
				return;
			}

			const result = await saveTagsAndVersionAction({
				sandboxId: sandboxDbId,
				landingPageId,
				tagsConfig: values,
			});

			if (!result.success) {
				throw new Error(result.error?.message || "Failed to save tags");
			}

			toast.success("Tags saved and version created", {
				id: "tags-save",
				description: `Version ${result.versionNumber} created successfully`,
			});

			// Refetch to update the form with latest values
			await refetch();
		} catch (error) {
			console.error("Failed to save tags:", error);
			const errorMessage =
				error instanceof ConvexError ? error.data : "Unexpected error occurred";
			toast.error("Failed to save tags", {
				id: "tags-save-error",
				description: errorMessage,
			});
		} finally {
			setIsSaving(false);
		}
	}, [
		sandboxDbId,
		landingPageId,
		sandboxStatus,
		form,
		saveTagsAndVersionAction,
		refetch,
	]);

	if (isLoadingTags || isLoadingSandbox) {
		return (
			<div className="flex justify-center items-center p-4 h-full text-sm italic rounded-lg border bg-muted">
				<TextShimmer
					as="span"
					active={true}
					duration={1.5}
					className="text-sm italic font-medium"
				>
					{isLoadingTags ? "Loading tags configuration..." : "Initializing..."}
				</TextShimmer>
			</div>
		);
	}

	if (sandboxStatus !== "running") {
		return (
			<div className="flex justify-center items-center p-4 h-full rounded-lg border bg-muted">
				<p className="text-sm text-muted-foreground">
					You need to run your project to configure tags.
				</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex flex-col justify-center items-center h-full rounded-lg border bg-muted">
				<p className="text-sm text-destructive">
					Failed to load tags configuration
				</p>
				<p className="mt-1 text-xs text-muted-foreground">
					{error instanceof Error ? error.message : "Unknown error"}
				</p>
			</div>
		);
	}

	if (!parsedConfig) {
		return (
			<div className="flex justify-center items-center h-full rounded-lg border bg-muted">
				<p className="text-sm text-muted-foreground">
					No tags configuration found
				</p>
			</div>
		);
	}

	return (
		<Form {...form}>
			<div className="overflow-y-auto p-4 space-y-6 h-full rounded-lg border bg-muted">
				<div>
					<h3 className="text-lg font-medium">Marketing Tags</h3>
					<p className="text-sm text-muted-foreground">
						Configure marketing and analytics tags for your landing page
					</p>
				</div>

				<div className="grid gap-6 max-w-lg">
					<FormField
						control={form.control}
						name="googleTagManagerId"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="flex gap-2 items-center">
									<div className="p-1 rounded-md border size-5">
										<GoogleTagManagerIcon />
									</div>
									Google Tag Manager ID
								</FormLabel>
								<FormControl>
									<Input
										placeholder="GTM-XXXXXXX"
										{...field}
										value={field.value || ""}
										onChange={(e) => {
											const value = e.target.value || null;
											field.onChange(value);
										}}
										className="h-8"
									/>
								</FormControl>
								<FormDescription>
									Google Tag Manager container ID for tracking
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="googleAnalyticsId"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="flex gap-2 items-center">
									<div className="p-1 rounded-md border size-5">
										<GoogleAnalyticsIcon />
									</div>
									Google Analytics ID
								</FormLabel>
								<FormControl>
									<Input
										placeholder="G-XXXXXXXXXX or UA-XXXXXXXX-X"
										{...field}
										value={field.value || ""}
										onChange={(e) => {
											const value = e.target.value || null;
											field.onChange(value);
										}}
										className="h-8"
									/>
								</FormControl>
								<FormDescription>
									Google Analytics tracking ID (supports both GA4 and Universal
									Analytics)
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="googleSiteVerificationId"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="flex gap-2 items-center">
									<div className="p-1 rounded-md border size-5">
										<GoogleIcon />
									</div>
									Google Site Verification ID
								</FormLabel>
								<FormControl>
									<Input
										placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXXX"
										{...field}
										value={field.value || ""}
										onChange={(e) => {
											const value = e.target.value || null;
											field.onChange(value);
										}}
										className="h-8"
									/>
								</FormControl>
								<FormDescription>
									Verification code for Google Search Console
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="facebookPixelId"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="flex gap-2 items-center">
									<div className="p-1 rounded-md border size-5">
										<FacebookIcon />
									</div>
									Facebook Pixel ID
								</FormLabel>
								<FormControl>
									<Input
										placeholder="XXXXXXXXXXXX"
										{...field}
										value={field.value || ""}
										onChange={(e) => {
											const value = e.target.value || null;
											field.onChange(value);
										}}
										className="h-8"
									/>
								</FormControl>
								<FormDescription>
									Facebook Pixel ID for conversion tracking
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
					<Button
						onClick={handleSave}
						disabled={isSaving || !sandboxDbId || sandboxStatus !== "running"}
						className="gap-2 w-full h-8"
						size="sm"
					>
						{isSaving ? (
							<>
								<Spinner size="xs" />
								Saving...
							</>
						) : (
							"Save Tags"
						)}
					</Button>
					<InfoBox>
						After you save the tags, you need to{" "}
						<span className="font-medium text-primary">
							your landing page and campaign
						</span>{" "}
						in order to use the tags in live environment.
					</InfoBox>
				</div>
			</div>
		</Form>
	);
};
