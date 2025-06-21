"use client";

import { MediaGalleryModal } from "@/components/modals/media/gallery/gallery-modal";
import { ImagePreview } from "@/components/sheets/settings/landing-page/image-preview";
import { ImageSelect } from "@/components/sheets/settings/landing-page/image-select";
import { type Doc, api, useMutation } from "@firebuzz/convex";
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
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import { Moon, Sun } from "@firebuzz/ui/icons/lucide";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { useTheme } from "next-themes";
import type React from "react";
import { useCallback, useEffect } from "react";
import { z } from "zod";

// Define schema for brand identity configuration
const brandSchema = z.object({
	name: z.string().min(1, "Brand name is required"),
	website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
	description: z.string().optional(),
	persona: z.string().optional(),
	logo: z.string().optional().or(z.literal("")),
	logoDark: z.string().optional().or(z.literal("")),
	icon: z.string().optional().or(z.literal("")),
	iconDark: z.string().optional().or(z.literal("")),
	phone: z.string().optional().or(z.literal("")),
	email: z.string().email("Must be a valid email").optional().or(z.literal("")),
	address: z.string().optional().or(z.literal("")),
});

export type BrandConfigType = z.infer<typeof brandSchema>;

interface BrandIdentityProps {
	setSaveHandler: React.Dispatch<
		React.SetStateAction<(() => Promise<void>) | null>
	>;
	setUnsavedChanges: (unsavedChanges: boolean) => void;
	setIsSaving: (isSaving: boolean) => void;
	isSaving: boolean;
	isLoading: boolean;
	brand: Doc<"brands"> | null;
	setFormValues: React.Dispatch<React.SetStateAction<BrandConfigType | null>>;
}

export const BrandIdentityForm = ({
	setSaveHandler,
	setUnsavedChanges,
	setIsSaving,
	setFormValues,
	isLoading,
	brand,
	isSaving,
}: BrandIdentityProps) => {
	const updateBrand = useMutation(api.collections.brands.mutations.update);
	const theme = useTheme();
	const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();

	const form = useForm<BrandConfigType>({
		resolver: zodResolver(brandSchema),
		defaultValues: {
			name: "",
			website: "",
			description: "",
			persona: "",
			logo: "",
			logoDark: "",
			icon: "",
			iconDark: "",
			phone: "",
			email: "",
			address: "",
		},
		mode: "onChange",
		shouldUseNativeValidation: false,
	});

	// Track form values for real-time preview
	useEffect(() => {
		const subscription = form.watch((value) => {
			setFormValues(value as BrandConfigType);
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

			// Update the brand
			await updateBrand({
				id: brand._id,
				name: data.name,
				website: data.website || undefined,
				description: data.description || undefined,
				persona: data.persona || undefined,
				logo: data.logo || undefined,
				logoDark: data.logoDark || undefined,
				icon: data.icon || undefined,
				iconDark: data.iconDark || undefined,
				phone: data.phone || undefined,
				email: data.email || undefined,
				address: data.address || undefined,
			});

			// Reset form dirty state
			form.reset(data);

			toast.success("Brand identity updated successfully");
		} catch (error) {
			console.error("Failed to update brand identity:", error);
			toast.error("Failed to update brand identity");
			throw error;
		} finally {
			setIsSaving(false);
		}
	}, [form, brand, updateBrand, setIsSaving, isSaving]);

	// Reset form when brand data changes
	useEffect(() => {
		if (brand) {
			form.reset({
				name: brand.name || "",
				website: brand.website || "",
				description: brand.description || "",
				persona: brand.persona || "",
				logo: brand.logo || "",
				logoDark: brand.logoDark || "",
				icon: brand.icon || "",
				iconDark: brand.iconDark || "",
				phone: brand.phone || "",
				email: brand.email || "",
				address: brand.address || "",
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
			<div className="flex items-center justify-center flex-1">
				<Spinner size="sm" />
			</div>
		);
	}

	return (
		<div className="flex-1 w-full max-h-full py-4 overflow-y-auto">
			<Form {...form}>
				<form onSubmit={(e) => e.preventDefault()}>
					<div className="px-4 pt-4 pb-8 space-y-6 border-b">
						<div>
							<h2 className="text-lg font-medium">Brand Identity</h2>
							<p className="text-sm text-muted-foreground">
								Define your brand&apos;s core identity and visual elements
							</p>
						</div>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Brand Name</FormLabel>
										<FormControl>
											<Input className="!h-8" {...field} disabled={isLoading} />
										</FormControl>
										<FormDescription>
											The primary name of your brand
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="website"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Website URL</FormLabel>
										<FormControl>
											<Input
												{...field}
												disabled={isLoading}
												className="!h-8"
												placeholder="https://example.com"
												type="url"
											/>
										</FormControl>
										<FormDescription>
											Your brand&apos;s primary website URL
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="description"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Brand Description</FormLabel>
										<FormControl>
											<Textarea {...field} disabled={isLoading} rows={4} />
										</FormControl>
										<FormDescription>
											A brief description of what your brand represents
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="persona"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Brand Persona</FormLabel>
										<FormControl>
											<Textarea {...field} disabled={isLoading} rows={6} />
										</FormControl>
										<FormDescription>
											Define your brand&apos;s personality, voice, tone, and
											characteristics. This helps maintain consistency across
											all communications.
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

					<div className="px-4 pt-8 pb-8 space-y-8 border-b">
						<div>
							<h2 className="text-lg font-medium">Visual Identity</h2>
							<p className="text-sm text-muted-foreground">
								Upload and manage your brand&apos;s visual assets
							</p>
						</div>

						<div className="grid gap-6 md:grid-cols-2">
							<FormField
								control={form.control}
								name="logo"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											<div className="flex items-center justify-between">
												Logo
												<Badge
													variant={
														theme.resolvedTheme === "dark"
															? "default"
															: "outline"
													}
												>
													<Sun className="mr-1 size-3" />
													Light
												</Badge>
											</div>
										</FormLabel>
										<div>
											<FormControl>
												<Input
													className="sr-only"
													{...field}
													disabled={isLoading}
												/>
											</FormControl>
											{!field.value ? (
												<ImageSelect
													allowedSources={["gallery", "upload"]}
													activeTab="upload"
													onChange={field.onChange}
												/>
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
											Your primary brand logo (recommended: SVG or PNG with
											transparent background)
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="logoDark"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											<div className="flex items-center justify-between">
												Logo
												<Badge
													variant={
														theme.resolvedTheme === "dark"
															? "outline"
															: "default"
													}
												>
													<Moon className="mr-1 size-3" />
													Dark
												</Badge>
											</div>
										</FormLabel>
										<div>
											<FormControl>
												<Input
													className="sr-only"
													{...field}
													disabled={isLoading}
												/>
											</FormControl>
											{!field.value ? (
												<ImageSelect
													allowedSources={["gallery", "upload"]}
													activeTab="upload"
													onChange={field.onChange}
												/>
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
											Logo variant for dark backgrounds (optional, falls back to
											primary logo)
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="icon"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											<div className="flex items-center justify-between">
												Icon
												<Badge
													variant={
														theme.resolvedTheme === "dark"
															? "default"
															: "outline"
													}
												>
													<Sun className="mr-1 size-3" />
													Light
												</Badge>
											</div>
										</FormLabel>
										<div>
											<FormControl>
												<Input
													className="sr-only"
													{...field}
													disabled={isLoading}
												/>
											</FormControl>
											{!field.value ? (
												<ImageSelect
													allowedSources={["gallery", "upload"]}
													activeTab="upload"
													onChange={field.onChange}
												/>
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
											A simplified icon version of your brand (recommended:
											square format)
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="iconDark"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											<div className="flex items-center justify-between">
												Icon
												<Badge
													variant={
														theme.resolvedTheme === "dark"
															? "outline"
															: "default"
													}
												>
													<Moon className="mr-1 size-3" />
													Dark
												</Badge>
											</div>
										</FormLabel>
										<div>
											<FormControl>
												<Input
													className="sr-only"
													{...field}
													disabled={isLoading}
												/>
											</FormControl>
											{!field.value ? (
												<ImageSelect
													allowedSources={["gallery", "upload"]}
													activeTab="upload"
													onChange={field.onChange}
												/>
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
											Icon variant for dark backgrounds (optional, falls back to
											primary icon)
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

					<div className="px-4 pt-8 pb-4 space-y-8">
						<div>
							<h2 className="text-lg font-medium">Contact Information</h2>
							<p className="text-sm text-muted-foreground">
								Add your brand's contact details
							</p>
						</div>

						<div className="space-y-4">
							<FormField
								control={form.control}
								name="phone"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Phone Number</FormLabel>
										<FormControl>
											<Input
												{...field}
												disabled={isLoading}
												className="!h-8"
												type="tel"
												placeholder="+1 (555) 000-0000"
											/>
										</FormControl>
										<FormDescription>
											Your brand's contact phone number
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email Address</FormLabel>
										<FormControl>
											<Input
												{...field}
												disabled={isLoading}
												className="!h-8"
												type="email"
												placeholder="contact@yourbrand.com"
											/>
										</FormControl>
										<FormDescription>
											Primary contact email for your brand
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="address"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Address</FormLabel>
										<FormControl>
											<Textarea
												{...field}
												disabled={isLoading}
												placeholder="123 Business Street&#10;City, State 12345&#10;Country"
												rows={3}
											/>
										</FormControl>
										<FormDescription>
											Your brand's physical address
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
