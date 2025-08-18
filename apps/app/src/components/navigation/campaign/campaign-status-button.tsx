"use client";

import { useProject } from "@/hooks/auth/use-project";
import { useWorkspace } from "@/hooks/auth/use-workspace";
import {
	ConvexError,
	type Id,
	api,
	useCachedQuery,
	useMutation,
} from "@firebuzz/convex";
import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { ReadonlyInputWithClipboard } from "@firebuzz/ui/components/reusable/readonly-input-with-clipboard";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import { Label } from "@firebuzz/ui/components/ui/label";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	ArrowUpRight,
	CalendarClock,
	CheckCheck,
	CheckCircle,
	ChevronDown,
	Clock,
	Cloud,
	CornerDownRight,
	Eye,
	FileText,
	Flag,
	Link,
	RotateCcw,
	Workflow,
	X,
} from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { formatRelativeTimeShort } from "@firebuzz/utils";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { ScheduleDialog } from "./schedule-dialog";

export interface CampaignStatusButtonProps {
	campaignId: Id<"campaigns">;
}

const statusConfig = {
	draft: {
		color: "bg-gray-500",
		label: "Draft",
		icon: FileText,
		textColor: "text-gray-600",
		bgColor: "bg-gray-50",
		borderColor: "border-gray-200",
	},
	preview: {
		color: "bg-blue-500",
		label: "Preview",
		icon: Eye,
		textColor: "text-blue-600",
		bgColor: "bg-blue-50",
		borderColor: "border-blue-200",
	},
	scheduled: {
		color: "bg-fuchsia-500",
		label: "Scheduled",
		icon: Clock,
		textColor: "text-fuchsia-600",
		bgColor: "bg-fuchsia-50",
		borderColor: "border-fuchsia-200",
	},
	published: {
		color: "bg-emerald-500",
		label: "Published",
		icon: CheckCircle,
		textColor: "text-emerald-600",
		bgColor: "bg-emerald-50",
		borderColor: "border-emerald-200",
	},
	completed: {
		color: "bg-brand",
		label: "Completed",
		icon: Flag,
		textColor: "text-brand",
		bgColor: "bg-brand/5",
		borderColor: "border-brand/20",
	},
} as const;

export const CampaignStatusButton = ({
	campaignId,
}: CampaignStatusButtonProps) => {
	const [open, setOpen] = useState(false);
	const { currentWorkspace } = useWorkspace();
	const { currentProject } = useProject();
	const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
	const [isReschedule, setIsReschedule] = useState(false);

	// Queries
	const campaign = useCachedQuery(api.collections.campaigns.queries.getById, {
		id: campaignId,
	});

	const domains = useCachedQuery(
		api.collections.domains.custom.queries.getActiveByProject,
		campaign ? { projectId: campaign.projectId } : "skip",
	);
	const projectDomains = useCachedQuery(
		api.collections.domains.project.queries.getByProject,
		campaign ? { projectId: campaign.projectId } : "skip",
	);
	const validation = useCachedQuery(
		api.collections.campaigns.validation.getCampaignValidation,
		{ campaignId },
	);

	// Mutations
	const publish = useMutation(api.collections.campaigns.mutations.publish);
	const schedulePublish = useMutation(
		api.collections.campaigns.mutations.schedulePublish,
	);
	const reschedulePublish = useMutation(
		api.collections.campaigns.mutations.reschedulePublish,
	);
	const cancelSchedule = useMutation(
		api.collections.campaigns.mutations.cancelSchedule,
	);
	const markAsCompleted = useMutation(
		api.collections.campaigns.mutations.markAsCompleted,
	);
	const reactivateCampaign = useMutation(
		api.collections.campaigns.mutations.reactivateCampaign,
	);

	const [loading, setLoading] = useState<string | null>(null);

	if (
		!campaign ||
		!currentWorkspace ||
		!currentProject ||
		validation === undefined ||
		!projectDomains ||
		projectDomains.length === 0
	) {
		return (
			<Button variant="outline" size="sm" disabled>
				<Spinner size="xs" className="mb-0.5" />
			</Button>
		);
	}

	const config = statusConfig[campaign.status as keyof typeof statusConfig];

	// Helper functions
	const getTimeSincePublished = (timestamp?: string) => {
		if (!timestamp) return "";
		return formatRelativeTimeShort(new Date(timestamp));
	};

	const getScheduledTimeFormatted = () => {
		if (!campaign.scheduledAt) return "";
		const date = new Date(campaign.scheduledAt);
		const formatter = new Intl.DateTimeFormat("en-US", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
			timeZoneName: "short",
		});
		return formatter.format(date);
	};

	// Validation helpers
	const canPublish = validation?.canPublish ?? false;
	const hasValidationErrors = !canPublish;
	const validationErrors = validation?.criticalErrors || [];
	const primaryValidationError =
		validationErrors[0]?.message ||
		"Please fix validation errors before publishing";

	const handleAction = async (action: string, ...args: unknown[]) => {
		setLoading(action);
		try {
			switch (action) {
				case "publishToPreview":
					await publish({
						id: campaignId,
						type: "preview",
					});
					toast.success("Published to preview!", {
						description: "Your campaign is now available for preview",
						id: `publish-preview-${campaignId}`,
					});
					break;
				case "publishToProduction": {
					await publish({
						id: campaignId,
						type: "production",
						domainIds: domains
							?.filter((d) => d.status === "active")
							.map((d) => d._id),
					});
					toast.success("Published to production!", {
						description: "Your campaign is now live",
						id: `publish-production-${campaignId}`,
					});
					break;
				}
				case "schedule": {
					const scheduledAt = args[0] as Date;
					await schedulePublish({
						id: campaignId,
						scheduledAt: scheduledAt.toISOString(),
						domainIds: domains
							?.filter((d) => d.status === "active")
							.map((d) => d._id),
					});
					setScheduleDialogOpen(false);
					toast.success("Campaign scheduled!", {
						description: `Will publish on ${scheduledAt.toLocaleDateString()} at ${scheduledAt.toLocaleTimeString()}`,
						id: `schedule-${campaignId}`,
					});
					break;
				}
				case "reschedule": {
					const newScheduledAt = args[0] as Date;
					await reschedulePublish({
						id: campaignId,
						newScheduledAt: newScheduledAt.toISOString(),
						domainIds: domains
							?.filter((d) => d.status === "active")
							.map((d) => d._id),
					});
					setScheduleDialogOpen(false);
					toast.success("Campaign rescheduled!", {
						description: `Will publish on ${newScheduledAt.toLocaleDateString()} at ${newScheduledAt.toLocaleTimeString()}`,
						id: `reschedule-${campaignId}`,
					});
					break;
				}
				case "cancelSchedule":
					await cancelSchedule({ id: campaignId });
					toast.success("Schedule cancelled", {
						description: "Campaign schedule has been cancelled",
						id: `cancel-schedule-${campaignId}`,
					});
					break;
				case "markCompleted":
					await markAsCompleted({ id: campaignId });
					toast.success("Campaign completed!", {
						description: "Campaign has been marked as completed",
						id: `complete-${campaignId}`,
					});
					break;
				case "reactivate":
					await reactivateCampaign({ id: campaignId });
					toast.success("Campaign reactivated!", {
						description: "Campaign is now active again",
						id: `reactivate-${campaignId}`,
					});
					break;
			}
		} catch (error) {
			const errorMessage =
				error instanceof ConvexError ? error.data : "Unexpected error occurred";
			toast.error(`Failed to ${action}`, {
				id: `error-${action}-${campaignId}`,
				description: errorMessage,
			});
		} finally {
			setLoading(null);
		}
	};

	const openScheduleDialog = (reschedule = false) => {
		setIsReschedule(reschedule);
		setScheduleDialogOpen(true);
	};

	const handleScheduleSubmit = (date: Date) => {
		if (isReschedule) {
			handleAction("reschedule", date);
		} else {
			handleAction("schedule", date);
		}
	};

	const renderStatusContent = () => {
		switch (campaign.status) {
			case "draft":
				return (
					<>
						{/* Header */}
						<div className="flex gap-2 items-center p-2 text-sm font-medium border-b bg-muted">
							<Workflow className="size-3.5" /> Manage Campaign
						</div>

						<AnimatePresence initial={false} mode="wait">
							<motion.div
								className="px-3 py-2 text-sm text-muted-foreground"
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: 10 }}
							>
								Preview will be available once you publish to preview.
							</motion.div>
						</AnimatePresence>

						{/* Info Box */}
						<div className="px-3 py-1">
							{hasValidationErrors ? (
								<InfoBox
									variant="destructive"
									className="text-xs"
									iconPlacement="left"
								>
									{primaryValidationError}
								</InfoBox>
							) : (
								<InfoBox
									variant="info"
									className="text-xs"
									iconPlacement="left"
								>
									Publish to preview first to test your campaign before going
									live.
								</InfoBox>
							)}
						</div>

						<DropdownMenuSeparator />

						{/* Actions */}
						<div className="flex gap-2 items-center px-3 py-2">
							<Button
								className="w-full h-8"
								size="sm"
								onClick={() => handleAction("publishToPreview")}
								disabled={loading === "publishToPreview" || hasValidationErrors}
							>
								{loading === "publishToPreview" ? (
									<Spinner size="xs" className="mb-0.5" />
								) : (
									<>
										<Cloud className="size-3.5" />
										Publish to Preview
									</>
								)}
							</Button>
						</div>
					</>
				);

			case "preview":
				return (
					<>
						{/* Header */}
						<div className="flex gap-2 items-center p-2 text-sm font-medium border-b bg-muted">
							<Workflow className="size-3.5" /> Manage Campaign
						</div>

						<AnimatePresence initial={false} mode="wait">
							<motion.div
								className="px-3 py-2 text-sm text-muted-foreground"
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: 10 }}
							>
								{/* Preview URL */}
								{campaign.urlConfig?.previewUrl && (
									<div className="space-y-1">
										<Label>Preview URL</Label>
										<ReadonlyInputWithClipboard
											value={campaign.urlConfig.previewUrl}
											className="w-full"
										/>
										<div className="flex justify-between items-center mt-1">
											<div className="flex gap-2 items-center">
												<CornerDownRight className="size-3" />
												<div className="flex gap-1 items-center">
													<span className="text-xs font-medium text-blue-600">
														Published
													</span>
													<span className="text-xs font-medium">
														{getTimeSincePublished(campaign.previewPublishedAt)}{" "}
														ago.
													</span>
												</div>
											</div>
											<Button
												variant="ghost"
												size="sm"
												className="gap-1 px-2 h-6 text-xs"
												onClick={() =>
													window.open(campaign.urlConfig!.previewUrl!, "_blank")
												}
											>
												Open <ArrowUpRight className="size-3" />
											</Button>
										</div>
									</div>
								)}

								<div className="my-4 border-t" />

								{/* Production URLs (pending) */}
								<div className="space-y-2">
									<Label>Production URLs (pending)</Label>
									<div className="space-y-1 text-xs text-muted-foreground">
										<Badge
											className="flex gap-1 items-center"
											variant="outline"
										>
											<Link className="size-3" />
											{projectDomains[0]?.subdomain}.{projectDomains[0]?.domain}
											/{campaign.slug}
										</Badge>
										{domains
											?.filter((d) => d.status === "active")
											.map((domain) => (
												<Badge
													key={domain._id}
													className="flex gap-1 items-center"
													variant="outline"
												>
													<Link className="size-3" />
													{domain.hostname}/{campaign.slug}
												</Badge>
											))}
									</div>
								</div>
							</motion.div>
						</AnimatePresence>

						{/* Info Box */}
						<div className="px-3 py-2">
							{hasValidationErrors ? (
								<InfoBox
									variant="destructive"
									className="text-xs"
									iconPlacement="left"
								>
									{primaryValidationError}
								</InfoBox>
							) : (
								<InfoBox
									variant="info"
									className="text-xs"
									iconPlacement="left"
								>
									Your preview is ready for testing. Publish to production to
									make it live on your domains.
								</InfoBox>
							)}
						</div>

						<DropdownMenuSeparator />

						{/* Actions */}
						<div className="flex gap-2 items-center px-3 py-2">
							<Button
								variant="outline"
								className="flex-1 h-8"
								size="sm"
								onClick={() => handleAction("publishToPreview")}
								disabled={!!loading || hasValidationErrors}
							>
								{loading === "publishToPreview" ? (
									<Spinner size="xs" className="mb-0.5" />
								) : (
									<>
										<Cloud className="size-3.5" />
										Update Preview
									</>
								)}
							</Button>
							<Button
								variant="outline"
								className="flex-1 h-8"
								size="sm"
								onClick={() => openScheduleDialog(false)}
								disabled={!!loading || hasValidationErrors}
							>
								<CalendarClock className="w-3 h-3" />
								Schedule
							</Button>
						</div>

						<DropdownMenuSeparator />

						{/* Publish Now Button */}
						<div className="px-3 py-2">
							<Button
								className="w-full h-8"
								size="sm"
								onClick={() => handleAction("publishToProduction")}
								disabled={!!loading || hasValidationErrors}
							>
								{loading === "publishToProduction" ? (
									<Spinner size="xs" className="mb-0.5" />
								) : (
									<>
										<Cloud className="size-3.5" />
										Publish Now
									</>
								)}
							</Button>
						</div>
					</>
				);

			case "scheduled":
				return (
					<>
						{/* Header */}
						<div className="flex gap-2 items-center p-2 text-sm font-medium border-b bg-muted">
							<Workflow className="size-3.5" /> Manage Campaign
						</div>

						<AnimatePresence initial={false} mode="wait">
							<motion.div
								className="px-3 py-2 text-sm text-muted-foreground"
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: 10 }}
							>
								{/* Scheduled Time */}
								<div className="mt-1 mb-4">
									<Label>Scheduled for</Label>
									<div className="flex gap-2 items-center">
										<CornerDownRight className="size-3" />
										<div className="text-sm font-medium text-fuchsia-600">
											{getScheduledTimeFormatted()}
										</div>
									</div>
								</div>

								<Separator className="my-4" />

								{/* Preview URL */}
								{campaign.urlConfig?.previewUrl && (
									<div className="mb-4 space-y-1">
										<Label>Preview URL</Label>
										<ReadonlyInputWithClipboard
											value={campaign.urlConfig.previewUrl}
											className="w-full"
										/>
										<div className="flex justify-between items-center mt-1">
											<div className="flex gap-2 items-center">
												<CornerDownRight className="size-3" />
												<div className="flex gap-1 items-center">
													<span className="text-xs font-medium text-blue-600">
														Published
													</span>
													<span className="text-xs font-medium">
														{getTimeSincePublished(campaign.previewPublishedAt)}{" "}
														ago.
													</span>
												</div>
											</div>
											<Button
												variant="ghost"
												size="sm"
												className="gap-1 px-2 h-6 text-xs"
												onClick={() =>
													window.open(campaign.urlConfig!.previewUrl!, "_blank")
												}
											>
												Open <ArrowUpRight className="size-3" />
											</Button>
										</div>
									</div>
								)}

								<div className="my-4 border-t" />

								{/* Will publish to */}
								<div className="space-y-2">
									<Label>Will publish to</Label>
									<div className="space-y-1 text-xs text-muted-foreground">
										<Badge
											className="flex gap-1 items-center"
											variant="outline"
										>
											<Link className="size-3" />
											{projectDomains[0]?.subdomain}.{projectDomains[0]?.domain}
											/{campaign.slug}
										</Badge>
										{domains
											?.filter((d) => d.status === "active")
											.map((domain) => (
												<Badge
													key={domain._id}
													className="flex gap-1 items-center"
													variant="outline"
												>
													<Link className="size-3" />
													{domain.hostname}/{campaign.slug}
												</Badge>
											))}
									</div>
								</div>
							</motion.div>
						</AnimatePresence>

						{/* Info Box */}
						<div className="px-3 py-2">
							{hasValidationErrors ? (
								<InfoBox
									variant="destructive"
									className="text-xs"
									iconPlacement="left"
								>
									{primaryValidationError}
								</InfoBox>
							) : (
								<InfoBox
									variant="info"
									className="text-xs"
									iconPlacement="left"
								>
									Campaign is scheduled for automatic publishing. You can
									reschedule or publish immediately.
								</InfoBox>
							)}
						</div>

						<DropdownMenuSeparator />

						{/* Actions */}
						<div className="flex gap-2 items-center px-3 py-2">
							<Button
								variant="outline"
								className="flex-1 h-8"
								size="sm"
								onClick={() => openScheduleDialog(true)}
								disabled={!!loading}
							>
								<RotateCcw className="mr-1 w-3 h-3" />
								Reschedule
							</Button>
							<Button
								variant="outline"
								className="flex-1 h-8"
								size="sm"
								onClick={() => handleAction("cancelSchedule")}
								disabled={!!loading}
							>
								<X className="mr-1 w-3 h-3" />
								{loading === "cancelSchedule" ? (
									<Spinner size="xs" className="mb-0.5" />
								) : (
									"Cancel"
								)}
							</Button>
						</div>

						<DropdownMenuSeparator />

						{/* Publish Now Button */}
						<div className="px-3 py-2">
							<Button
								className="w-full h-8"
								size="sm"
								onClick={() => handleAction("publishToProduction")}
								disabled={!!loading || hasValidationErrors}
							>
								{loading === "publishToProduction" ? (
									<Spinner size="xs" className="mb-0.5" />
								) : (
									<>
										<Cloud className="size-3.5" />
										Publish Now
									</>
								)}
							</Button>
						</div>
					</>
				);

			case "published":
				return (
					<>
						{/* Header */}
						<div className="flex gap-2 items-center p-2 text-sm font-medium border-b bg-muted">
							<Workflow className="size-3.5" /> Manage Campaign
						</div>

						<AnimatePresence initial={false} mode="wait">
							<motion.div
								className="px-3 py-2 text-sm text-muted-foreground"
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: 10 }}
							>
								{/* Production URLs */}
								{campaign.urlConfig?.productionUrls &&
									campaign.urlConfig.productionUrls.length > 0 && (
										<div className="mb-4 space-y-2">
											<Label>Production URLs</Label>
											{campaign.urlConfig.productionUrls.map(
												(urlObj, urlIndex) => (
													<div
														key={`${urlObj.type}-${urlObj.url}-${urlIndex}`}
														className="space-y-1"
													>
														<ReadonlyInputWithClipboard
															value={`https://${urlObj.url}`}
															className="w-full"
														/>
														<div className="flex justify-between items-center">
															<div className="flex gap-2 items-center">
																<CornerDownRight className="size-3" />
																<div className="flex gap-1 items-center">
																	<span className="text-xs font-medium text-emerald-600">
																		Published
																	</span>
																	<span className="text-xs font-medium">
																		{getTimeSincePublished(
																			campaign.publishedAt,
																		)}{" "}
																		ago.
																	</span>
																</div>
															</div>
															<Button
																variant="ghost"
																size="sm"
																className="gap-1 px-2 h-6 text-xs"
																onClick={() =>
																	window.open(`https://${urlObj.url}`, "_blank")
																}
															>
																Open <ArrowUpRight className="size-3" />
															</Button>
														</div>
													</div>
												),
											)}
										</div>
									)}

								<div className="my-4 border-t" />

								{/* Preview URL */}
								{campaign.urlConfig?.previewUrl && (
									<div className="space-y-1">
										<Label>Preview URL</Label>
										<ReadonlyInputWithClipboard
											value={campaign.urlConfig.previewUrl}
											className="w-full"
										/>
										<div className="flex justify-between items-center mt-1">
											<div className="flex gap-2 items-center">
												<CornerDownRight className="size-3" />
												<div className="flex gap-1 items-center">
													<span className="text-xs font-medium text-emerald-600">
														Published
													</span>
													<span className="text-xs font-medium">
														{getTimeSincePublished(campaign.previewPublishedAt)}{" "}
														ago.
													</span>
												</div>
											</div>
											<Button
												variant="ghost"
												size="sm"
												className="gap-1 px-2 h-6 text-xs"
												onClick={() =>
													window.open(campaign.urlConfig!.previewUrl!, "_blank")
												}
											>
												Open <ArrowUpRight className="size-3" />
											</Button>
										</div>
									</div>
								)}
							</motion.div>
						</AnimatePresence>

						{/* Info Box */}
						<div className="px-3 py-2">
							{hasValidationErrors ? (
								<InfoBox
									variant="destructive"
									className="text-xs"
									iconPlacement="left"
								>
									{primaryValidationError}
								</InfoBox>
							) : (
								<InfoBox
									variant="success"
									className="text-xs"
									iconPlacement="left"
								>
									Campaign is live on production domains. You can update preview
									or mark as completed.
								</InfoBox>
							)}
						</div>

						<DropdownMenuSeparator />

						{/* Actions */}
						<div className="flex gap-2 items-center px-3 py-2">
							<Button
								variant="outline"
								className="flex-1 h-8"
								size="sm"
								onClick={() => handleAction("publishToPreview")}
								disabled={!!loading || hasValidationErrors}
							>
								{loading === "publishToPreview" ? (
									<Spinner size="xs" className="mb-0.5" />
								) : (
									<>
										<Cloud className="size-3.5" />
										Update Preview
									</>
								)}
							</Button>
							<Button
								variant="outline"
								className="flex-1 h-8"
								size="sm"
								onClick={() => handleAction("markCompleted")}
								disabled={!!loading}
							>
								{loading === "markCompleted" ? (
									<Spinner size="xs" className="mb-0.5" />
								) : (
									<>
										<CheckCheck className="size-3.5" />
										Complete
									</>
								)}
							</Button>
						</div>

						<DropdownMenuSeparator />

						{/* Republish Button */}
						<div className="px-3 py-2">
							<Button
								className="w-full h-8"
								size="sm"
								onClick={() => handleAction("publishToProduction")}
								disabled={!!loading || hasValidationErrors}
							>
								{loading === "publishToProduction" ? (
									<Spinner size="xs" className="mb-0.5" />
								) : (
									<>
										<Cloud className="size-3.5" />
										Republish
									</>
								)}
							</Button>
						</div>
					</>
				);

			case "completed":
				return (
					<>
						{/* Header */}
						<div className="flex gap-2 items-center p-2 text-sm font-medium border-b bg-muted">
							<Workflow className="size-3.5" /> Manage Campaign
						</div>

						<AnimatePresence initial={false} mode="wait">
							<motion.div
								className="px-3 py-2 text-sm text-muted-foreground"
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: 10 }}
							>
								{/* Completion Date */}
								{campaign.completedAt && (
									<div className="flex gap-2 justify-between items-center">
										<Label>Completed on</Label>
										<Badge variant="brand">
											{new Date(campaign.completedAt).toLocaleDateString()}
										</Badge>
									</div>
								)}
							</motion.div>
						</AnimatePresence>

						{/* Info Box */}
						<div className="px-3 py-2">
							<InfoBox variant="info" className="text-xs" iconPlacement="left">
								Campaign has been completed. You can reactivate it to make it
								live again.
							</InfoBox>
						</div>

						<DropdownMenuSeparator />

						{/* Actions */}
						<div className="flex gap-2 items-center px-3 py-2">
							<Button
								className="w-full h-8"
								size="sm"
								onClick={() => handleAction("reactivate")}
								disabled={!!loading}
							>
								{loading === "reactivate" ? (
									<Spinner size="xs" className="mb-0.5" />
								) : (
									<>
										<RotateCcw className="size-3.5" />
										Reactivate Campaign
									</>
								)}
							</Button>
						</div>
					</>
				);

			default:
				return null;
		}
	};

	return (
		<>
			<DropdownMenu open={open} onOpenChange={setOpen}>
				<DropdownMenuTrigger asChild>
					<Button className="!py-0 !pr-2" size="sm" variant="outline">
						<div className="flex items-center space-x-2">
							<div className={cn("w-2 h-2 rounded-full", config.color)} />
							<span>{config.label}</span>
						</div>
						<div className="flex justify-center items-center pl-2 ml-1 h-full border-l">
							<ChevronDown className="size-3" />
						</div>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					sideOffset={10}
					align="end"
					className="w-[400px] !p-0 bg-muted"
				>
					{renderStatusContent()}
				</DropdownMenuContent>
			</DropdownMenu>

			<ScheduleDialog
				open={scheduleDialogOpen}
				onOpenChange={setScheduleDialogOpen}
				onSchedule={handleScheduleSubmit}
				currentScheduledAt={campaign.scheduledAt}
				isReschedule={isReschedule}
				isLoading={loading === "schedule" || loading === "reschedule"}
			/>
		</>
	);
};
