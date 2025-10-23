"use client";

import type { Id } from "@firebuzz/convex";
import { api, useCachedQuery } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Copy, ExternalLink, Sparkles } from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { capitalizeFirstLetter } from "@firebuzz/utils";
import { useNewLandingPageModal } from "@/hooks/ui/use-new-landing-page-modal";
import { useTemplatePreviewModal } from "@/hooks/ui/use-template-preview-modal";

const NEXT_PUBLIC_R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";

export const TemplatePreviewModal = () => {
	const [{ templateId }, setPreviewModal] = useTemplatePreviewModal();
	const [, { openModal: openLandingPageModal }] = useNewLandingPageModal();

	const templateData = useCachedQuery(
		api.collections.landingPages.templates.queries.getById,
		templateId ? { id: templateId as Id<"landingPageTemplates"> } : "skip",
	);

	const isOpen = !!templateId;

	const handleClose = () => {
		void setPreviewModal({ templateId: null });
	};

	// Handler for opening preview in new tab
	const handleOpenPreview = () => {
		if (templateData?.previewURL) {
			window.open(templateData.previewURL, "_blank");
		} else {
			toast.error("No preview URL available");
		}
	};

	// Handler for copying link
	const handleCopyLink = async () => {
		if (templateData?.previewURL) {
				try {
				await navigator.clipboard.writeText(templateData.previewURL);
				toast.success("Link copied to clipboard");
			} catch {
				toast.error("Failed to copy link");
			}
		} else {
			toast.error("No preview URL available");
		}
	};

	// Handler for remixing template (creating landing page from template)
	const handleRemix = () => {
		if (!templateData?._id) {
			toast.error("Template not available");
			return;
		}
		console.log("Remixing template:", templateData._id);
		openLandingPageModal(undefined, templateData._id);
		// Close after a small delay to let the new modal open first
		setTimeout(() => {
			handleClose();
		}, 100);
	};

	if (!isOpen) return null;

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
			<DialogContent
				onOpenAutoFocus={(e) => e.preventDefault()}
				onCloseAutoFocus={(e) => e.preventDefault()}
				className="max-w-[90vw] h-[85vh] overflow-hidden flex flex-col gap-0 p-0 [&>button:first-of-type]:hidden"
			>
				<DialogHeader className="flex-row justify-between items-center px-4 py-2 border-b">
					<div className="flex flex-col flex-1 gap-1">
						<DialogTitle>{templateData?.title || "Loading..."}</DialogTitle>
						{templateData?.description && (
							<p className="text-xs font-normal text-muted-foreground">
								{templateData.description}
							</p>
						)}
					</div>

					{/* Action Buttons */}
					{templateData && (
						<div className="flex gap-2 items-center">
							{/* Icon Buttons */}
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="outline"
										size="iconSm"
										onClick={handleOpenPreview}
										disabled={!templateData.key}
									>
										<ExternalLink className="size-3.5" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Open Preview in New Tab</TooltipContent>
							</Tooltip>

							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="outline"
										size="iconSm"
										onClick={handleCopyLink}
										disabled={!templateData.key}
									>
										<Copy className="size-3.5" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Copy Link</TooltipContent>
							</Tooltip>

							<Separator orientation="vertical" className="h-6" />

							{/* Remix Button */}
							<Button
								variant="default"
								className="h-8"
								onClick={handleRemix}
								disabled={!templateData._id}
							>
								<Sparkles className="size-3.5" />
								Remix
							</Button>
						</div>
					)}
				</DialogHeader>
				{!templateData ? (
					<div className="flex flex-1 justify-center items-center">
						<Spinner size="sm" />
					</div>
				) : (
					<div className="flex overflow-hidden flex-col flex-1">
						{/* Tags Row */}
						{templateData.tags && templateData.tags.length > 0 && (
							<div className="flex gap-2 px-4 py-2 border-b bg-muted/30">
								{templateData.tags.map((tag) => (
									<Badge key={tag} variant="secondary" className="text-xs">
										{capitalizeFirstLetter(tag)}
									</Badge>
								))}
							</div>
						)}

						{/* Preview iframe */}
						<div className="overflow-hidden flex-1 p-4">
							<div className="overflow-hidden w-full h-full rounded-lg border bg-muted">
								{templateData.previewURL ? (
									<iframe
										src={templateData.previewURL}
										className="w-full h-full border-0"
										title="Template Preview"
										sandbox="allow-scripts allow-same-origin"
										tabIndex={-1}
									/>
								) : (
									<div className="flex justify-center items-center w-full h-full">
										<div className="flex items-center text-muted-foreground">
											<p className="text-sm">No preview available</p>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
};
