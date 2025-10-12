import { useMutation, useQuery } from "@firebuzz/convex";
import { api, type Id } from "@firebuzz/convex/nextjs";
import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { ReadonlyInputWithClipboard } from "@firebuzz/ui/components/reusable/readonly-input-with-clipboard";
import { Button } from "@firebuzz/ui/components/ui/button";
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
import { useWorkbenchHelpers } from "@/lib/workbench/hooks/use-workbench-helpers";

export const PublishButton = ({
	landingPageId,
}: {
	landingPageId: Id<"landingPages">;
}) => {
	const [open, setOpen] = useState(false);
	const [isPublishing, setIsPublishing] = useState(false);

	const { buildProject, getBuildFiles } = useWorkbenchHelpers();

	const landingPage = useQuery(api.collections.landingPages.queries.getById, {
		id: landingPageId,
	});

	const publishPreviewMutation = useMutation(
		api.collections.landingPages.mutations.publishPreview,
	);

	const publishPreview = async () => {
		try {
			// Build project
			const isBuildFinished = await buildProject(landingPageId);

			if (!isBuildFinished) {
				toast.error("Failed to build", {
					description: "Please try again",
					id: "build-process",
				});
				return;
			}

			// Get build files
			const files = await getBuildFiles(landingPageId);

			await publishPreviewMutation({
				id: landingPageId,
				html: files.indexHTML,
				js: files.indexJS,
				css: files.indexCSS,
			});

			toast.success("Preview Published", {
				description: "Landing page preview published successfully",
				id: "publish-preview-process",
			});
		} catch (error) {
			console.error(error);
			toast.error("Failed to publish preview", {
				description: "Please try again",
				id: "publish-preview-process",
			});
		}
	};

	const handlePublish = async () => {
		try {
			setIsPublishing(true);

			await publishPreview();

			setIsPublishing(false);
		} catch (error) {
			setIsPublishing(false);
			console.error("Error publishing:", error);
			toast.error("Failed to publish", {
				description: "Please try again",
				id: "publish-process",
			});
		}
	};

	// Format the time since published
	const getTimeSincePublished = () => {
		if (!landingPage?.previewPublishedAt) return "";
		return formatRelativeTimeShort(new Date(landingPage.previewPublishedAt));
	};

	// Check if preview was published
	const isPreviewPublished = !!landingPage?.previewPublishedAt;

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

	const currentStatus = landingPage?.status || "draft";
	const config = statusConfig[currentStatus];

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger asChild>
				<Button className="!py-0 !pr-2" size="sm" variant="outline">
					<div className="flex items-center space-x-2">
						<div className={cn("w-2 h-2 rounded-full", config?.color)} />
						<span>
							{isPublishing ? (
								<Spinner size="xs" className="mb-0.5" />
							) : (
								config?.label
							)}
						</span>
					</div>
					<div className="flex justify-center items-center pl-2 ml-1 h-full border-l">
						<ChevronDown className="size-3" />
					</div>
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
						Publishing landing page will build your landing page and provide you
						a Preview URL but this doesn't change the landing page that is used
						by Campaign. You must publish the Campaign too.
					</InfoBox>
				</div>

				<DropdownMenuSeparator />

				<div className="flex gap-4 items-center px-3 py-2">
					<Button
						variant="outline"
						className="w-full h-8"
						size="sm"
						onClick={handlePublish}
						disabled={isPublishing}
					>
						{isPublishing ? (
							<Spinner size="xs" className="mb-0.5" />
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
	);
};
