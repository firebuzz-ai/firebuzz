"use client";

import { useProject } from "@/hooks/auth/use-project";
import type { Id } from "@firebuzz/convex";
import {
	ConvexError,
	api,
	useCachedQuery,
	useMutation,
	usePaginatedQuery,
} from "@firebuzz/convex";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Card, CardContent } from "@firebuzz/ui/components/ui/card";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@firebuzz/ui/components/ui/command";
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
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@firebuzz/ui/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@firebuzz/ui/components/ui/select";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Check, ChevronDown, Info } from "@firebuzz/ui/icons/lucide";
import { cn, toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { hslToHex, sleep } from "@firebuzz/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

const formSchema = z.object({
	title: z.string().min(3, "Title must be at least 3 characters"),
	description: z.string().optional(),
	campaignId: z.string().min(1, "Campaign is required"),
	templateId: z.string().min(1, "Template is required"),
	themeId: z.string(),
});

type FormData = z.infer<typeof formSchema>;

interface LandingPageFormProps {
	onSuccess?: () => void;
	defaultCampaignId?: Id<"campaigns">;
}

// Helper function to extract colors from theme
const getThemeColors = (theme: {
	lightTheme?: {
		primary?: string;
		secondary?: string;
		accent?: string;
		background?: string;
	};
}) => {
	try {
		return [
			hslToHex(theme.lightTheme?.primary || "222.2 84% 4.9%"),
			hslToHex(theme.lightTheme?.secondary || "210 40% 96%"),
			hslToHex(theme.lightTheme?.accent || "210 40% 96%"),
			hslToHex(theme.lightTheme?.background || "0 0% 100%"),
		];
	} catch (_error) {
		// Fallback colors if conversion fails
		return ["#3b82f6", "#f1f5f9", "#f1f5f9", "#ffffff"];
	}
};

export const LandingPageForm = ({
	onSuccess,
	defaultCampaignId,
}: LandingPageFormProps) => {
	const router = useRouter();
	const { currentProject } = useProject();
	const createLandingPageMutation = useMutation(
		api.collections.landingPages.mutations.create,
	);
	const [isLoading, setIsLoading] = useState(false);
	const [themePopoverOpen, setThemePopoverOpen] = useState(false);

	const { results: campaigns } = usePaginatedQuery(
		api.collections.campaigns.queries.getPaginated,
		currentProject && !defaultCampaignId
			? {
					projectId: currentProject._id,
					sortOrder: "desc",
					searchQuery: undefined,
					isArchived: false,
					isPublished: false,
				}
			: "skip",
		{ initialNumItems: 50 },
	);

	const { results: templates } = usePaginatedQuery(
		api.collections.landingPages.templates.queries.getPaginated,
		{
			paginationOpts: {
				numItems: 50,
			},
		},
		{ initialNumItems: 50 },
	);

	const themes = useCachedQuery(api.collections.brands.themes.queries.getAll, {
		showHidden: false,
	});

	const form = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			title: "",
			description: "",
			campaignId: defaultCampaignId || "",
			templateId: "",
			themeId: "",
		},
	});

	const onSubmitHandler = async (data: FormData) => {
		if (!currentProject) {
			toast.error("Project not found", {
				id: "create-landing-page-error",
			});
			return;
		}

		try {
			setIsLoading(true);
			toast.loading("Creating landing page...", { id: "create-landing-page" });

			const landingPageId = await createLandingPageMutation({
				title: data.title,
				projectId: currentProject._id,
				campaignId: data.campaignId as Id<"campaigns">,
				templateId: data.templateId as Id<"landingPageTemplates">,
				themeId: data.themeId as Id<"themes">,
			});

			// Wait for uploading files to finish
			await sleep(2000);

			toast.success("Landing page created", {
				id: "create-landing-page",
				description: "You will be redirected to your landing page.",
			});

			// Close the modal
			onSuccess?.();

			// Redirect to the landing page editor
			router.push(`/assets/landing-pages/${landingPageId}/edit`);
		} catch (error) {
			console.error("Error creating landing page:", error);
			toast.error("Failed to create landing page", {
				id: "create-landing-page",
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
														placeholder="My Landing Page"
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
														placeholder="Landing page description"
														{...field}
														disabled={isLoading}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									{/* Campaign - Only show if not prefilled */}
									{!defaultCampaignId && (
										<FormField
											control={form.control}
											name="campaignId"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Campaign</FormLabel>
													<Select
														onValueChange={field.onChange}
														value={field.value}
													>
														<FormControl>
															<SelectTrigger className="h-8">
																<SelectValue placeholder="Select a campaign" />
															</SelectTrigger>
														</FormControl>
														<SelectContent>
															{campaigns?.map((campaign) => (
																<SelectItem
																	key={campaign._id}
																	value={campaign._id}
																>
																	{campaign.title}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
													<FormMessage />
												</FormItem>
											)}
										/>
									)}

									{/* Template */}
									<FormField
										control={form.control}
										name="templateId"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Template</FormLabel>
												<Select
													onValueChange={field.onChange}
													value={field.value}
												>
													<FormControl>
														<SelectTrigger className="h-8">
															<SelectValue placeholder="Select a template" />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{templates?.map((template) => (
															<SelectItem
																key={template._id}
																value={template._id}
															>
																{template.title}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>

									{/* Theme */}
									<FormField
										control={form.control}
										name="themeId"
										render={({ field }) => {
											const selectedTheme = themes?.find(
												(theme) => theme._id === field.value,
											);
											return (
												<FormItem>
													<FormLabel>Theme</FormLabel>
													<Popover
														open={themePopoverOpen}
														onOpenChange={setThemePopoverOpen}
													>
														<PopoverTrigger asChild>
															<FormControl>
																<Button
																	variant="outline"
																	// biome-ignore lint/a11y/useSemanticElements: <explanation>
																	role="combobox"
																	aria-expanded={themePopoverOpen}
																	className="justify-between w-full h-8 font-normal text-left"
																	disabled={isLoading}
																>
																	<div className="flex flex-1 gap-3 items-center min-w-0">
																		{selectedTheme ? (
																			<>
																				{/* Color swatches */}
																				<div className="flex gap-1 items-center shrink-0">
																					{getThemeColors(selectedTheme)
																						.slice(0, 4)
																						.map((color, index) => (
																							<div
																								key={`${selectedTheme._id}-${color}-${index}`}
																								className="rounded-sm border size-3"
																								style={{
																									backgroundColor: color,
																								}}
																							/>
																						))}
																				</div>
																				<div className="flex-1 min-w-0">
																					<div className="text-sm font-medium truncate">
																						{selectedTheme.name}
																					</div>
																				</div>
																			</>
																		) : (
																			<span className="text-muted-foreground">
																				Select a theme...
																			</span>
																		)}
																	</div>
																	<ChevronDown className="ml-2 w-4 h-4 opacity-50 shrink-0" />
																</Button>
															</FormControl>
														</PopoverTrigger>
														<PopoverContent
															className="w-[--radix-popover-trigger-width] p-0"
															align="start"
														>
															<Command>
																<CommandInput
																	placeholder="Search themes..."
																	className="h-9"
																/>
																<CommandList>
																	<CommandEmpty>No themes found.</CommandEmpty>
																	<CommandGroup>
																		{themes?.map((theme) => (
																			<CommandItem
																				key={theme._id}
																				value={theme.name}
																				onSelect={() => {
																					field.onChange(theme._id);
																					setThemePopoverOpen(false);
																				}}
																				className="cursor-pointer"
																			>
																				<div className="flex gap-3 items-center w-full">
																					<div className="flex-1 min-w-0">
																						<div className="flex gap-2 items-center">
																							<div className="text-sm font-medium">
																								{theme.name}
																							</div>
																							{/* Color swatches */}
																							<div className="flex gap-1 items-center shrink-0">
																								{getThemeColors(theme)
																									.slice(0, 4)
																									.map((color, index) => (
																										<Tooltip
																											key={`${theme._id}-${color}-${index}`}
																											disableHoverableContent
																										>
																											<TooltipTrigger asChild>
																												<div
																													className="rounded-sm border size-3"
																													style={{
																														backgroundColor:
																															color,
																													}}
																												/>
																											</TooltipTrigger>
																											<TooltipContent
																												side="top"
																												className="text-xs"
																											>
																												{color}
																											</TooltipContent>
																										</Tooltip>
																									))}
																							</div>
																						</div>
																						{theme.description && (
																							<div className="text-xs text-muted-foreground">
																								{theme.description}
																							</div>
																						)}
																					</div>

																					<Check
																						className={cn(
																							"ml-auto h-4 w-4 shrink-0",
																							field.value === theme._id
																								? "opacity-100"
																								: "opacity-0",
																						)}
																					/>
																				</div>
																			</CommandItem>
																		))}
																	</CommandGroup>
																</CommandList>
															</Command>
														</PopoverContent>
													</Popover>
													<FormMessage />
												</FormItem>
											);
										}}
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
							Landing pages help you create engaging content for your audience.
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
						"Create Landing Page"
					)}
				</Button>
			</div>
		</div>
	);
};
