import { api, useMutation } from "@firebuzz/convex";
import type { Id } from "@firebuzz/convex/nextjs";
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
import { useAtomValue, useSetAtom } from "jotai";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { parsedFilesAtom, tagsConfigAtom } from "@/lib/workbench/atoms";
import { getWebcontainerInstance } from "@/lib/workbench/webcontainer";

// Define schema for Tags configuration
const tagsSchema = z.object({
	googleTagManagerId: z.string().nullable(),
	googleAnalyticsId: z.string().nullable(),
	googleSiteVerificationId: z.string().nullable(),
	facebookPixelId: z.string().nullable(),
});

export type TagsConfigType = z.infer<typeof tagsSchema>;

interface TagsTabProps {
	landingPageId: Id<"landingPages">;
	setSaveHandler: React.Dispatch<
		React.SetStateAction<(() => Promise<void>) | null>
	>;
	setUnsavedChanges: (unsavedChanges: boolean) => void;
}

export const TagsTab = ({
	landingPageId,
	setSaveHandler,
	setUnsavedChanges,
}: TagsTabProps) => {
	const [isLoading, setIsLoading] = useState(false);
	const tagsConfig = useAtomValue(tagsConfigAtom);
	const setParsedFiles = useSetAtom(parsedFilesAtom);
	const updateCurrentVersionFiles = useMutation(
		api.collections.landingPages.versions.mutations.updateCurrentVersionFiles,
	);

	// Parse the Tags configuration string to get the object
	const parsedConfig = useMemo(() => {
		if (!tagsConfig?.content) return null;

		// Extract the configuration object from the string
		const configStr = tagsConfig.content;
		const match = configStr.match(
			/export const tagsConfiguration = ({[\s\S]*?});/,
		);
		if (!match || !match[1]) return null;

		try {
			// Use Function constructor to safely evaluate the object expression
			const obj = new Function(`return ${match[1]}`)();
			return obj as TagsConfigType;
		} catch (error) {
			console.error("Failed to parse Tags configuration:", error);
			return null;
		}
	}, [tagsConfig?.content]);

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

	// Save handler that will be exposed to parent component
	const handleSave = useCallback(async (): Promise<void> => {
		try {
			if (!tagsConfig) {
				throw new Error("Tags configuration not found");
			}

			const webcontainerInstance = await getWebcontainerInstance();

			setIsLoading(true);

			// Validate the form
			const valid = await form.trigger();
			if (!valid) {
				throw new Error("Form validation failed");
			}

			// Get form values
			const data = form.getValues();

			// Prepare the updated configuration string
			const configString = `
    // LLM Directives:
    // - You are not allowed to change any key in the tagsConfiguration object
    // - If user requests to change a tag, you should notfiy users they can change the tags in settings > Tags

    export const tagsConfiguration = ${JSON.stringify(data, null, 2)};
    `.trim();

			// Write the file to the webcontainer
			await webcontainerInstance.fs.writeFile(
				`${landingPageId}/${tagsConfig.path}`,
				configString,
			);

			// Get All Files
			const files = await webcontainerInstance.export(`${landingPageId}`, {
				excludes: ["node_modules", "dist", "build", "public", "false"],
			});

			// Update parsed files state
			setParsedFiles((prev) => {
				return new Map(prev).set(tagsConfig.path, {
					path: tagsConfig.path,
					content: configString,
					extension: "ts",
				});
			});

			// Save the files to the database
			await updateCurrentVersionFiles({
				landingPageId,
				filesString: JSON.stringify(files),
			});

			toast.success("Tags configuration updated");
		} catch (error) {
			console.error("Failed to update Tags configuration:", error);
			toast.error("Failed to update Tags configuration");
			throw error;
		} finally {
			setIsLoading(false);
		}
	}, [
		form,
		landingPageId,
		tagsConfig,
		setParsedFiles,
		updateCurrentVersionFiles,
	]);

	useEffect(() => {
		setSaveHandler(() => handleSave);
	}, [handleSave, setSaveHandler]);

	useEffect(() => {
		setUnsavedChanges(form.formState.isDirty);
	}, [form.formState.isDirty, setUnsavedChanges]);

	if (!parsedConfig) {
		return (
			<div className="flex justify-center items-center h-48">
				<Spinner />
				<span className="ml-2">Loading Tags configuration...</span>
			</div>
		);
	}

	return (
		<Form {...form}>
			<div className="p-4 space-y-6">
				<div>
					<h3 className="text-lg font-medium">Marketing Tags</h3>
					<p className="text-sm text-muted-foreground">
						Configure marketing and analytics tags for your landing page
					</p>
				</div>

				<div className="grid gap-6">
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
										disabled={isLoading}
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
										disabled={isLoading}
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
										disabled={isLoading}
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
										disabled={isLoading}
									/>
								</FormControl>
								<FormDescription>
									Facebook Pixel ID for conversion tracking
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
			</div>
		</Form>
	);
};
