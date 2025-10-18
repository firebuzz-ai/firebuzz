"use client";

import { MediaGalleryModal } from "@/components/modals/media/gallery/gallery-modal";
import { ImagePreview } from "@/components/reusables/image-preview";
import { ImageSelect } from "@/components/reusables/image-select";
import { api, type Doc, useMutation } from "@firebuzz/convex";
import { envCloudflarePublic } from "@firebuzz/env";
import { Badge } from "@firebuzz/ui/components/ui/badge";
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
import { Label } from "@firebuzz/ui/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@firebuzz/ui/components/ui/select";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Switch } from "@firebuzz/ui/components/ui/switch";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import type React from "react";
import { useCallback, useEffect } from "react";
import { z } from "zod";

// Define schema for SEO configuration based on the convex schema
const seoSchema = z.object({
	metaTitleTemplate: z.string().optional(),
	metaTitleDivider: z.enum(["|", "-", "•", ":"]).optional(),
	favicon: z.string().optional().or(z.literal("")),
	metaTitle: z.string().optional(),
	metaDescription: z.string().optional(),
	noIndex: z.boolean().optional(),
	noFollow: z.boolean().optional(),
	opengraph: z
		.object({
			title: z.string().optional(),
			description: z.string().optional(),
			image: z.string().optional().or(z.literal("")),
			url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
			type: z.string().optional(),
		})
		.optional(),
	twitterCard: z
		.object({
			title: z.string().optional(),
			description: z.string().optional(),
			image: z.string().optional().or(z.literal("")),
			url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
			type: z.string().optional(),
		})
		.optional(),
});

export type BrandSeoType = z.infer<typeof seoSchema>;

interface BrandSeoFormProps {
	setSaveHandler: React.Dispatch<
		React.SetStateAction<(() => Promise<void>) | null>
	>;
	setUnsavedChanges: (unsavedChanges: boolean) => void;
	setIsSaving: (isSaving: boolean) => void;
	isSaving: boolean;
	isLoading: boolean;
	brand: Doc<"brands"> | null;
	setFormValues: React.Dispatch<React.SetStateAction<BrandSeoType | null>>;
	pageTitle: string;
	setPageTitle: React.Dispatch<React.SetStateAction<string>>;
}

export const BrandSeoForm = ({
	setSaveHandler,
	setUnsavedChanges,
	setIsSaving,
	setFormValues,
	isLoading,
	brand,
	isSaving,
	pageTitle,
	setPageTitle,
}: BrandSeoFormProps) => {
	const updateBrand = useMutation(api.collections.brands.mutations.update);
	const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();

	const form = useForm<BrandSeoType>({
		resolver: zodResolver(seoSchema),
		defaultValues: {
			metaTitleTemplate: "",
			metaTitleDivider: "|",
			favicon: "",
			metaTitle: "",
			metaDescription: "",
			noIndex: false,
			noFollow: false,
			opengraph: {
				title: "",
				description: "",
				image: "",
				type: "website",
			},
			twitterCard: {
				title: "",
				description: "",
				image: "",
				type: "summary_large_image",
			},
		},
		mode: "onChange",
		shouldUseNativeValidation: false,
	});

	// Track form values for real-time preview
	useEffect(() => {
		const subscription = form.watch((value) => {
			setFormValues(value as BrandSeoType);
		});
		return () => subscription.unsubscribe();
	}, [form, setFormValues]);

	// Save handler that will be exposed to parent component
	const handleSave = useCallback(async (): Promise<void> => {
		if (isSaving) return;
		try {
			if (!brand) {
				throw new Error("Brand not found");
			}

			setIsSaving(true);

			// Validate the form
			const valid = await form.trigger();
			if (!valid) {
				throw new Error("Form validation failed");
			}

			// Get form values
			const data = form.getValues();

			// Transform data to match the expected format
			const seoData = {
				metaTitleTemplate: data.metaTitleTemplate || undefined,
				metaTitleDivider: data.metaTitleDivider || undefined,
				favicon: data.favicon || undefined,
				metaTitle: data.metaTitle || undefined,
				metaDescription: data.metaDescription || undefined,
				noIndex: data.noIndex,
				noFollow: data.noFollow,
				opengraph: data.opengraph
					? {
							title: data.opengraph.title || undefined,
							description: data.opengraph.description || undefined,
							image: data.opengraph.image || undefined,
							type: data.opengraph.type || undefined,
						}
					: undefined,
				twitterCard: data.twitterCard
					? {
							title: data.twitterCard.title || undefined,
							description: data.twitterCard.description || undefined,
							image: data.twitterCard.image || undefined,
							type: data.twitterCard.type || undefined,
						}
					: undefined,
			};

			// Update the brand with SEO data
			await updateBrand({
				id: brand._id,
				seo: seoData,
			});

			// Reset form dirty state
			form.reset(data);

			toast.success("SEO settings updated successfully");
		} catch (error) {
			console.error("Failed to update SEO settings:", error);
			toast.error("Failed to update SEO settings");
			throw error;
		} finally {
			setIsSaving(false);
		}
	}, [form, brand, updateBrand, setIsSaving, isSaving]);

	// Reset form when brand data loads
	useEffect(() => {
		if (brand?.seo) {
			const seo = brand.seo;
			form.reset({
				metaTitleTemplate: seo.metaTitleTemplate || "",
				metaTitleDivider: seo.metaTitleDivider || "|",
				favicon: seo.favicon || "",
				metaTitle: seo.metaTitle || "",
				metaDescription: seo.metaDescription || "",
				noIndex: seo.noIndex || false,
				noFollow: seo.noFollow || false,
				opengraph: {
					title: seo.opengraph?.title || "",
					description: seo.opengraph?.description || "",
					image: seo.opengraph?.image || "",

					type: seo.opengraph?.type || "website",
				},
				twitterCard: {
					title: seo.twitterCard?.title || "",
					description: seo.twitterCard?.description || "",
					image: seo.twitterCard?.image || "",
					type: seo.twitterCard?.type || "summary_large_image",
				},
			});
		}
	}, [brand, form]);

	// Set up save handler for parent component
	useEffect(() => {
		if (setSaveHandler) {
			setSaveHandler(() => handleSave);
		}
	}, [handleSave, setSaveHandler]);

	// Track unsaved changes
	useEffect(() => {
		if (setUnsavedChanges) {
			setUnsavedChanges(form.formState.isDirty);
		}
	}, [form.formState.isDirty, setUnsavedChanges]);

	// Loading state
	if (isLoading) {
		return (
			<div className="flex flex-1 justify-center items-center">
				<Spinner size="sm" />
			</div>
		);
	}

	return (
		<div className="overflow-y-auto flex-1 py-4 w-full max-h-full">
			<Form {...form}>
				<form onSubmit={(e) => e.preventDefault()}>
					{/* Meta Title Template */}
					<div className="px-4 pt-4 pb-8 space-y-6 border-b">
						<div>
							<h2 className="text-lg font-medium">Meta Title Template</h2>
							<p className="text-sm text-muted-foreground">
								Configure how page titles are generated across your landing
								pages
							</p>
						</div>
						<div className="flex gap-4 items-baseline">
							<div className="flex-1 space-y-2">
								<div className="flex gap-2 justify-between items-center">
									<Label>Page Title</Label>{" "}
									<Badge variant="outline">Placeholder</Badge>
								</div>
								<Input
									className="!h-8"
									placeholder="Home"
									value={pageTitle}
									onChange={(e) => setPageTitle(e.target.value)}
								/>
								<p className="text-xs text-muted-foreground">
									This will be <span className="font-bold">replaced</span> with
									the landing page title
								</p>
							</div>

							<FormField
								control={form.control}
								name="metaTitleDivider"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Divider</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger className="!h-8">
													<SelectValue placeholder="Select divider" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="|">| (Pipe)</SelectItem>
												<SelectItem value="-">- (Dash)</SelectItem>
												<SelectItem value="•">• (Bullet)</SelectItem>
												<SelectItem value=":">: (Colon)</SelectItem>
											</SelectContent>
										</Select>
										<FormDescription>Seperator</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="metaTitleTemplate"
								render={({ field }) => (
									<FormItem className="flex-1">
										<FormLabel>Brand Name</FormLabel>
										<FormControl>
											<Input
												className="!h-8"
												placeholder="Your Brand Name {divider} {title}"
												{...field}
												disabled={isLoading}
											/>
										</FormControl>
										<FormDescription>
											Template for generating page titles
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

					{/* Basic SEO Settings */}
					<div className="px-4 py-8 space-y-6 border-b">
						<div>
							<Badge>Fallback</Badge>
							<h2 className="mt-1 text-lg font-medium">SEO Settings</h2>
							<p className="text-sm text-muted-foreground">
								Configure your brand&apos;s default search engine optimization
								settings
							</p>
						</div>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="metaTitle"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Meta Title</FormLabel>
										<FormControl>
											<Input
												className="!h-8"
												placeholder="Your brand's SEO title"
												{...field}
												disabled={isLoading}
											/>
										</FormControl>
										<FormDescription>
											The title that appears in search engine results (50-60
											characters recommended)
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="metaDescription"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Meta Description</FormLabel>
										<FormControl>
											<Textarea
												placeholder="Brief description of your brand for search engines"
												className="resize-none"
												rows={3}
												{...field}
												disabled={isLoading}
											/>
										</FormControl>
										<FormDescription>
											The description that appears in search results (150-160
											characters recommended)
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="favicon"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Favicon</FormLabel>
										<div>
											<FormControl>
												<Input
													className="sr-only"
													{...field}
													disabled={isLoading}
												/>
											</FormControl>
											{!field.value ? (
												<ImageSelect onChange={field.onChange} />
											) : (
												<ImagePreview
													src={`${NEXT_PUBLIC_R2_PUBLIC_URL}/${field.value}`}
													handleDeselect={() => {
														field.onChange("");
													}}
												/>
											)}
										</div>
										<FormDescription>
											Small icon displayed in browser tabs and bookmarks
											(16x16px or 32x32px recommended)
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="flex gap-6">
								<FormField
									control={form.control}
									name="noIndex"
									render={({ field }) => (
										<FormItem className="flex flex-row flex-1 justify-between items-center p-4 rounded-lg border">
											<div className="space-y-0.5">
												<FormLabel className="text-base">No Index</FormLabel>
												<FormDescription>
													Prevent search engines from indexing this page
												</FormDescription>
											</div>
											<FormControl>
												<Switch
													checked={field.value}
													onCheckedChange={field.onChange}
													disabled={isLoading}
												/>
											</FormControl>
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="noFollow"
									render={({ field }) => (
										<FormItem className="flex flex-row flex-1 justify-between items-center p-4 rounded-lg border">
											<div className="space-y-0.5">
												<FormLabel className="text-base">No Follow</FormLabel>
												<FormDescription>
													Prevent search engines from following links on this
													page
												</FormDescription>
											</div>
											<FormControl>
												<Switch
													checked={field.value}
													onCheckedChange={field.onChange}
													disabled={isLoading}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
							</div>
						</div>
					</div>

					{/* OpenGraph Settings */}
					<div className="px-4 py-8 space-y-6 border-b">
						<div>
							<Badge>Fallback</Badge>
							<h2 className="mt-1 text-lg font-medium">OpenGraph Settings</h2>
							<p className="text-sm text-muted-foreground">
								Configure how your content appears when shared on social media
								platforms
							</p>
						</div>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="opengraph.title"
								render={({ field }) => (
									<FormItem>
										<FormLabel>OG Title</FormLabel>
										<FormControl>
											<Input
												className="!h-8"
												placeholder="Title for social media sharing"
												{...field}
												disabled={isLoading}
											/>
										</FormControl>
										<FormDescription>
											Title that appears when shared on social media
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="opengraph.description"
								render={({ field }) => (
									<FormItem>
										<FormLabel>OG Description</FormLabel>
										<FormControl>
											<Textarea
												placeholder="Description for social media sharing"
												className="resize-none"
												rows={3}
												{...field}
												disabled={isLoading}
											/>
										</FormControl>
										<FormDescription>
											Description that appears when shared on social media
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="opengraph.image"
								render={({ field }) => (
									<FormItem>
										<FormLabel>OG Image</FormLabel>
										<div>
											<FormControl>
												<Input
													className="sr-only"
													{...field}
													disabled={isLoading}
												/>
											</FormControl>
											{!field.value ? (
												<ImageSelect onChange={field.onChange} />
											) : (
												<ImagePreview
													src={`${NEXT_PUBLIC_R2_PUBLIC_URL}/${field.value}`}
													handleDeselect={() => {
														field.onChange("");
													}}
												/>
											)}
										</div>
										<FormDescription>
											Image that appears when shared on social media (1200x630px
											recommended)
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="opengraph.type"
								render={({ field }) => (
									<FormItem>
										<FormLabel>OG Type</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger className="!h-8">
													<SelectValue placeholder="Select content type" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="website">Website</SelectItem>
												<SelectItem value="article">Article</SelectItem>
												<SelectItem value="profile">Profile</SelectItem>
												<SelectItem value="video">Video</SelectItem>
												<SelectItem value="music">Music</SelectItem>
											</SelectContent>
										</Select>
										<FormDescription>
											Type of content for OpenGraph
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

					{/* Twitter Card Settings */}
					<div className="px-4 pt-8 pb-4 space-y-6">
						<div>
							<Badge>Fallback</Badge>
							<h2 className="mt-1 text-lg font-medium">
								Twitter Card Settings
							</h2>
							<p className="text-sm text-muted-foreground">
								Configure how your content appears when shared on Twitter/X
							</p>
						</div>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="twitterCard.title"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Twitter Title</FormLabel>
										<FormControl>
											<Input
												className="!h-8"
												placeholder="Title for Twitter sharing"
												{...field}
												disabled={isLoading}
											/>
										</FormControl>
										<FormDescription>
											Title that appears when shared on Twitter
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="twitterCard.description"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Twitter Description</FormLabel>
										<FormControl>
											<Textarea
												placeholder="Description for Twitter sharing"
												className="resize-none"
												rows={3}
												{...field}
												disabled={isLoading}
											/>
										</FormControl>
										<FormDescription>
											Description that appears when shared on Twitter
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="twitterCard.image"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Twitter Image</FormLabel>
										<div>
											<FormControl>
												<Input
													className="sr-only"
													{...field}
													disabled={isLoading}
												/>
											</FormControl>
											{!field.value ? (
												<ImageSelect onChange={field.onChange} />
											) : (
												<ImagePreview
													src={`${NEXT_PUBLIC_R2_PUBLIC_URL}/${field.value}`}
													handleDeselect={() => {
														field.onChange("");
													}}
												/>
											)}
										</div>
										<FormDescription>
											Image that appears when shared on Twitter (1200x675px
											recommended)
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="twitterCard.type"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Twitter Card Type</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger className="!h-8">
													<SelectValue placeholder="Select card type" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="summary">Summary</SelectItem>
												<SelectItem value="summary_large_image">
													Summary Large Image
												</SelectItem>
												<SelectItem value="app">App</SelectItem>
												<SelectItem value="player">Player</SelectItem>
											</SelectContent>
										</Select>
										<FormDescription>
											Type of Twitter card to display
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>
				</form>
			</Form>

			<MediaGalleryModal />
		</div>
	);
};
