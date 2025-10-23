"use client";

import { api, ConvexError, useMutation } from "@firebuzz/convex";
import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { ReadonlyInputWithClipboard } from "@firebuzz/ui/components/reusable/readonly-input-with-clipboard";
import { Button } from "@firebuzz/ui/components/ui/button";
import { ButtonGroup } from "@firebuzz/ui/components/ui/button-group";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import { Label } from "@firebuzz/ui/components/ui/label";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	CheckCircle,
	ChevronDown,
	Cloud,
	CornerDownRight,
	ExternalLink,
	FileText,
} from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { formatRelativeTimeShort } from "@firebuzz/utils";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useLandingPageContext } from "@/hooks/agent/use-landing-page";
import { useSandbox } from "@/hooks/agent/use-sandbox";

// Status configuration
const statusConfig = {
	draft: {
		color: "bg-gray-500",
		label: "Draft",
		icon: FileText,
	},
	published: {
		color: "bg-emerald-500",
		label: "Published",
		icon: CheckCircle,
	},
} as const;

export const PublishButton = () => {
	const [open, setOpen] = useState(false);
	const { landingPage } = useLandingPageContext();

	// Get sandbox to check build status
	const { isBuilding } = useSandbox();

	// Build and publish mutation
	const buildAndPublishMutation = useMutation(
		api.collections.landingPages.mutations.buildAndPublishPreview,
	);

	const handlePublish = async () => {
		if (!landingPage?._id) return;

		try {
			await buildAndPublishMutation({ id: landingPage._id });

			toast.success("Build started", {
				description: "Building and publishing your landing page...",
				id: "build-started",
			});
		} catch (error) {
			const errorMessage =
				error instanceof ConvexError ? error.data : "Failed to start build";
			toast.error("Build failed to start", {
				description: errorMessage,
				id: "build-failed",
			});
		} finally {
			setOpen(false);
		}
	};

	// Format the time since published
	const getTimeSincePublished = () => {
		if (!landingPage?.previewPublishedAt) return "";
		return formatRelativeTimeShort(new Date(landingPage.previewPublishedAt));
	};

	// Check if preview was published
	const isPreviewPublished = !!landingPage?.previewPublishedAt;

	const currentStatus = landingPage?.status || "draft";
	const config = statusConfig[currentStatus];

	// Check if busy - either publishing locally, building in sandbox, or publishing in backend
	const isLandingPagePublishing = landingPage?.isPublishing || false;
	const isBusy = isBuilding || isLandingPagePublishing;

	console.log({
		isBuilding,
		isLandingPagePublishing,
		isBusy,
	});

	return (
		<ButtonGroup>
			<Button size="sm" variant="outline" className="!py-0 !pr-2">
				<AnimatePresence initial={false} mode="wait">
					{isBusy ? (
						<motion.div
							key="publishing"
							className="flex gap-1 gap-2 items-center"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 10 }}
						>
							<div
								className={cn(
									"w-2 h-2 rounded-full animate-pulse",
									config?.color,
								)}
							/>
							Publishing...
						</motion.div>
					) : (
						<motion.div
							key="status"
							className="flex items-center space-x-2"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 10 }}
						>
							<div className={cn("w-2 h-2 rounded-full", config?.color)} />
							<span>{config?.label}</span>
						</motion.div>
					)}
				</AnimatePresence>
			</Button>

			<DropdownMenu open={open} onOpenChange={setOpen}>
				<DropdownMenuTrigger asChild>
					<Button size="sm" variant="outline" className="!py-0 !px-1.5">
						<ChevronDown className="size-3" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					sideOffset={10}
					align="end"
					className="w-[350px] !p-0"
				>
					{/* Header */}
					<div className="flex gap-2 items-center p-2 text-sm font-medium border-b bg-muted">
						Publish to Preview
					</div>

					<AnimatePresence initial={false} mode="wait">
						{/* Not published */}
						{!isPreviewPublished && (
							<motion.div
								className="px-3 py-2 text-sm text-muted-foreground"
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: 10 }}
							>
								Preview will be available once you publish.
							</motion.div>
						)}
						{/* Published */}
						{isPreviewPublished && (
							<motion.div
								className="px-3 py-2 text-sm text-muted-foreground"
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: 10 }}
							>
								{/* URL */}
								<div className="space-y-1">
									<Label>Preview URL</Label>
									<ReadonlyInputWithClipboard
										value={landingPage?.previewUrl || ""}
										className="w-full"
									/>
								</div>
								<div className="flex gap-2 items-center mt-1">
									<CornerDownRight className="size-3" />
									<div className="flex gap-1 items-center">
										<span className="text-xs font-medium text-emerald-600">
											Published
										</span>
										<span className="text-xs font-medium">
											{getTimeSincePublished()} ago.
										</span>
									</div>
								</div>
							</motion.div>
						)}
					</AnimatePresence>

					{/* Info Box */}
					<div className="px-3 py-1">
						<InfoBox variant="info" className="text-xs" iconPlacement="top">
							Publishing landing page will build your landing page and provide
							you a Preview URL but this doesn't change the landing page that is
							used by Campaign. You must publish the Campaign too.
						</InfoBox>
					</div>

					<DropdownMenuSeparator />

					<div className="flex gap-4 items-center px-3 py-2">
						<Button
							variant="outline"
							className="w-full h-8"
							size="sm"
							onClick={handlePublish}
							disabled={isBusy}
						>
							{isBusy ? (
								<>
									<Spinner size="xs" className="mb-0.5" />
									{isBuilding
										? "Building..."
										: isLandingPagePublishing
											? "Publishing..."
											: "Starting..."}
								</>
							) : (
								<>
									<Cloud className="size-3.5" />
									{currentStatus === "draft" ? "Publish" : "Republish"}
								</>
							)}
						</Button>
						{isPreviewPublished && (
							<Button
								variant="ghost"
								className="w-full h-8"
								size="sm"
								onClick={() => {
									window.open(landingPage?.previewUrl, "_blank");
								}}
							>
								<ExternalLink className="size-3.5" /> Preview
							</Button>
						)}
					</div>
				</DropdownMenuContent>
			</DropdownMenu>
		</ButtonGroup>
	);
};
