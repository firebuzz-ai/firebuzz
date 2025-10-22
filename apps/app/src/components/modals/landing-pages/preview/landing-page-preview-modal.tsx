"use client";

import { useLandingPagePreviewModal } from "@/hooks/ui/use-landing-page-preview-modal";
import { useNewTranslationModal } from "@/hooks/ui/use-new-translation-modal";
import type { Id } from "@firebuzz/convex";
import { api, useCachedQuery, useMutation } from "@firebuzz/convex";
import { Button, buttonVariants } from "@firebuzz/ui/components/ui/button";
import { ButtonGroup } from "@firebuzz/ui/components/ui/button-group";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
	ArrowUpRight,
	ChevronDown,
	Copy,
	Edit as EditIcon,
	ExternalLink,
	Languages,
	Plus,
	Trash,
} from "@firebuzz/ui/icons/lucide";
import { IconAB2, IconSquareNumber0 } from "@firebuzz/ui/icons/tabler";
import { toast } from "@firebuzz/ui/lib/utils";
import Link from "next/link";
import { useState } from "react";

export const LandingPagePreviewModal = () => {
	const [{ landingPageId }, setPreviewModal] = useLandingPagePreviewModal();
	const [, { openModal: openTranslationModal }] = useNewTranslationModal();
	const [isCreatingVariant, setIsCreatingVariant] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const landingPageData = useCachedQuery(
		api.collections.landingPages.queries.getByIdWithVariantsAndTranslations,
		landingPageId ? { id: landingPageId as Id<"landingPages"> } : "skip",
	);

	const createVariantMutation = useMutation(
		api.collections.landingPages.mutations.createVariant,
	);

	const deleteLandingPageMutation = useMutation(
		api.collections.landingPages.mutations.deleteTemporary,
	);

	const isOpen = !!landingPageId;
	const isParent = !landingPageData?.parentId;

	const handleClose = () => {
		void setPreviewModal({ landingPageId: null });
	};

	// Handler for opening preview in new tab
	const handleOpenPreview = () => {
		if (landingPageData?.previewUrl) {
			window.open(landingPageData.previewUrl, "_blank");
		} else {
			toast.error("No preview URL available");
		}
	};

	// Handler for copying link
	const handleCopyLink = async () => {
		if (landingPageData?.previewUrl) {
			try {
				await navigator.clipboard.writeText(landingPageData.previewUrl);
				toast.success("Link copied to clipboard");
			} catch {
				toast.error("Failed to copy link");
			}
		} else {
			toast.error("No preview URL available");
		}
	};

	// Handler for creating variant
	const handleCreateVariant = async () => {
		if (!landingPageData || isCreatingVariant) return;

		try {
			setIsCreatingVariant(true);
			toast.loading("Creating variant...", { id: "create-variant" });

			const variantId = await createVariantMutation({
				parentId: landingPageData._id,
			});

			toast.success("Variant created", { id: "create-variant" });
			void setPreviewModal({ landingPageId: variantId });
		} catch (error) {
			console.error("Error creating variant:", error);
			toast.error("Failed to create variant", { id: "create-variant" });
		} finally {
			setIsCreatingVariant(false);
		}
	};

	// Handler for creating translation
	const handleCreateTranslation = () => {
		if (!landingPageData) return;
		openTranslationModal(landingPageData._id);
	};

	// Handler for navigating to parent
	const handleGoToParent = () => {
		if (!landingPageData?.parentId) return;
		void setPreviewModal({ landingPageId: landingPageData.parentId });
	};

	// Handler for navigating to variant
	const handleNavigateToVariant = (variantId: string) => {
		void setPreviewModal({ landingPageId: variantId as Id<"landingPages"> });
	};

	// Handler for navigating to translation
	const handleNavigateToTranslation = (translationId: string) => {
		void setPreviewModal({
			landingPageId: translationId as Id<"landingPages">,
		});
	};

	// Handler for deleting landing page
	const handleDelete = async () => {
		if (!landingPageData || isDeleting) return;

		try {
			setIsDeleting(true);
			toast.loading("Deleting landing page...", { id: "delete-landing-page" });

			await deleteLandingPageMutation({ id: landingPageData._id });

			toast.success("Landing page deleted", { id: "delete-landing-page" });
			handleClose();
		} catch (error) {
			console.error("Error deleting landing page:", error);
			toast.error("Failed to delete landing page", {
				id: "delete-landing-page",
			});
		} finally {
			setIsDeleting(false);
		}
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
					<DialogTitle>{landingPageData?.title || "Loading..."}</DialogTitle>

					{/* Action Buttons */}
					{landingPageData && (
						<div className="flex gap-2 items-center">
							{/* Icon Buttons */}
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="outline"
										size="iconSm"
										onClick={handleOpenPreview}
										disabled={!landingPageData.previewUrl}
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
										disabled={!landingPageData.previewUrl}
									>
										<Copy className="size-3.5" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Copy Link</TooltipContent>
							</Tooltip>

							<Separator orientation="vertical" className="h-6" />

							{/* Edit Button with DropdownMenu */}
							<ButtonGroup className="h-8">
								<Link
									href={`/campaigns/${landingPageData.campaignId}/landing-pages/${landingPageData._id}`}
									className={buttonVariants({
										variant: "outline",
										className: "h-8",
									})}
								>
									<EditIcon className="size-3.5" />
									Edit
								</Link>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="outline" className="!pl-2 pr-2 h-8">
											<ChevronDown className="size-3.5" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent
										align="end"
										className="w-[300px] bg-muted"
									>
										{/* Variants & Translations Group */}
										<DropdownMenuGroup>
											<DropdownMenuLabel className="text-xs text-muted-foreground">
												{isParent
													? "Variants & Translations"
													: "Parent & Translations"}
											</DropdownMenuLabel>

											{/* Go to Parent (for variants) */}
											{!isParent && landingPageData.parentId && (
												<DropdownMenuItem
													className="justify-between"
													onClick={handleGoToParent}
												>
													<div className="flex gap-2 items-center">
														<IconSquareNumber0 className="size-3.5" /> Go to
														Parent
													</div>
													<ArrowUpRight className="size-3.5" />
												</DropdownMenuItem>
											)}

											{/* Variants Submenu (for parents) */}
											{isParent && (
												<>
													<DropdownMenuSub>
														<DropdownMenuSubTrigger>
															<IconAB2 className="size-3" />
															Variants
														</DropdownMenuSubTrigger>
														<DropdownMenuSubContent
															sideOffset={8}
															className="max-h-[300px] overflow-y-auto bg-muted"
														>
															<DropdownMenuLabel className="text-xs text-muted-foreground">
																Variants
															</DropdownMenuLabel>
															{!landingPageData.variants ||
															landingPageData.variants.length === 0 ? (
																<DropdownMenuItem disabled>
																	No variants yet
																</DropdownMenuItem>
															) : (
																landingPageData.variants.map((variant) => (
																	<DropdownMenuItem
																		key={variant._id}
																		className="justify-between"
																		onClick={() =>
																			handleNavigateToVariant(variant._id)
																		}
																	>
																		{variant.title}
																		<ArrowUpRight className="size-3.5" />
																	</DropdownMenuItem>
																))
															)}
														</DropdownMenuSubContent>
													</DropdownMenuSub>
													<DropdownMenuItem onClick={handleCreateVariant}>
														<Plus className="size-3" />
														Create Variant
													</DropdownMenuItem>
												</>
											)}

											{/* Translations Submenu */}
											<DropdownMenuSub>
												<DropdownMenuSubTrigger>
													<Languages />
													Translations
												</DropdownMenuSubTrigger>
												<DropdownMenuSubContent
													sideOffset={8}
													className="max-h-[300px] overflow-y-auto bg-muted"
												>
													<DropdownMenuLabel className="text-xs text-muted-foreground">
														Translations
													</DropdownMenuLabel>
													{!landingPageData.translations ||
													landingPageData.translations.length === 0 ? (
														<DropdownMenuItem disabled>
															No translations yet
														</DropdownMenuItem>
													) : (
														landingPageData.translations.map((translation) => (
															<DropdownMenuItem
																className="justify-between"
																key={translation._id}
																onClick={() =>
																	handleNavigateToTranslation(translation._id)
																}
															>
																{translation.title} ({translation.language})
																<ArrowUpRight className="size-3.5" />
															</DropdownMenuItem>
														))
													)}
												</DropdownMenuSubContent>
											</DropdownMenuSub>
											<DropdownMenuItem onClick={handleCreateTranslation}>
												<Plus className="size-3" />
												Create Translation
											</DropdownMenuItem>
										</DropdownMenuGroup>

										<DropdownMenuSeparator />

										{/* Delete Section */}
										<DropdownMenuGroup>
											<DropdownMenuItem
												className="text-destructive hover:text-destructive hover:bg-destructive/10"
												onClick={handleDelete}
												disabled={isDeleting}
											>
												<Trash className="size-3.5" />
												Delete
											</DropdownMenuItem>
										</DropdownMenuGroup>
									</DropdownMenuContent>
								</DropdownMenu>
							</ButtonGroup>
						</div>
					)}
				</DialogHeader>
				{!landingPageData ? (
					<div className="flex flex-1 justify-center items-center">
						<Spinner size="sm" />
					</div>
				) : (
					<div className="flex overflow-hidden flex-1 p-4">
						{/* Left: Preview iframe */}
						<div className="overflow-hidden flex-1 rounded-lg border bg-muted">
							{landingPageData.previewUrl ? (
								<iframe
									src={landingPageData.previewUrl}
									className="w-full h-full border-0"
									title="Landing Page Preview"
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
				)}
			</DialogContent>
		</Dialog>
	);
};
