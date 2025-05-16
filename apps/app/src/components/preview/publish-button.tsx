import { useMutation, useQuery } from "@firebuzz/convex";
import { type Id, api } from "@firebuzz/convex/nextjs";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Checkbox } from "@firebuzz/ui/components/ui/checkbox";

import { useWorkbenchHelpers } from "@/lib/workbench/hooks/use-workbench-helpers";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	ChevronDown,
	ExternalLink,
	GitPullRequest,
} from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { formatRelativeTimeShort } from "@firebuzz/utils";
import { useState } from "react";

export const PublishButton = ({
	landingPageId,
}: {
	landingPageId: Id<"landingPages">;
}) => {
	const [open, setOpen] = useState(false);
	const [isPublishing, setIsPublishing] = useState(false);
	const [selectedDomains, setSelectedDomains] = useState({
		preview: true,
		custom: false,
	});
	const { buildProject, getBuildFiles } = useWorkbenchHelpers();

	const landingPage = useQuery(api.collections.landingPages.queries.getById, {
		id: landingPageId,
	});

	const publishMutation = useMutation(
		api.collections.landingPages.mutations.publish,
	);

	const publishPreviewMutation = useMutation(
		api.collections.landingPages.mutations.publishPreview,
	);

	const publish = async () => {
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
			const files = await getBuildFiles(landingPageId, "production");

			await publishMutation({
				id: landingPageId,
				html: files.indexHTML,
				js: files.indexJS,
				css: files.indexCSS,
			});

			toast.success("Published", {
				description: "Landing page published successfully",
				id: "publish-process",
			});
		} catch (error) {
			console.error(error);
			toast.error("Failed to publish", {
				description: "Please try again",
				id: "publish-process",
			});
		}
	};

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
			const files = await getBuildFiles(landingPageId, "preview");

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

			if (selectedDomains.preview) {
				// Publish to preview
				await publishPreview();
			}

			if (selectedDomains.custom) {
				// Publish to main
				await publish();
			}

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

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger asChild>
				<Button className="!py-0 !pr-2" size="sm" variant="outline">
					{isPublishing ? <Spinner size="xs" /> : "Publish"}
					<div className="flex items-center justify-center h-full pl-2 ml-1 border-l">
						<ChevronDown className="size-3" />
					</div>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				sideOffset={10}
				align="end"
				className="w-[350px] !p-0"
			>
				<div className="flex items-center gap-2 p-2 text-sm font-medium border-b bg-muted">
					<GitPullRequest className="!size-3" />
					Choose Domains
				</div>

				<div className="flex items-center gap-3 px-2 py-2">
					<Checkbox
						id="preview"
						checked={selectedDomains.preview}
						onCheckedChange={(checked) =>
							setSelectedDomains((prev) => ({
								...prev,
								preview: checked === true,
							}))
						}
					/>
					<div className="flex-1">
						<div className="flex items-center gap-2">
							{!landingPage?.previewUrl && (
								<div className="text-sm font-medium">Preview Domain</div>
							)}
							<span className="text-xs font-medium">
								{landingPage?.previewUrl?.split("/").pop()}
							</span>
							{landingPage?.previewUrl && (
								<a
									href={landingPage.previewUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="text-blue-500 hover:text-blue-700"
								>
									<ExternalLink className="size-3" />
								</a>
							)}
						</div>
						<div className="flex items-center gap-1 text-xs text-muted-foreground">
							{isPreviewPublished ? (
								<>
									<span className="text-green-500">Published</span>
									<span>{getTimeSincePublished()}</span>
									<Button variant="link" className="h-auto p-0 text-xs">
										Unpublish
									</Button>
								</>
							) : (
								<span>Not published yet</span>
							)}
						</div>
					</div>
				</div>

				<div className="flex items-center gap-3 px-2 py-2">
					<Checkbox
						id="custom"
						checked={selectedDomains.custom}
						onCheckedChange={(checked) =>
							setSelectedDomains((prev) => ({
								...prev,
								custom: checked === true,
							}))
						}
					/>
					<div className="flex-1">
						<div className="text-sm font-medium">Custom Domain</div>
						<div className="text-xs text-muted-foreground">
							Click here to add a custom domain
						</div>
					</div>
				</div>

				<DropdownMenuSeparator />

				<div className="flex justify-between p-2">
					<Button
						size="sm"
						onClick={handlePublish}
						disabled={
							isPublishing ||
							(!selectedDomains.preview && !selectedDomains.custom)
						}
					>
						{isPublishing ? (
							<Spinner size="xs" />
						) : (
							"Publish to Selected Domains"
						)}
					</Button>
					<Button onClick={() => setOpen(false)} variant="outline" size="sm">
						Cancel
					</Button>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
