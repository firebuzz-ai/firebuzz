"use client";

import { api, ConvexError, useAction } from "@firebuzz/convex";
import { envCloudflarePublic } from "@firebuzz/env";
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
import { Switch } from "@firebuzz/ui/components/ui/switch";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { ImagePreview } from "@/components/reusables/image-preview";
import { ImageSelect } from "@/components/reusables/image-select";
import { useLandingPageContext } from "@/hooks/agent/use-landing-page";
import { useSandbox } from "@/hooks/agent/use-sandbox";

// Define schema for SEO configuration
const seoSchema = z.object({
	title: z.string().min(1, "Title is required"),
	description: z.string().min(1, "Description is required"),
	canonical: z.string().url("Must be a valid URL"),
	indexable: z.boolean().default(true),
	iconType: z.string(),
	icon: z.string().url("Must be a valid URL"),
	openGraph: z.object({
		title: z.string().min(1, "Open Graph title is required"),
		description: z.string().min(1, "Open Graph description is required"),
		image: z.string().url("Must be a valid URL").optional(),
		url: z.string().url("Must be a valid URL").optional(),
		type: z.string().optional(),
	}),
});

export type SeoConfigType = z.infer<typeof seoSchema>;

export const Seo = () => {
	const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();
	const {
		sandboxStatus,
		sandboxDbId,
		isLoading: isLoadingSandbox,
	} = useSandbox();
	const { landingPageId } = useLandingPageContext();
	const [isSaving, setIsSaving] = useState(false);

	const readSeoAction = useAction(
		api.collections.sandboxes.actions.readSeoFile,
	);
	const saveSeoAndVersionAction = useAction(
		api.collections.sandboxes.actions.saveSeoAndVersion,
	);

	// Fetch SEO file content
	const {
		data: seoResult,
		isLoading: isLoadingSeo,
		error,
		refetch,
	} = useQuery({
		queryKey: ["seo", sandboxDbId],
		queryFn: async () => {
			if (!sandboxDbId) {
				throw new Error("Sandbox not available");
			}

			const readSeo = await readSeoAction({ sandboxId: sandboxDbId });

			if (!readSeo.success) {
				throw new Error(readSeo.error?.message || "Failed to read SEO file");
			}

			return readSeo;
		},
		enabled: !!sandboxDbId && sandboxStatus === "running",
		retry: 2,
		staleTime: 1000 * 60, // 1 minute
	});

	// Parse the SEO configuration from file content
	const parsedConfig = useMemo(() => {
		if (!seoResult?.content) return null;

		// Extract the configuration object from the string
		const configStr = seoResult.content;
		const match = configStr.match(
			/export const seoConfiguration = ({[\s\S]*?});/,
		);
		if (!match?.[1]) return null;

		try {
			// Use Function constructor to safely evaluate the object expression
			const obj = new Function(`return ${match[1]}`)();
			return obj as SeoConfigType;
		} catch (error) {
			console.error("Failed to parse SEO configuration:", error);
			return null;
		}
	}, [seoResult?.content]);

	const form = useForm<SeoConfigType>({
		resolver: zodResolver(seoSchema),
		defaultValues: parsedConfig || {
			title: "",
			description: "",
			canonical: "",
			indexable: true,
			iconType: "",
			icon: "",
			openGraph: {
				title: "",
				description: "",
				image: "",
				url: "",
				type: "",
			},
		},
		mode: "onChange",
	});

	// Reset form when parsedConfig changes
	useEffect(() => {
		if (parsedConfig) {
			form.reset(parsedConfig);
		}
	}, [parsedConfig, form]);

	// Handle save button click - updates SEO and creates version
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

			const result = await saveSeoAndVersionAction({
				sandboxId: sandboxDbId,
				landingPageId,
				seoConfig: values,
			});

			if (!result.success) {
				throw new Error(result.error?.message || "Failed to save SEO");
			}

			toast.success("SEO saved and version created", {
				id: "seo-save",
				description: `Version ${result.versionNumber} created successfully`,
			});

			// Refetch to update the form with latest values
			await refetch();
		} catch (error) {
			console.error("Failed to save SEO:", error);
			const errorMessage =
				error instanceof ConvexError ? error.data : "Unexpected error occurred";
			toast.error("Failed to save SEO", {
				id: "seo-save-error",
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
		saveSeoAndVersionAction,
		refetch,
	]);

	if (isLoadingSeo || isLoadingSandbox) {
		return (
			<div className="flex justify-center items-center p-4 h-full text-sm italic rounded-lg border bg-muted">
				<TextShimmer
					as="span"
					active={true}
					duration={1.5}
					className="text-sm italic font-medium"
				>
					{isLoadingSeo ? "Loading SEO configuration..." : "Initializing..."}
				</TextShimmer>
			</div>
		);
	}

	if (sandboxStatus !== "running") {
		return (
			<div className="flex justify-center items-center p-4 h-full rounded-lg border bg-muted">
				<p className="text-sm text-muted-foreground">
					You need to run your project to configure SEO.
				</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex flex-col justify-center items-center h-full rounded-lg border bg-muted">
				<p className="text-sm text-destructive">
					Failed to load SEO configuration
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
					No SEO configuration found
				</p>
			</div>
		);
	}

	return (
		<Form {...form}>
			<div className="overflow-y-auto p-4 space-y-6 h-full rounded-lg border bg-muted">
				{/* General SEO Settings and Open Graph - Side by Side */}
				<div className="grid gap-6 pb-4 border-b lg:grid-cols-2">
					{/* General SEO Settings */}
					<div className="space-y-6">
						<div>
							<h2 className="text-lg font-medium">General SEO Settings</h2>
							<p className="text-sm text-muted-foreground">
								Settings used to optimize your page for search engines
							</p>
						</div>
						<div className="space-y-4">
							<div>
								<div className="flex gap-2 items-start">
									<FormField
										control={form.control}
										name="icon"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Icon</FormLabel>
												<FormControl>
													<Input className="sr-only" {...field} />
												</FormControl>
												{!field.value ? (
													<ImageSelect
														onChange={(url) => {
															field.onChange(
																`${NEXT_PUBLIC_R2_PUBLIC_URL}/${url}`,
															);
														}}
														className="p-0 size-8"
														buttonType="icon"
													/>
												) : (
													<ImagePreview
														src={field.value}
														handleDeselect={() => {
															field.onChange("");
														}}
														className="size-8"
													/>
												)}
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="title"
										render={({ field }) => (
											<FormItem className="flex-1">
												<FormLabel>Title</FormLabel>
												<FormControl>
													<Input {...field} className="h-8" />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
								<p className="pt-2 text-[0.8rem] text-muted-foreground">
									The icon and title displayed in search results and browser
									tabs
								</p>
							</div>

							<FormField
								control={form.control}
								name="description"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Description</FormLabel>
										<FormControl>
											<Textarea {...field} rows={4} />
										</FormControl>
										<FormDescription>
											A brief description of your page for search engines
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="canonical"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Canonical URL</FormLabel>
										<FormControl>
											<Input {...field} className="h-8" />
										</FormControl>
										<FormDescription>
											The preferred URL for this page
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="indexable"
								render={({ field }) => (
									<FormItem>
										<div className="flex justify-between items-center p-3 rounded-md border">
											<FormLabel>
												{field.value ? "Indexable" : "No Index"}
											</FormLabel>
											<FormControl>
												<Switch
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
										</div>
										<FormDescription className="text-xs">
											Whether this page should be indexed by search engines
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

					{/* Open Graph */}
					<div className="space-y-6">
						<div>
							<h2 className="text-lg font-medium">Open Graph</h2>
							<p className="text-sm text-muted-foreground">
								Settings used when your page is shared on social media platforms
							</p>
						</div>

						<div className="space-y-4">
							<FormField
								control={form.control}
								name="openGraph.title"
								render={({ field }) => (
									<FormItem>
										<FormLabel>OG Title</FormLabel>
										<FormControl>
											<Input {...field} className="h-8" />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="openGraph.url"
								render={({ field }) => (
									<FormItem>
										<FormLabel>OG URL</FormLabel>
										<FormControl>
											<Input {...field} className="h-8" />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="openGraph.description"
								render={({ field }) => (
									<FormItem>
										<FormLabel>OG Description</FormLabel>
										<FormControl>
											<Textarea {...field} rows={3} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="openGraph.image"
								render={({ field }) => (
									<FormItem>
										<FormLabel>OG Image URL</FormLabel>
										<div>
											<FormControl>
												<Input className="sr-only" {...field} />
											</FormControl>
											{!field.value ? (
												<ImageSelect
													onChange={(url) => {
														field.onChange(
															`${NEXT_PUBLIC_R2_PUBLIC_URL}/${url}`,
														);
													}}
												/>
											) : (
												<ImagePreview
													src={field.value}
													handleDeselect={() => {
														field.onChange("");
													}}
												/>
											)}
										</div>
										<FormDescription>
											Image that appears when shared on social media
											(recommended size: 1200x630)
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>
				</div>

				{/* Save Button */}
				<div className="space-y-6 max-w-lg">
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
							"Save SEO Settings"
						)}
					</Button>
					<InfoBox>
						After you save the SEO configuration, you need to{" "}
						<span className="font-medium text-primary">
							publish your landing page and campaign
						</span>{" "}
						in order to use the SEO settings in live environment.
					</InfoBox>
				</div>
			</div>
		</Form>
	);
};
