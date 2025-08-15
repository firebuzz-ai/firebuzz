"use client";

import type {
	ABTestNode,
	VariantNode,
} from "@/components/canvas/campaign/nodes/campaign/types";
import { useNewLandingPageModal } from "@/hooks/ui/use-new-landing-page-modal";
import {
	type Doc,
	type Id,
	api,
	useCachedQuery,
	useMutation,
} from "@firebuzz/convex";
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
	AlertCircle,
	ArrowUpRight,
	ChevronRight,
	Eye,
	TrendingUp,
} from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { useNodes, useReactFlow } from "@xyflow/react";
import { useMemo, useState } from "react";

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
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [isEditingDescription, setIsEditingDescription] = useState(false);
	const [title, setTitle] = useState(node.data.title);
	const [description, setDescription] = useState(node.data.description || "");
	const [isCreatingVariant, setIsCreatingVariant] = useState(false);
	const [_state, { openModal }] = useNewLandingPageModal();

	// Get mutation for creating variants
	const createVariant = useMutation(
		api.collections.landingPages.mutations.createVariant,
	);

	// Fetch landing pages for the campaign (for control variant)
	const landingPages = useCachedQuery(
		api.collections.landingPages.queries.getByCampaignId,
		campaign && node.data.isControl
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
	const isEditingDisabled = parentABTestNode?.data.status === "completed";

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
	]);

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
															<Badge variant="outline" className="ml-2 text-xs">
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

					{/* Performance Section - Redesigned */}
					<div className="space-y-3">
						<div className="flex gap-2 items-center">
							<TrendingUp className="w-4 h-4 text-muted-foreground" />
							<Label>Performance Metrics</Label>
							<Badge variant="outline" className="text-xs bg-muted">
								Real-time
							</Badge>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div className="p-3 rounded-lg border bg-card">
								<div className="flex justify-between items-start">
									<div>
										<p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
											Visitors
										</p>
										<p className="text-2xl font-bold">0</p>
									</div>
								</div>
							</div>

							<div className="p-3 rounded-lg border bg-card">
								<div className="flex justify-between items-start">
									<div>
										<p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
											Conversions
										</p>
										<p className="text-2xl font-bold">0</p>
									</div>
								</div>
							</div>

							<div className="p-3 rounded-lg border bg-card">
								<div className="flex justify-between items-start">
									<div>
										<p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
											Conv. Rate
										</p>
										<p className="text-2xl font-bold">0%</p>
									</div>
								</div>
							</div>

							<div className="p-3 rounded-lg border bg-card">
								<div className="flex justify-between items-start">
									<div>
										<p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
											Confidence
										</p>
										<p className="text-2xl font-bold text-muted-foreground">
											-
										</p>
									</div>
								</div>
							</div>
						</div>

						<div className="p-4 rounded-lg border bg-muted/50">
							<div className="flex gap-2 items-center mb-3">
								<AlertCircle className="w-4 h-4 text-muted-foreground" />
								<span className="text-sm font-medium">Performance Status</span>
							</div>
							<p className="text-sm text-muted-foreground">
								{node.data.isControl
									? "This is the control variant. All other variants will be compared against this baseline."
									: "This variant's performance will be compared against the control to determine statistical significance."}
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
