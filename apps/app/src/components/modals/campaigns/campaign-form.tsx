"use client";

import { useProject } from "@/hooks/auth/use-project";
import type { Id } from "@firebuzz/convex";
import { ConvexError, api, useMutation } from "@firebuzz/convex";
import { LocaleSelector } from "@firebuzz/ui/components/reusable/locale-selector";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Card, CardContent } from "@firebuzz/ui/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@firebuzz/ui/components/ui/form";
import { Input } from "@firebuzz/ui/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@firebuzz/ui/components/ui/select";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import { Database, Info, MousePointerClick } from "@firebuzz/ui/icons/lucide";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { slugify } from "@firebuzz/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

const formSchema = z.object({
	title: z.string().min(3, "Title must be at least 3 characters"),
	slug: z.string().min(3, "Slug must be at least 3 characters"),
	description: z.string().optional(),
	type: z.enum(["lead-generation", "click-through"], {
		required_error: "Campaign type is required",
	}),
	primaryLanguage: z.string(),
});

type FormData = z.infer<typeof formSchema>;

interface CampaignFormProps {
	onSuccess?: () => void;
	defaultProjectId?: Id<"projects">;
}

export const CampaignForm = ({
	onSuccess,
	defaultProjectId,
}: CampaignFormProps) => {
	const router = useRouter();
	const { currentProject } = useProject();
	const createCampaignMutation = useMutation(
		api.collections.campaigns.mutations.create,
	);
	const [isLoading, setIsLoading] = useState(false);

	const form = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			title: "",
			slug: "",
			description: "",
			type: "lead-generation",
			primaryLanguage: "en-US",
		},
	});

	const onSubmitHandler = async (data: FormData) => {
		const projectId = defaultProjectId || currentProject?._id;

		if (!projectId) {
			toast.error("Project not found", {
				id: "create-campaign-error",
			});
			return;
		}

		try {
			setIsLoading(true);
			toast.loading("Creating campaign...", { id: "create-campaign" });

			const campaignId = await createCampaignMutation({
				title: data.title,
				type: data.type,
				projectId: projectId,
				slug: data.slug,
				primaryLanguage: data.primaryLanguage,
			});

			toast.success("Campaign created", {
				id: "create-campaign",
				description: "You will be redirected to your campaign.",
			});

			// Close the modal
			onSuccess?.();

			// Redirect to the campaign editor
			router.push(`/campaigns/${campaignId}/edit`);
		} catch (error) {
			console.error("Error creating campaign:", error);
			toast.error("Failed to create campaign", {
				id: "create-campaign",
				description:
					error instanceof ConvexError
						? error.data
						: "Unexpected error occurred",
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex overflow-hidden flex-col flex-1 h-full">
			<div className="overflow-auto flex-1 p-4">
				<div className="flex flex-col justify-center items-center">
					<Card className="w-full">
						<CardContent className="pt-6">
							<Form {...form}>
								<form
									className="space-y-4"
									onSubmit={form.handleSubmit(onSubmitHandler)}
								>
									{/* Title */}
									<FormField
										control={form.control}
										name="title"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Title</FormLabel>
												<FormControl>
													<Input
														className="h-8"
														placeholder="My Campaign"
														{...field}
														disabled={isLoading}
														onChange={(e) => {
															field.onChange(e);
															// Auto-generate slug from title
															form.setValue("slug", slugify(e.target.value));
														}}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									{/* Slug */}
									<FormField
										control={form.control}
										name="slug"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Slug</FormLabel>
												<FormControl>
													<Input
														className="h-8"
														placeholder="my-campaign"
														{...field}
														disabled={isLoading}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									{/* Description */}
									<FormField
										control={form.control}
										name="description"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Description</FormLabel>
												<FormControl>
													<Textarea
														className="resize-none"
														placeholder="Campaign description"
														{...field}
														disabled={isLoading}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									{/* Campaign Type */}
									<FormField
										control={form.control}
										name="type"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Campaign Type</FormLabel>
												<Select
													onValueChange={field.onChange}
													value={field.value}
												>
													<FormControl>
														<SelectTrigger className="h-8">
															<div className="flex gap-2 items-center">
																{field.value === "click-through" ? (
																	<MousePointerClick className="size-3.5" />
																) : (
																	<Database className="size-3.5" />
																)}
																<SelectValue placeholder="Select campaign type" />
															</div>
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														<SelectItem value="lead-generation">
															Lead Generation{" "}
															<span className="text-xs text-muted-foreground">
																- Collect leads from your landing page.
															</span>
														</SelectItem>
														<SelectItem value="click-through">
															Click Through{" "}
															<span className="text-xs text-muted-foreground">
																- Redirect users to a specific URL.
															</span>
														</SelectItem>
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>

									{/* Primary Language */}
									<FormField
										control={form.control}
										name="primaryLanguage"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Primary Language</FormLabel>
												<FormControl>
													<LocaleSelector
														defaultValue={field.value}
														onLocaleChange={field.onChange}
														className="h-8"
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</form>
							</Form>
						</CardContent>
					</Card>

					{/* Information */}
					<div className="flex gap-2 items-center p-3 mt-4 w-full rounded-lg border border-border">
						<div className="p-1.5 rounded-md bg-muted border border-border">
							<Info className="w-3.5 h-3.5" />
						</div>
						<div className="text-sm text-muted-foreground">
							Campaigns help you organize and track your marketing efforts.
						</div>
					</div>
				</div>
			</div>

			{/* Footer with Submit Button */}
			<div className="p-4 border-t">
				<Button
					type="submit"
					size="sm"
					variant="outline"
					className="w-full"
					onClick={form.handleSubmit(onSubmitHandler)}
					disabled={isLoading}
				>
					{isLoading ? (
						<div className="flex gap-2 items-center">
							<Spinner size="xs" variant="default" />
							Creating...
						</div>
					) : (
						"Create Campaign"
					)}
				</Button>
			</div>
		</div>
	);
};
