import { useTwoPanelsLayout } from "@/hooks/ui/use-two-panels-layout";
import {
	isElementSelectionEnabledAtom,
	selectedElementAtom,
} from "@/lib/workbench/atoms";
import { api, useQuery } from "@firebuzz/convex";
import type { Id } from "@firebuzz/convex/nextjs";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Checkbox } from "@firebuzz/ui/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	ChevronDown,
	ChevronsRight,
	ExternalLink,
} from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { formatRelativeTimeShort } from "@firebuzz/utils";
import { useSetAtom } from "jotai";
import { useParams } from "next/navigation";
import { useState } from "react";
export function Header({
	publish,
	publishPreview,
}: {
	publish: () => Promise<void>;
	publishPreview: () => Promise<void>;
}) {
	const { id: landingPageId } = useParams<{ id: Id<"landingPages"> }>();
	const [isPublishing, setIsPublishing] = useState(false);
	const [selectedDomains, setSelectedDomains] = useState<{
		preview: boolean;
		custom: boolean;
	}>({
		preview: true,
		custom: false,
	});
	const { closeRightPanel } = useTwoPanelsLayout();
	const setSelectedElement = useSetAtom(selectedElementAtom);
	const setIsElementSelectionEnabled = useSetAtom(
		isElementSelectionEnabledAtom,
	);

	// Fetch landing page data directly
	const landingPage = useQuery(
		api.collections.landingPages.queries.getLandingPageById,
		{
			id: landingPageId,
		},
	);

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
		<div className="flex items-center justify-between border-b px-2 py-3">
			{/* Left Part */}
			<div className="flex items-center gap-2">
				<Button
					onClick={() => {
						setSelectedElement(null);
						setIsElementSelectionEnabled(false);
						closeRightPanel();
					}}
					variant="ghost"
					className="h-8 w-8"
				>
					<ChevronsRight className="size-3" />
				</Button>
				<div className="flex items-center gap-2">
					<Badge variant="outline">Preview</Badge>
				</div>
			</div>
			{/* Right Part */}
			<div className="flex items-center gap-2">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button size="sm">
							{isPublishing ? <Spinner size="xs" /> : "Publish"}
							<ChevronDown className="ml-1 size-3" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-[350px]">
						<div className="p-2 text-sm font-medium">
							CHOOSE PUBLISH DESTINATION:
						</div>

						<div className="px-2 py-2 flex items-center gap-3">
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
								<div className="text-xs text-muted-foreground flex items-center gap-1">
									{isPreviewPublished ? (
										<>
											<span className="text-green-500">Published</span>
											<span>{getTimeSincePublished()}</span>
											<Button variant="link" className="p-0 h-auto text-xs">
												Unpublish
											</Button>
										</>
									) : (
										<span>Not published yet</span>
									)}
								</div>
							</div>
						</div>

						<div className="px-2 py-2 flex items-center gap-3">
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

						<div className="p-2 flex justify-between">
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
							<Button variant="outline" size="sm">
								Cancel
							</Button>
						</div>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}
