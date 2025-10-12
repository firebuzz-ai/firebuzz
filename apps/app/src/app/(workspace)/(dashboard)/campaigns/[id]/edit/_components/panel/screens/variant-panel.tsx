"use client";

import {
	api,
	type Doc,
	type Id,
	useCachedQuery,
	useConvex,
	useMutation,
} from "@firebuzz/convex";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@firebuzz/ui/components/ui/alert-dialog";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Label } from "@firebuzz/ui/components/ui/label";
import { Progress } from "@firebuzz/ui/components/ui/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@firebuzz/ui/components/ui/select";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
	ArrowUpRight,
	ChevronRight,
	Crown,
	Eye,
	Goal,
	Percent,
	Plus,
	TrendingUp,
} from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { formatRelativeTimeShort } from "@firebuzz/utils";
import { useNodes, useReactFlow } from "@xyflow/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type {
	ABTestNode,
	VariantNode,
} from "@/components/canvas/campaign/nodes/campaign/types";
import { useNewLandingPageModal } from "@/hooks/ui/use-new-landing-page-modal";

interface VariantPanelProps {
	node: VariantNode;
	campaign: Doc<"campaigns">;
}

// Helper functions for letter-based variant system (same as variant-node.tsx)
const getVariantLetter = (index: number) => {
	return String.fromCharCode(65 + index); // A, B, C, etc.
};

const getVariantColor = (index: number, isControl: boolean) => {
	if (isControl) {
		return "bg-blue-500 text-white"; // Blue for control (A)
	}

	const colors = [
		"bg-blue-500 text-white", // A (control) - blue
		"bg-emerald-600 text-white", // B - emerald
		"bg-purple-500 text-white", // C - purple
		"bg-orange-500 text-white", // D - orange
		"bg-pink-500 text-white", // E - pink
		"bg-indigo-500 text-white", // F - indigo
		"bg-red-500 text-white", // G - red
		"bg-teal-500 text-white", // H - teal
		"bg-yellow-500 text-black", // I - yellow (black text for contrast)
		"bg-cyan-500 text-white", // J - cyan
	];

	return colors[index] || "bg-gray-500 text-white"; // Fallback for beyond J
};

export const VariantPanel = ({ node, campaign }: VariantPanelProps) => {
	const { updateNodeData, setNodes } = useReactFlow();
	const nodes = useNodes();
	const router = useRouter();
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [isEditingDescription, setIsEditingDescription] = useState(false);
	const [title, setTitle] = useState(node.data.title);
	const [description, setDescription] = useState(node.data.description || "");
	const [isCreatingVariant, setIsCreatingVariant] = useState(false);
	const [isRevalidating, setIsRevalidating] = useState(false);
	const [showPromoteDialog, setShowPromoteDialog] = useState(false);
	const [_state, { openModal }] = useNewLandingPageModal();

	const convex = useConvex();

	// Get mutation for creating variants
	const createVariant = useMutation(
		api.collections.landingPages.mutations.createVariant,
	);

	// Get mutation for revalidating analytics
	const revalidateAnalyticsMutation = useMutation(
		api.collections.analytics.mutations.revalidateAnalytics,
	);

	// Get mutation for promoting to champion
	const promoteToChampionMutation = useMutation(
		api.collections.landingPages.mutations.promoteToChampion,
	);

	// Fetch landing pages for the campaign
	const landingPages = useCachedQuery(
		api.collections.landingPages.queries.getByCampaignId,
		campaign
			? {
					campaignId: campaign._id,
				}
			: "skip",
	);

	// Get all variant nodes and their assigned landing pages
	const allVariantNodes = useMemo(() => {
		return nodes.filter((n) => n.type === "variant") as VariantNode[];
	}, [nodes]);

	// Get variant nodes from the current AB test only
	const currentTestVariantNodes = useMemo(() => {
		return allVariantNodes.filter(
			(variant) => variant.parentId === node.parentId,
		);
	}, [allVariantNodes, node.parentId]);

	// Get the parent AB test node
	const parentABTestNode = useMemo(() => {
		return nodes.find((n) => n.id === node.parentId && n.type === "ab-test") as
			| ABTestNode
			| undefined;
	}, [nodes, node.parentId]);

	// Check if editing should be disabled (when parent AB test is completed)
	const isTestCompleted = parentABTestNode?.data.status === "completed";
	const isEditingDisabled = isTestCompleted;

	// Get the control variant from the current test
	const controlVariant = useMemo(() => {
		return currentTestVariantNodes.find((v) => v.data.isControl);
	}, [currentTestVariantNodes]);

	// Fetch variant landing pages if this is not control and control has a selection
	const variantLandingPages = useCachedQuery(
		api.collections.landingPages.queries.getByParentId,
		!node.data.isControl && controlVariant?.data.variantId
			? {
					parentId: controlVariant.data.variantId,
				}
			: "skip",
	);

	// Fetch A/B test analytics results for performance metrics
	const abTestResults = useCachedQuery(
		api.collections.analytics.queries.getAbTestResults,
		parentABTestNode &&
			(campaign?.status === "published" ||
				campaign?.status === "preview" ||
				campaign?.status === "completed")
			? {
					campaignId: campaign._id,
					campaignEnvironment:
						campaign?.status === "preview" ? "preview" : "production",
					abTestConfigs: [
						{
							abTestId: parentABTestNode.id,
							conversionEventId:
								campaign.campaignSettings?.primaryGoal?.id ||
								(campaign.type === "lead-generation"
									? "form-submission"
									: "external-link-click"),
						},
					],
				}
			: "skip",
	);

	// Get used landing page IDs by other variants in current test (excluding current)
	const usedLandingPageIds = useMemo(() => {
		return currentTestVariantNodes
			.filter((variant) => variant.id !== node.id && variant.data.variantId)
			.map((variant) => variant.data.variantId);
	}, [currentTestVariantNodes, node.id]);

	// Get variant letter for other variants in current test using the same landing page
	const getVariantLetterForLandingPage = (landingPageId: string) => {
		const variantUsingPage = currentTestVariantNodes.find(
			(variant) =>
				variant.id !== node.id && variant.data.variantId === landingPageId,
		);
		if (variantUsingPage) {
			return getVariantLetter(variantUsingPage.data.variantIndex || 0);
		}
		return null;
	};

	// Get the current landing page data
	const currentLandingPage = useMemo(() => {
		if (!node.data.variantId) return null;

		if (isTestCompleted) {
			return landingPages?.find((page) => page._id === node.data.variantId);
		}

		// For control variants, find in landingPages
		if (node.data.isControl && landingPages) {
			return landingPages.find((page) => page._id === node.data.variantId);
		}

		// For non-control variants, find in variantLandingPages
		if (!node.data.isControl && variantLandingPages) {
			return variantLandingPages.find(
				(page) => page._id === node.data.variantId,
			);
		}

		return null;
	}, [
		node.data.variantId,
		node.data.isControl,
		landingPages,
		variantLandingPages,
		isTestCompleted,
	]);

	// Process analytics data for current variant
	const variantAnalytics = useMemo(() => {
		if (!abTestResults?.[0]?.payload || !node.id) return null;

		const analytics = abTestResults[0].payload.find(
			(result) => result.ab_test_variant_id === node.id,
		);

		if (!analytics) return null;

		// Calculate conversion rate manually like in the chart
		const calculatedConversionRate =
			analytics.conversions && analytics.exposures > 0
				? (analytics.conversions / analytics.exposures) * 100
				: 0;

		// Win probability might come as decimal (0.43) instead of percentage (43%), so handle both cases
		const calculatedWinProbability =
			analytics.win_probability !== undefined
				? analytics.win_probability < 1
					? analytics.win_probability * 100 // Convert decimal to percentage
					: analytics.win_probability // Already a percentage
				: undefined;

		return {
			...analytics,
			calculatedConversionRate,
			calculatedWinProbability,
		};
	}, [abTestResults, node.id]);

	// Check if this variant is the winner
	const isWinner = useMemo(() => {
		return (
			parentABTestNode?.data.status === "completed" &&
			parentABTestNode?.data.winner === node.id
		);
	}, [parentABTestNode?.data.status, parentABTestNode?.data.winner, node.id]);

	console.log({ currentLandingPage, variantAnalytics, isWinner });

	const updateVariantData = (updates: Partial<typeof node.data>) => {
		updateNodeData(node.id, updates);
	};

	const updateVariantId = (variantId: string) => {
		// Prevent unselecting once a landing page is selected
		if (!variantId && node.data.variantId) {
			return;
		}

		updateVariantData({
			variantId: variantId ? (variantId as Id<"landingPages">) : undefined,
		});
	};

	const handleTitleSave = () => {
		if (isEditingDisabled) return;
		updateVariantData({ title: title.trim() || "Variant" });
		setIsEditingTitle(false);
	};

	const handleDescriptionSave = () => {
		if (isEditingDisabled) return;
		updateVariantData({ description: description.trim() });
		setIsEditingDescription(false);
	};

	const handleNavigateToABTestPanel = () => {
		if (parentABTestNode) {
			setNodes((nodes) =>
				nodes.map((n) => ({
					...n,
					selected: n.id === parentABTestNode.id,
					data: {
						...n.data,
						isHovered: false,
					},
				})),
			);
		}
	};

	const handleCreateVariant = async () => {
		if (isEditingDisabled || isCreatingVariant) return;
		if (controlVariant?.data.variantId) {
			setIsCreatingVariant(true);
			try {
				const newVariant = await createVariant({
					parentId: controlVariant.data.variantId,
				});

				// Auto-select the newly created variant
				if (newVariant) {
					updateVariantData({
						variantId: newVariant as Id<"landingPages">,
					});
				}
			} catch (error) {
				console.error("Failed to create variant:", error);
				toast.error("Failed to create variant", {
					id: "create-variant-error",
					description:
						"There was an error creating the variant. Please try again.",
				});
			} finally {
				setIsCreatingVariant(false);
			}
		}
	};

	const handleRevalidateAnalytics = async () => {
		if (!parentABTestNode || !campaign || isRevalidating) return;

		setIsRevalidating(true);
		try {
			await revalidateAnalyticsMutation({
				campaignId: campaign._id,
				queries: [
					{
						queryId: "ab-test-result" as const,
						abTestId: parentABTestNode.id,
						conversionEventId:
							campaign.campaignSettings?.primaryGoal?.id ||
							(campaign.type === "lead-generation"
								? "form-submission"
								: "external-link-click"),
						confidenceLevel: parentABTestNode.data.confidenceLevel || 95,
						campaignEnvironment:
							campaign?.status === "preview"
								? ("preview" as const)
								: ("production" as const),
					},
				],
			});

			toast.success("Analytics refreshed", {
				id: "revalidate-analytics-success",
				description:
					"Performance data has been updated with the latest results.",
			});
		} catch (error) {
			console.error("Failed to revalidate analytics:", error);
			toast.error("Failed to refresh analytics", {
				id: "revalidate-analytics-error",
				description:
					"There was an error refreshing the data. Please try again.",
			});
		} finally {
			setIsRevalidating(false);
		}
	};

	const handleNavigateToAnalytics = () => {
		router.push(`/campaigns/${campaign._id}/analytics?screen=ab-tests`);
	};

	const promoteToWinner = async () => {
		if (!node.data.variantId || !parentABTestNode) return;

		try {
			const currentTime = new Date().toISOString();

			// Use the promoteToChampion mutation to promote the winning landing page
			await promoteToChampionMutation({
				id: node.data.variantId,
			});

			// Complete the AB test and set the winner
			updateNodeData(parentABTestNode.id, {
				status: "completed",
				isCompleted: true,
				winner: node.id, // Store the winning variant ID
				completedAt: currentTime,
			});

			// Find the parent segment node to update its primary landing page and translations
			const parentSegmentNode = nodes.find(
				(n) => n.id === parentABTestNode.parentId,
			);
			if (parentSegmentNode) {
				// Fetch translations for the winning landing page using Convex client
				try {
					const translations = await convex.query(
						api.collections.landingPages.queries.getTranslationsByOriginalId,
						{ originalId: node.data.variantId },
					);

					// Prepare translations data for the segment node
					const translationsData = translations.map((translation) => ({
						landingPageId: translation._id,
						language: translation.language || "unknown",
					}));

					// Update the segment's primary landing page and its translations
					updateNodeData(parentSegmentNode.id, {
						primaryLandingPageId: node.data.variantId,
						translations: translationsData,
					});
				} catch (translationError) {
					console.warn("Failed to fetch translations:", translationError);
					// Still update the primary landing page even if translations fail
					updateNodeData(parentSegmentNode.id, {
						primaryLandingPageId: node.data.variantId,
						translations: [], // Clear translations if fetch fails
					});
				}
			}

			toast.success("Variant promoted to champion", {
				description: "This variant is now the champion landing page.",
			});
		} catch (error) {
			console.error("Error promoting variant to champion:", error);
			toast.error("Failed to promote variant", {
				description: "Please try again or contact support.",
			});
		}

		setShowPromoteDialog(false);
	};

	return (
		<div className="flex relative flex-col h-full">
			{/* Header - Fixed */}
			<div className="flex flex-shrink-0 gap-3 items-center p-4 border-b bg-muted">
				<div
					className={cn(
						"flex justify-center items-center w-8 h-8 text-sm font-bold rounded-lg",
						getVariantColor(
							node.data.variantIndex || 0,
							node.data.isControl || false,
						),
					)}
				>
					{getVariantLetter(node.data.variantIndex || 0)}
				</div>
				<div className="flex-1">
					<div className="flex flex-col">
						{isEditingTitle ? (
							<Input
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								onBlur={handleTitleSave}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										handleTitleSave();
									} else if (e.key === "Escape") {
										setTitle(node.data.title);
										setIsEditingTitle(false);
									}
								}}
								autoFocus
								className="p-0 !h-auto text-lg font-semibold leading-tight bg-transparent border-none !ring-0 shadow-none focus-visible:ring-0 border-none outline-none focus-visible:ring-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
							/>
						) : (
							<div
								className={cn(
									"text-lg font-semibold leading-tight transition-colors",
									!isEditingDisabled && "cursor-pointer hover:text-brand",
								)}
								onClick={() => !isEditingDisabled && setIsEditingTitle(true)}
							>
								{title || "Variant"}
							</div>
						)}
						{isEditingDescription ? (
							<Input
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								onBlur={handleDescriptionSave}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										handleDescriptionSave();
									} else if (e.key === "Escape") {
										setDescription(node.data.description || "");
										setIsEditingDescription(false);
									}
								}}
								placeholder="Add a description..."
								autoFocus
								className="p-0 !h-auto text-sm leading-tight bg-transparent border-none shadow-none text-muted-foreground focus-visible:ring-0 placeholder:text-muted-foreground border-none outline-none focus-visible:ring-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
							/>
						) : (
							<div
								className={cn(
									"text-sm leading-tight transition-colors text-muted-foreground",
									!isEditingDisabled && "cursor-pointer hover:text-foreground",
								)}
								onClick={() =>
									!isEditingDisabled && setIsEditingDescription(true)
								}
							>
								{description ||
									"Configure variant settings and monitor performance"}
							</div>
						)}
					</div>
				</div>
				<div className="flex gap-2 items-center">
					{node.data.isControl && (
						<Badge variant="outline" className="text-xs">
							Control
						</Badge>
					)}
					{isWinner && (
						<Badge variant="outline" className="gap-1 text-brand">
							<Crown className="size-3" />
							Winner
						</Badge>
					)}
				</div>
			</div>

			{/* Content - Scrollable */}
			<div className="overflow-y-auto flex-1">
				<div className="p-4 space-y-4">
					{/* Landing Page Selection */}
					<div className="space-y-3">
						<Label htmlFor="landing-page">Landing Page</Label>
						{!campaign ? (
							<div className="p-3 text-center rounded-lg bg-muted">
								<p className="text-sm text-muted-foreground">
									Please create a campaign first
								</p>
							</div>
						) : node.data.isControl ? (
							// Control variant - select from campaign landing pages
							landingPages && landingPages.length > 0 ? (
								<>
									<Select
										value={node.data.variantId || undefined}
										onValueChange={(value) =>
											!isEditingDisabled && updateVariantId(value)
										}
										disabled={isEditingDisabled}
									>
										<SelectTrigger
											id="landing-page"
											className="h-8"
											disabled={isEditingDisabled}
										>
											<SelectValue placeholder="Select landing page for this variant" />
										</SelectTrigger>
										<SelectContent>
											{landingPages.map((page) => {
												const isUsed = usedLandingPageIds.includes(page._id);
												const variantLetter = getVariantLetterForLandingPage(
													page._id,
												);
												return (
													<SelectItem
														key={page._id}
														value={page._id}
														disabled={isUsed}
														className={isUsed ? "opacity-50" : ""}
													>
														<div className="flex justify-between items-center w-full">
															<span>{page.title}</span>
															{isUsed && variantLetter && (
																<Badge
																	variant="outline"
																	className="ml-2 text-xs"
																>
																	Used by {variantLetter}
																</Badge>
															)}
														</div>
													</SelectItem>
												);
											})}
										</SelectContent>
									</Select>
									<p className="text-xs text-muted-foreground">
										Select the base landing page for A/B testing
									</p>
									{node.data.variantId && currentLandingPage && (
										<div className="flex gap-2">
											<Button
												variant="outline"
												size="sm"
												className="flex-1"
												onClick={() => {
													if (currentLandingPage.previewUrl) {
														window.open(
															currentLandingPage.previewUrl,
															"_blank",
														);
													} else {
														toast.error("Cannot preview landing page", {
															description:
																"This landing page needs to be published first to generate a preview URL.",
														});
													}
												}}
												disabled={!currentLandingPage.previewUrl}
											>
												<Eye className="size-3.5" />
												Preview
											</Button>
											<Button
												variant="outline"
												size="sm"
												className="flex-1"
												onClick={() => {
													window.location.href = `/assets/landing-pages/${currentLandingPage._id}/edit`;
												}}
											>
												Edit
												<ChevronRight className="size-3.5" />
											</Button>
										</div>
									)}
									{node.data.variantId &&
										currentLandingPage &&
										!currentLandingPage.previewUrl && (
											<p className="text-xs text-muted-foreground">
												Preview is not available since the landing page is not
												published yet.
											</p>
										)}
								</>
							) : (
								<div className="flex flex-col justify-center items-center h-32 rounded-lg border bg-muted">
									<p className="text-sm text-muted-foreground">
										No landing pages found
									</p>
									<Button
										size="sm"
										variant="outline"
										className="mt-2"
										onClick={() => openModal(campaign._id)}
										disabled={isEditingDisabled}
									>
										Create your first landing page
									</Button>
								</div>
							)
						) : // Non-control variant - select from variants of control's landing page
						!controlVariant?.data.variantId ? (
							<div className="flex flex-col justify-center items-center h-32 rounded-lg border bg-muted">
								<p className="text-sm text-muted-foreground">
									Control variant has no landing page selected
								</p>
								<Button
									size="sm"
									variant="outline"
									className="mt-2"
									onClick={() => {
										if (controlVariant) {
											setNodes((nodes) =>
												nodes.map((n) => ({
													...n,
													selected: n.id === controlVariant.id,
													data: { ...n.data, isHovered: false },
												})),
											);
										}
									}}
								>
									Go to Control Variant
								</Button>
							</div>
						) : variantLandingPages && variantLandingPages.length > 0 ? (
							<>
								<div className="flex gap-2">
									{" "}
									<Select
										value={node.data.variantId || undefined}
										onValueChange={(value) =>
											!isEditingDisabled && updateVariantId(value)
										}
										disabled={isEditingDisabled}
									>
										<SelectTrigger
											id="landing-page"
											className="h-8"
											disabled={isEditingDisabled}
										>
											<SelectValue placeholder="Select variant landing page" />
										</SelectTrigger>
										<SelectContent>
											{variantLandingPages.map((page) => {
												const isUsed = usedLandingPageIds.includes(page._id);
												const variantLetter = getVariantLetterForLandingPage(
													page._id,
												);
												return (
													<SelectItem
														key={page._id}
														value={page._id}
														disabled={isUsed}
														className={isUsed ? "opacity-50" : ""}
													>
														<div className="flex justify-between items-center w-full">
															<span>{page.title}</span>
															{isUsed && variantLetter && (
																<Badge
																	variant="outline"
																	className="ml-2 text-xs"
																>
																	Used by {variantLetter}
																</Badge>
															)}
														</div>
													</SelectItem>
												);
											})}
										</SelectContent>
									</Select>
									{/* Create variant button */}
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="outline"
												size="iconSm"
												className="p-0 size-8"
												onClick={handleCreateVariant}
											>
												<Plus className="size-3.5" />
											</Button>
										</TooltipTrigger>
										<TooltipContent>Create variant</TooltipContent>
									</Tooltip>
								</div>
								<p className="text-xs text-muted-foreground">
									Select a variant of the control's landing page
								</p>
								{node.data.variantId && currentLandingPage && (
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											className="flex-1"
											onClick={() => {
												if (currentLandingPage.previewUrl) {
													window.open(currentLandingPage.previewUrl, "_blank");
												} else {
													toast.error("Cannot preview landing page", {
														description:
															"This landing page needs to be published first to generate a preview URL.",
													});
												}
											}}
											disabled={!currentLandingPage.previewUrl}
										>
											<Eye className="size-3.5" />
											Preview
										</Button>
										<Button
											variant="outline"
											size="sm"
											className="flex-1"
											onClick={() => {
												window.location.href = `/assets/landing-pages/${currentLandingPage._id}/edit`;
											}}
										>
											Edit
											<ChevronRight className="size-3.5" />
										</Button>
									</div>
								)}
								{node.data.variantId &&
									currentLandingPage &&
									!currentLandingPage.previewUrl && (
										<p className="text-xs text-muted-foreground">
											Preview is not available since the landing page is not
											published yet.
										</p>
									)}
							</>
						) : isTestCompleted ? (
							<>
								<Select
									value={currentLandingPage?._id || undefined}
									onValueChange={(value) =>
										!isEditingDisabled && updateVariantId(value)
									}
									disabled={true}
								>
									<SelectTrigger
										id="landing-page"
										className="h-8"
										disabled={true}
									>
										<SelectValue placeholder="Select variant landing page" />
									</SelectTrigger>
									<SelectContent>
										{landingPages?.map((page) => {
											return (
												<SelectItem key={page._id} value={page._id}>
													<div className="flex justify-between items-center w-full">
														<span>{page.title}</span>
													</div>
												</SelectItem>
											);
										})}
									</SelectContent>
								</Select>

								{node.data.variantId && currentLandingPage && (
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											className="flex-1"
											onClick={() => {
												if (currentLandingPage.previewUrl) {
													window.open(currentLandingPage.previewUrl, "_blank");
												} else {
													toast.error("Cannot preview landing page", {
														description:
															"This landing page needs to be published first to generate a preview URL.",
													});
												}
											}}
											disabled={!currentLandingPage.previewUrl}
										>
											<Eye className="size-3.5" />
											Preview
										</Button>
										<Button
											variant="outline"
											size="sm"
											className="flex-1"
											onClick={() => {
												window.location.href = `/assets/landing-pages/${currentLandingPage._id}/edit`;
											}}
										>
											Edit
											<ChevronRight className="size-3.5" />
										</Button>
									</div>
								)}
								{node.data.variantId &&
									currentLandingPage &&
									!currentLandingPage.previewUrl && (
										<p className="text-xs text-muted-foreground">
											Preview is not available since the landing page is not
											published yet.
										</p>
									)}
							</>
						) : (
							<div className="flex flex-col justify-center items-center h-32 rounded-lg border bg-muted">
								<p className="text-sm text-muted-foreground">
									No variants found for the control's landing page
								</p>
								<Button
									size="sm"
									variant="outline"
									className="mt-2"
									onClick={handleCreateVariant}
									disabled={isEditingDisabled || isCreatingVariant}
								>
									{isCreatingVariant ? (
										<>
											<Spinner size="xs" className="mr-2" />
											Creating...
										</>
									) : (
										"Create Variant"
									)}
								</Button>
							</div>
						)}
					</div>

					<Separator />

					{/* Traffic Allocation */}
					<div className="space-y-3">
						<div className="flex justify-between items-center">
							<Label>Traffic Allocation</Label>
							<Button
								size="sm"
								variant="ghost"
								onClick={handleNavigateToABTestPanel}
								className="h-7 text-xs text-muted-foreground hover:text-foreground"
							>
								Edit Distribution
								<ArrowUpRight className="size-3" />
							</Button>
						</div>
						<div className="p-4 space-y-3 rounded-lg bg-muted">
							<div className="flex justify-between items-center">
								<span className="text-sm font-medium">Current Allocation</span>
								<Badge variant="outline" className="bg-background">
									{node.data.trafficPercentage || 0}%
								</Badge>
							</div>
							<Progress
								value={node.data.trafficPercentage || 0}
								className="h-2"
								// Use variant color for progress bar
								style={
									{
										"--progress-background": getVariantColor(
											node.data.variantIndex || 0,
											node.data.isControl || false,
										)
											.split(" ")[0]
											.replace("bg-", "")
											.replace("-500", "")
											.replace("-600", ""),
									} as React.CSSProperties
								}
							/>
							<p className="text-xs text-muted-foreground">
								This variant receives {node.data.trafficPercentage || 0}% of the
								test traffic
							</p>
						</div>
					</div>

					<Separator />

					{/* Performance Section - Real Analytics Data */}
					<div className="space-y-3">
						<div className="flex justify-between items-center">
							<Label>Performance Metrics</Label>
						</div>

						{variantAnalytics ? (
							<div className="grid grid-cols-2 rounded-lg border bg-muted">
								<div className="p-3 border-r">
									<div className="flex justify-between items-start">
										<div>
											<p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
												Exposures
											</p>
											<p className="text-2xl font-bold">
												{variantAnalytics.exposures?.toLocaleString() || 0}
											</p>
										</div>
										<div className="text-muted-foreground">
											<Eye className="size-4" />
										</div>
									</div>
								</div>

								<div className="p-3">
									<div className="flex justify-between items-start">
										<div>
											<p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
												Conversions
											</p>
											<p className="text-2xl font-bold">
												{variantAnalytics.conversions?.toLocaleString() || 0}
											</p>
										</div>
										<Goal className="size-4" />
									</div>
								</div>

								<div className="p-3 border-t border-r">
									<div className="flex justify-between items-start">
										<div>
											<p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
												Conv. Rate
											</p>
											<p className="text-2xl font-bold">
												{`${variantAnalytics.calculatedConversionRate.toFixed(2)}%`}
											</p>
										</div>
										<Percent className="size-4" />
									</div>
								</div>

								<div className="p-3 border-t">
									<div className="flex justify-between items-start">
										<div>
											<p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
												Win Probability
											</p>
											<p className="text-2xl font-bold">
												{variantAnalytics.calculatedWinProbability !== undefined
													? `${variantAnalytics.calculatedWinProbability.toFixed(1)}%`
													: "-"}
											</p>
										</div>
										<TrendingUp className="size-4" />
									</div>
								</div>
								{/* Footer */}
								<div className="grid grid-cols-2 col-span-full border-t">
									<div className="flex items-center px-3 text-xs border-r text-muted-foreground">
										Last updated{" "}
										{formatRelativeTimeShort(
											abTestResults?.[0]?.lastUpdatedAt || new Date(),
										)}{" "}
										ago
									</div>
									<div className="flex justify-between items-center">
										{" "}
										<Button
											size="sm"
											variant="ghost"
											className="flex-1 h-8 text-xs"
											onClick={handleRevalidateAnalytics}
										>
											{isRevalidating && <Spinner size="xs" className="mr-1" />}
											Refresh
										</Button>
										<Separator orientation="vertical" className="h-full" />
										<Button
											size="sm"
											variant="ghost"
											className="flex-1 h-8 text-xs"
											onClick={handleNavigateToAnalytics}
										>
											View Details
										</Button>
									</div>
								</div>
								{/* Promote Button */}
								{(parentABTestNode?.data.status === "running" ||
									parentABTestNode?.data.status === "paused") &&
									node.data.variantId && (
										<div className="overflow-hidden col-span-full border-t">
											<Button
												size="sm"
												variant="ghost"
												className="w-full h-8 text-brand hover:text-brand"
												onClick={() => setShowPromoteDialog(true)}
											>
												<Crown className="size-3" />
												Promote to Winner
											</Button>
										</div>
									)}
							</div>
						) : (
							<div className="grid grid-cols-2 rounded-lg border bg-muted">
								<div className="p-3 border-r">
									<div className="flex justify-between items-start">
										<div>
											<p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
												Exposures
											</p>
											<p className="text-2xl font-bold text-muted-foreground">
												-
											</p>
										</div>
										<div className="text-muted-foreground">
											<Eye className="size-4" />
										</div>
									</div>
								</div>

								<div className="p-3">
									<div className="flex justify-between items-start">
										<div>
											<p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
												Conversions
											</p>
											<p className="text-2xl font-bold text-muted-foreground">
												-
											</p>
										</div>
										<Goal className="size-4 text-muted-foreground" />
									</div>
								</div>

								<div className="p-3 border-t border-r">
									<div className="flex justify-between items-start">
										<div>
											<p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
												Conv. Rate
											</p>
											<p className="text-2xl font-bold text-muted-foreground">
												-
											</p>
										</div>
										<Percent className="size-4 text-muted-foreground" />
									</div>
								</div>

								<div className="p-3 border-t">
									<div className="flex justify-between items-start">
										<div>
											<p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
												Win Probability
											</p>
											<p className="text-2xl font-bold text-muted-foreground">
												-
											</p>
										</div>
										<TrendingUp className="size-4 text-muted-foreground" />
									</div>
								</div>
								{/* Footer */}
								<div className="grid grid-cols-2 col-span-full border-t">
									<div className="flex items-center px-3 text-xs border-r text-muted-foreground">
										No recent updates
									</div>
									<div className="flex justify-between items-center">
										<Button
											size="sm"
											variant="ghost"
											className="flex-1 h-8 text-xs"
											onClick={handleRevalidateAnalytics}
											disabled={isRevalidating || !parentABTestNode}
										>
											{isRevalidating && <Spinner size="xs" className="mr-1" />}
											Refresh
										</Button>
										<Separator orientation="vertical" className="h-full" />
										<Button
											size="sm"
											variant="ghost"
											className="flex-1 h-8 text-xs"
											onClick={handleNavigateToAnalytics}
										>
											View Details
										</Button>
									</div>
								</div>
								{/* Promote Button - Only show when test is running/paused and variant has landing page */}
								{(parentABTestNode?.data.status === "running" ||
									parentABTestNode?.data.status === "paused") &&
									node.data.variantId && (
										<div className="overflow-hidden col-span-full border-t">
											<Button
												size="sm"
												variant="ghost"
												className="w-full h-8 text-brand hover:text-brand"
												onClick={() => setShowPromoteDialog(true)}
											>
												<Crown className="size-3" />
												Promote to Winner
											</Button>
										</div>
									)}
							</div>
						)}

						{!variantAnalytics &&
							parentABTestNode?.data.status === "running" && (
								<p className="p-2 text-xs text-center text-muted-foreground">
									Analytics data will appear once the test starts collecting
									data
								</p>
							)}

						{!variantAnalytics && parentABTestNode?.data.status === "draft" && (
							<p className="p-2 text-xs text-center text-muted-foreground">
								Start the A/B test to begin collecting performance data
							</p>
						)}
					</div>
				</div>
			</div>

			{/* Alert Dialog for Promote to Winner */}
			<AlertDialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Promote to Winner</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to promote this variant to winner? This will
							complete the A/B test and update the segment's default landing
							page to use this variant's landing page.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={promoteToWinner}>
							Promote to Winner
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};
