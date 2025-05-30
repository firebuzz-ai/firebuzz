"use client";

import type { Doc } from "@firebuzz/convex";
import { api, useMutation } from "@firebuzz/convex";
import { Button } from "@firebuzz/ui/components/ui/button";
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
	FormDescription,
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
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Check, ChevronsUpDown, ExternalLink } from "@firebuzz/ui/icons/lucide";
import {
	DevToIcon,
	DiscordIcon,
	DribbbleIcon,
	FacebookIcon,
	GitHubIcon,
	GitLabIcon,
	HashnodeIcon,
	InstagramIcon,
	LinkedInIcon,
	MediumIcon,
	PinterestIcon,
	RedditIcon,
	SnapchatIcon,
	StackOverflowIcon,
	TikTokIcon,
	TwitchIcon,
	TwitterIcon,
	YouTubeIcon,
} from "@firebuzz/ui/icons/social";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

// Define schema for social creation based on the convex schema
const socialSchema = z.object({
	platform: z.enum(
		[
			"facebook",
			"instagram",
			"twitter",
			"linkedin",
			"youtube",
			"tiktok",
			"pinterest",
			"snapchat",
			"reddit",
			"discord",
			"twitch",
			"dribbble",
			"github",
			"gitlab",
			"medium",
			"devto",
			"hashnode",
			"stackoverflow",
		],
		{
			required_error: "Please select a platform",
		},
	),
	handle: z.string().min(1, "Handle is required"),
	url: z.string().url("Please enter a valid URL"),
});

export type SocialFormType = z.infer<typeof socialSchema>;

interface SocialFormProps {
	setSaveHandler: React.Dispatch<
		React.SetStateAction<(() => Promise<void>) | null>
	>;
	isCreating: boolean;
	initialValues?: Partial<Doc<"socials">>;
	socialId?: Doc<"socials">["_id"];
	mode?: "create" | "edit";
}

const platformLabels: Record<string, string> = {
	facebook: "Facebook",
	instagram: "Instagram",
	twitter: "Twitter / X",
	linkedin: "LinkedIn",
	youtube: "YouTube",
	tiktok: "TikTok",
	pinterest: "Pinterest",
	snapchat: "Snapchat",
	reddit: "Reddit",
	discord: "Discord",
	twitch: "Twitch",
	dribbble: "Dribbble",
	github: "GitHub",
	gitlab: "GitLab",
	medium: "Medium",
	devto: "Dev.to",
	hashnode: "Hashnode",
	stackoverflow: "Stack Overflow",
};

// Platform icons mapping
const platformIcons: Record<
	string,
	React.ComponentType<{ className?: string }>
> = {
	facebook: FacebookIcon,
	instagram: InstagramIcon,
	twitter: TwitterIcon,
	linkedin: LinkedInIcon,
	youtube: YouTubeIcon,
	tiktok: TikTokIcon,
	pinterest: PinterestIcon,
	snapchat: SnapchatIcon,
	reddit: RedditIcon,
	discord: DiscordIcon,
	twitch: TwitchIcon,
	dribbble: DribbbleIcon,
	github: GitHubIcon,
	gitlab: GitLabIcon,
	medium: MediumIcon,
	devto: DevToIcon,
	hashnode: HashnodeIcon,
	stackoverflow: StackOverflowIcon,
};

export const SocialForm = ({
	setSaveHandler,
	isCreating,
	initialValues,
	socialId,
	mode = "create",
}: SocialFormProps) => {
	const [isCommandOpen, setIsCommandOpen] = useState(false);
	const createSocial = useMutation(
		api.collections.brands.socials.mutations.create,
	);
	const updateSocial = useMutation(
		api.collections.brands.socials.mutations.update,
	);

	const form = useForm<SocialFormType>({
		resolver: zodResolver(socialSchema),
		defaultValues: {
			platform: initialValues?.platform || undefined,
			handle: initialValues?.handle || "",
			url: initialValues?.url || "",
		},
		mode: "onChange",
		shouldUseNativeValidation: false,
	});

	// Save handler that will be exposed to parent component
	const handleSave = useCallback(async (): Promise<void> => {
		if (isCreating) return;

		// Validate the form
		const valid = await form.trigger();
		if (!valid) {
			toast.error("Please fill in all fields correctly", {
				id: mode === "create" ? "create-social" : "update-social",
			});
			throw new Error("Validation failed");
		}

		// Get form values
		const data = form.getValues();

		if (mode === "edit" && socialId) {
			// Update the social
			await updateSocial({
				id: socialId,
				platform: data.platform,
				handle: data.handle,
				url: data.url,
			});

			toast.success("Social account updated successfully", {
				id: "update-social",
			});
		} else {
			// Create the social
			await createSocial({
				platform: data.platform,
				handle: data.handle,
				url: data.url,
			});

			toast.success("Social account added successfully", {
				id: "create-social",
			});
		}
	}, [form, createSocial, updateSocial, isCreating, mode, socialId]);

	// Set up save handler for parent component
	useEffect(() => {
		setSaveHandler(() => handleSave);
	}, [handleSave, setSaveHandler]);

	const handleTestUrl = () => {
		const url = form.getValues("url");
		if (url) {
			window.open(url, "_blank", "noopener,noreferrer");
		}
	};

	return (
		<div className="flex-1 w-full max-h-full py-4 overflow-y-auto">
			<Form {...form}>
				<form onSubmit={(e) => e.preventDefault()}>
					<div className="px-4 space-y-6">
						{/* Platform Selection */}
						<FormField
							control={form.control}
							name="platform"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Platform</FormLabel>
									<Popover open={isCommandOpen} onOpenChange={setIsCommandOpen}>
										<PopoverTrigger asChild>
											<FormControl>
												<Button
													variant="outline"
													className={`h-8 justify-between ${
														!field.value && "text-muted-foreground"
													}`}
												>
													{field.value ? (
														<div className="flex items-center gap-2">
															{(() => {
																const IconComponent =
																	platformIcons[field.value];
																return IconComponent ? (
																	<div className="size-4">
																		<IconComponent />
																	</div>
																) : null;
															})()}
															{platformLabels[field.value]}
														</div>
													) : (
														"Select a social media platform"
													)}
													<ChevronsUpDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
												</Button>
											</FormControl>
										</PopoverTrigger>
										<PopoverContent
											className="w-[--radix-popover-trigger-width] p-0"
											onWheel={(e) => e.stopPropagation()}
										>
											<Command>
												<CommandInput placeholder="Search platforms..." />
												<CommandList className="max-h-[200px] overflow-y-auto">
													<CommandEmpty>No platform found.</CommandEmpty>
													<CommandGroup>
														{Object.entries(platformLabels).map(
															([value, label]) => {
																const IconComponent = platformIcons[value];
																return (
																	<CommandItem
																		key={value}
																		value={label}
																		onSelect={() => {
																			form.setValue(
																				"platform",
																				value as SocialFormType["platform"],
																			);
																			setIsCommandOpen(false);
																		}}
																	>
																		<div className="flex items-center gap-2">
																			{IconComponent && (
																				<div className="size-4">
																					<IconComponent />
																				</div>
																			)}
																			{label}
																		</div>
																		<Check
																			className={`ml-auto h-4 w-4 ${
																				field.value === value
																					? "opacity-100"
																					: "opacity-0"
																			}`}
																		/>
																	</CommandItem>
																);
															},
														)}
													</CommandGroup>
												</CommandList>
											</Command>
										</PopoverContent>
									</Popover>
									<FormDescription>
										Choose the social media platform for this account.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Handle */}
						<FormField
							control={form.control}
							name="handle"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Handle/Username</FormLabel>
									<FormControl>
										<div className="relative">
											<span className="absolute transform -translate-y-1/2 left-3 top-1/2 text-muted-foreground">
												@
											</span>
											<Input
												placeholder="username"
												className="h-8 pl-8"
												{...field}
											/>
										</div>
									</FormControl>
									<FormDescription>
										Your username or handle on this platform (without the @
										symbol).
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* URL */}
						<FormField
							control={form.control}
							name="url"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Profile URL</FormLabel>
									<FormControl>
										<div className="flex gap-2">
											<Input
												placeholder="https://..."
												{...field}
												className="h-8"
											/>
											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														type="button"
														variant="outline"
														size="iconSm"
														onClick={handleTestUrl}
														disabled={!field.value}
													>
														<ExternalLink className="size-3" />
													</Button>
												</TooltipTrigger>
												<TooltipContent>Open URL</TooltipContent>
											</Tooltip>
										</div>
									</FormControl>
									<FormDescription>
										The full URL to your profile on this platform.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				</form>
			</Form>
		</div>
	);
};
