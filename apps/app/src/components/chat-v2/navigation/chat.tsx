"use client";

import { useLandingChat } from "@/hooks/agent/use-landing-chat";
import { useLandingPageContext } from "@/hooks/agent/use-landing-page";
import { useNewTranslationModal } from "@/hooks/ui/use-new-translation-modal";
import { useRenameLandingPageModal } from "@/hooks/ui/use-rename-landing-page-modal";
import { useTwoPanelsAgentLayout } from "@/hooks/ui/use-two-panels-agent-layout";
import { api, useCachedQuery, useMutation } from "@firebuzz/convex";
import { Button } from "@firebuzz/ui/components/ui/button";
import { ButtonGroup } from "@firebuzz/ui/components/ui/button-group";
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
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
	ArrowUpRight,
	ChevronDown,
	Edit,
	History,
	Languages,
	MessageSquare,
	PanelLeftClose,
	PanelLeftOpen,
	Plus,
	Workflow,
} from "@firebuzz/ui/icons/lucide";
import {
	IconAB2,
	IconAppWindow,
	IconArrowIteration,
	IconHelpCircle,
	IconSquareNumber0,
} from "@firebuzz/ui/icons/tabler";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useChatTabs } from "../providers/chat-tabs-provider";

export const ChatControls = () => {
	const { leftPanelRef, isLeftPanelCollapsed, setIsLeftPanelCollapsed } =
		useTwoPanelsAgentLayout();
	const { activeTab, setActiveTab } = useChatTabs();
	const { landingPage, campaign, campaignId } = useLandingPageContext();
	const [, setRenameLandingPageModalState] = useRenameLandingPageModal();
	const [, { openModal: openTranslationModal }] = useNewTranslationModal();
	const router = useRouter();
	const [currentSize, setCurrentSize] = useState(30);
	const rafIdRef = useRef<number | null>(null);
	const [isCreatingVariant, setIsCreatingVariant] = useState(false);

	const { clearConversation } = useLandingChat({
		landingPageId: landingPage?._id!,
	});

	const isParent = !landingPage?.parentId;

	// Fetch variants if this is a parent landing page
	const variants = useCachedQuery(
		api.collections.landingPages.queries.getByParentId,
		isParent && landingPage ? { parentId: landingPage._id } : "skip",
	);

	// Fetch translations for this landing page
	const translations = useCachedQuery(
		api.collections.landingPages.queries.getTranslationsByOriginalId,
		landingPage ? { originalId: landingPage._id } : "skip",
	);

	// Create variant mutation
	const createVariantMutation = useMutation(
		api.collections.landingPages.mutations.createVariant,
	);

	useEffect(() => {
		const panel = leftPanelRef.current;
		if (!panel) return;

		let isActive = true;

		const updateSize = () => {
			if (!isActive) return;

			const size = panel.getSize();
			setCurrentSize(size);

			// Continue updating - throttled by RAF (max 60fps)
			rafIdRef.current = requestAnimationFrame(updateSize);
		};

		// Start the update loop
		rafIdRef.current = requestAnimationFrame(updateSize);

		return () => {
			isActive = false;
			if (rafIdRef.current !== null) {
				cancelAnimationFrame(rafIdRef.current);
				rafIdRef.current = null;
			}
		};
	}, [leftPanelRef]);

	const togglePanel = () => {
		const panel = leftPanelRef.current;
		if (panel) {
			if (panel.isCollapsed()) {
				panel.expand();
				setIsLeftPanelCollapsed(false);
			} else {
				panel.collapse();
				setIsLeftPanelCollapsed(true);
			}
		}
	};

	// Handler for creating variant
	const handleCreateVariant = async () => {
		if (!landingPage || isCreatingVariant) return;

		try {
			setIsCreatingVariant(true);
			toast.loading("Creating variant...", { id: "create-variant" });

			const variantId = await createVariantMutation({
				parentId: landingPage._id,
			});

			toast.success("Variant created", {
				id: "create-variant",
				description: "Redirecting to the new variant...",
			});

			router.push(`/assets/pages-v2/${campaignId}/${variantId}`);
		} catch (error) {
			console.error("Error creating variant:", error);
			toast.error("Failed to create variant", {
				id: "create-variant",
				description: "Please try again",
			});
		} finally {
			setIsCreatingVariant(false);
		}
	};

	// Handler for creating translation
	const handleCreateTranslation = () => {
		if (!landingPage) return;
		openTranslationModal(landingPage._id);
	};

	// Handler for navigating to parent
	const handleGoToParent = () => {
		if (!landingPage?.parentId) return;
		router.push(`/assets/pages-v2/${campaignId}/${landingPage.parentId}`);
	};

	// Handler for navigating to variant
	const handleNavigateToVariant = (variantId: string) => {
		router.push(`/assets/pages-v2/${campaignId}/${variantId}`);
	};

	// Handler for navigating to translation
	const handleNavigateToTranslation = (translationId: string) => {
		router.push(`/assets/pages-v2/${campaignId}/${translationId}`);
	};

	// Handler for clearing conversation
	const handleClearConversation = async () => {
		await clearConversation();
	};

	// Handler for navigating to campaign
	const handleNavigateToCampaign = () => {
		if (!campaignId) return;
		router.push(`/campaigns/${campaignId}/edit`);
	};

	return (
		<div
			className={cn(
				"flex items-center h-full flex-shrink-0 gap-2 px-2 flex-grow-0 justify-between",
				isLeftPanelCollapsed && "w-auto px-1",
			)}
			style={
				!isLeftPanelCollapsed
					? {
							flexBasis: `${currentSize}%`,
							width: `${currentSize}%`,
						}
					: undefined
			}
		>
			<ButtonGroup className="h-8">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<ButtonGroup>
							<Button
								variant="outline"
								className="gap-2 h-8 font-medium bg-muted"
							>
								<IconAppWindow className="size-3" />
								{landingPage?.title || "Untitled"}
							</Button>

							<Button variant="outline" className="!pl-2 pr-2 h-8 bg-muted">
								<ChevronDown />
							</Button>
						</ButtonGroup>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-[300px] bg-muted">
						{/* Group 1: Campaign Link */}
						<DropdownMenuGroup title="Campaign">
							<DropdownMenuLabel className="text-xs text-muted-foreground">
								Campaign
							</DropdownMenuLabel>
							<DropdownMenuItem
								className="justify-between"
								onClick={handleNavigateToCampaign}
							>
								<div className="flex gap-2 items-center">
									<Workflow className="size-3.5" />{" "}
									{campaign?.title || "Campaign"}
								</div>
								<ArrowUpRight className="size-3.5" />
							</DropdownMenuItem>
						</DropdownMenuGroup>

						<DropdownMenuSeparator />

						{/* Group 2: Variants & Translations */}
						<DropdownMenuGroup>
							<DropdownMenuLabel className="text-xs text-muted-foreground">
								{isParent ? "Variants & Translations" : "Parent & Translations"}
							</DropdownMenuLabel>
							{!isParent && landingPage?.parentId && (
								<DropdownMenuItem
									className="justify-between"
									onClick={handleGoToParent}
								>
									<div className="flex gap-2 items-center">
										<IconSquareNumber0 className="size-3.5" /> Go to Parent
									</div>
									<ArrowUpRight className="size-3.5" />
								</DropdownMenuItem>
							)}
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
											{!variants || variants.length === 0 ? (
												<DropdownMenuItem disabled>
													No variants yet
												</DropdownMenuItem>
											) : (
												variants.map((variant) => (
													<DropdownMenuItem
														key={variant._id}
														className="justify-between"
														onClick={() => handleNavigateToVariant(variant._id)}
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
									{!translations || translations.length === 0 ? (
										<DropdownMenuItem disabled>
											No translations yet
										</DropdownMenuItem>
									) : (
										translations.map((translation) => (
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

						{/* Group 3: Actions */}
						<DropdownMenuGroup>
							<DropdownMenuLabel className="text-xs text-muted-foreground">
								Settings
							</DropdownMenuLabel>
							<DropdownMenuItem
								onClick={() => {
									if (landingPage) {
										setRenameLandingPageModalState({
											landingPageId: landingPage._id,
											currentTitle: landingPage.title,
										});
									}
								}}
							>
								<Edit />
								Rename
							</DropdownMenuItem>
							<DropdownMenuItem
								className="flex-col gap-1 items-start"
								onClick={handleClearConversation}
							>
								<div className="flex gap-2 items-center">
									<IconArrowIteration className="size-3.5" />
									Clear Conversation
								</div>
								<div className="text-xs text-muted-foreground">
									Start fresh with a new conversation. Previous messages will be
									cleared for better performance and lower credit usage.
								</div>
							</DropdownMenuItem>
							<DropdownMenuItem className="justify-between">
								<div className="flex gap-2 items-center">
									<IconHelpCircle className="size-3.5" />
									Help
								</div>
								<ArrowUpRight className="size-3.5" />
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</ButtonGroup>

			<div className="flex gap-1 items-center">
				{!isLeftPanelCollapsed && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="iconSm"
								onClick={() =>
									setActiveTab(activeTab === "chat" ? "history" : "chat")
								}
							>
								{activeTab === "chat" ? (
									<History className="size-3" />
								) : (
									<MessageSquare className="size-3" />
								)}
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							{activeTab === "chat" ? "Version History" : "Chat"}
						</TooltipContent>
					</Tooltip>
				)}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button variant="ghost" size="iconSm" onClick={togglePanel}>
							{isLeftPanelCollapsed ? (
								<PanelLeftClose className="size-3" />
							) : (
								<PanelLeftOpen className="size-3" />
							)}
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						{isLeftPanelCollapsed ? "Expand Panel" : "Collapse Panel"}
					</TooltipContent>
				</Tooltip>
			</div>
		</div>
	);
};
