"use client";

import type {
	ABTestNode,
	RuleTypeId,
	SegmentNode,
	SegmentRule,
} from "@/components/canvas/campaign/nodes/campaign/types";
import { useNewLandingPageModal } from "@/hooks/ui/use-new-landing-page-modal";
import {
	ConvexError,
	type Doc,
	type Id,
	api,
	useCachedQuery,
	useMutation,
} from "@firebuzz/convex";
import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { LocaleSelector } from "@firebuzz/ui/components/reusable/locale-selector";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Label } from "@firebuzz/ui/components/ui/label";
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
	ArrowRight,
	ArrowUpRight,
	Ban,
	ChevronRight,
	Code,
	Eye,
	EyeOff,
	GitBranch,
	Languages,
	Plus,
	Split,
	TestTube,
} from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { useNodes, useReactFlow } from "@xyflow/react";
import { nanoid } from "nanoid";
import { useMemo, useState } from "react";
import { RULE_TYPE_DEFINITIONS } from "../helpers/rule-types";
import { AddRulesPanel } from "./add-rules-panel";
import { RuleConfigurationPanel } from "./rule-configuration-panel";

interface SegmentPanelProps {
	node: SegmentNode;
	campaign?: Doc<"campaigns">;
}

export const SegmentPanel = ({ node, campaign }: SegmentPanelProps) => {
	const { updateNodeData, setNodes, addNodes, addEdges, setEdges } =
		useReactFlow();
	const nodes = useNodes();
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [isEditingDescription, setIsEditingDescription] = useState(false);
	const [title, setTitle] = useState(node.data.title);
	const [description, setDescription] = useState(node.data.description || "");
	const [showAddRules, setShowAddRules] = useState(false);
	const [isCreatingTranslation, setIsCreatingTranslation] = useState(false);
	const [translationLanguage, setTranslationLanguage] = useState("");
	const [editingRule, setEditingRule] = useState<SegmentRule | null>(null);
	const [isCreatingTranslationLoading, setIsCreatingTranslationLoading] =
		useState(false);
	const [_state, { openModal }] = useNewLandingPageModal();

	// Fetch landing pages for the campaign
	const landingPages = useCachedQuery(
		api.collections.landingPages.queries.getBaseByCampaignId,
		campaign
			? {
					campaignId: campaign._id,
				}
			: "skip",
	);

	// Get the current primary landing page data
	const currentPrimaryLandingPage = useMemo(() => {
		if (!node.data.primaryLandingPageId || !landingPages) return null;
		return landingPages.find(
			(page) => page._id === node.data.primaryLandingPageId,
		);
	}, [node.data.primaryLandingPageId, landingPages]);

	// Translation mode handling (declare before using in queries)
	const translationMode = node.data.translationMode ?? "disabled";

	// Fetch translations for the selected primary landing page when translation is enabled
	const translations = useCachedQuery(
		api.collections.landingPages.queries.getTranslationsByOriginalId,
		node.data.primaryLandingPageId && translationMode !== "disabled"
			? { originalId: node.data.primaryLandingPageId }
			: "skip",
	);

	const createTranslationMutation = useMutation(
		api.collections.landingPages.mutations.createTranslation,
	);

	// Get all AB test nodes connected to this segment node
	const abTestNodes = useMemo(() => {
		return nodes.filter(
			(n) => n.type === "ab-test" && n.parentId === node.id,
		) as ABTestNode[];
	}, [nodes, node.id]);

	// Show all AB tests in the list (both visible and hidden)
	const allABTests = useMemo(() => {
		return abTestNodes;
	}, [abTestNodes]);

	const hiddenTestsCount = useMemo(() => {
		return abTestNodes.filter((test) => test.hidden).length;
	}, [abTestNodes]);

	// Check if there's an active AB test (draft, running, or paused)
	const hasActiveABTest = useMemo(() => {
		return abTestNodes.some((test) => {
			const status = test.data.status;
			return status === "draft" || status === "running" || status === "paused";
		});
	}, [abTestNodes]);

	// Calculate available rule types (custom parameters can have multiple instances)
	const rules = useMemo(() => {
		return node.data.rules.map((rule) => ({
			...rule,
		}));
	}, [node.data.rules]);
	const totalRuleTypes = Object.keys(RULE_TYPE_DEFINITIONS).length;
	const uniqueRuleTypes = new Set(rules.map((rule) => rule.ruleType));
	const usedRuleTypes = uniqueRuleTypes.size;
	const customParameterCount = rules.filter(
		(rule) => rule.ruleType === "customParameter",
	).length;
	const canAddMoreRules =
		usedRuleTypes < totalRuleTypes ||
		(usedRuleTypes === totalRuleTypes &&
			!uniqueRuleTypes.has("customParameter"));

	const updateSegmentData = (updates: Partial<typeof node.data>) => {
		updateNodeData(node.id, updates);
	};

	const updatePrimaryLandingPage = (landingPageId: string) => {
		// Prevent unselecting once a landing page is selected
		if (!landingPageId && node.data.primaryLandingPageId) {
			return;
		}

		updateSegmentData({
			primaryLandingPageId: landingPageId
				? (landingPageId as Id<"landingPages">)
				: undefined,
		});
	};

	const handleTranslationModeChange = (
		mode: "disabled" | "auto-detect" | "parameter",
	) => {
		updateSegmentData({ translationMode: mode });
	};

	// Map translation mode to an icon for the trigger
	const getTranslationModeIcon = (
		mode: "disabled" | "auto-detect" | "parameter",
	) => {
		if (mode === "auto-detect") return <GitBranch className="size-3.5" />;
		if (mode === "parameter") return <Code className="size-3.5" />;
		return <Ban className="size-3.5" />; // disabled
	};

	const handleNavigateToTrafficPanel = () => {
		// Find the parent traffic node
		const trafficNode = nodes.find(
			(n) => n.type === "traffic" && node.parentId === n.id,
		);
		if (trafficNode) {
			// Select the traffic node to navigate to its panel and clear all external hover states
			setNodes((nodes) =>
				nodes.map((n) => ({
					...n,
					selected: n.id === trafficNode.id,
					data: {
						...n.data,
						isHovered: false, // Clear external hover state for all nodes
					},
				})),
			);
		}
	};

	const handleTitleSave = () => {
		updateSegmentData({ title: title.trim() || "New Segment" });
		setIsEditingTitle(false);
	};

	const handleDescriptionSave = () => {
		updateSegmentData({ description: description.trim() });
		setIsEditingDescription(false);
	};

	const handleEditRule = (rule: SegmentRule) => {
		setEditingRule(rule);
	};

	const getRuleIcon = (ruleType: RuleTypeId) => {
		const ruleTypeDefinition = RULE_TYPE_DEFINITIONS[ruleType];
		return ruleTypeDefinition?.icon || <div className="w-4 h-4" />;
	};

	const handleABTestClick = (abTestId: string) => {
		// Select the AB test node and clear all external hover states
		setNodes((nodes) =>
			nodes.map((n) => ({
				...n,
				selected: n.id === abTestId,
				data: {
					...n.data,
					isHovered: false, // Clear external hover state for all nodes
				},
			})),
		);
	};

	const handleABTestHover = (abTestId: string | null) => {
		// Apply hover effect to the actual canvas node if it's visible
		setNodes((nodes) =>
			nodes.map((n) => ({
				...n,
				data: {
					...n.data,
					isHovered: n.id === abTestId,
				},
			})),
		);
	};

	const handleToggleABTestVisibility = (abTestId: string) => {
		const abTest = abTestNodes.find((test) => test.id === abTestId);
		if (!abTest) return;

		const willBeHidden = !abTest.hidden;

		// Find all variant nodes that belong to this AB test
		const variantNodeIds = nodes
			.filter((n) => n.type === "variant" && n.parentId === abTestId)
			.map((n) => n.id);

		// Update the AB test node and all its variant children
		setNodes((nodes) =>
			nodes.map((n) => {
				if (n.id === abTestId || variantNodeIds.includes(n.id)) {
					return {
						...n,
						hidden: willBeHidden,
					};
				}
				return n;
			}),
		);

		// Update all connected edges (AB test to variants, and segment to AB test)
		setEdges((edges) =>
			edges.map((edge) => {
				// Hide edges connected to the AB test or its variants
				if (
					edge.source === abTestId ||
					edge.target === abTestId ||
					variantNodeIds.includes(edge.source) ||
					variantNodeIds.includes(edge.target)
				) {
					return {
						...edge,
						hidden: willBeHidden,
					};
				}
				return edge;
			}),
		);
	};

	const getStatusBadgeVariant = (status: string) => {
		switch (status) {
			case "running":
				return "default" as const;
			case "completed":
				return "emerald" as const;
			case "paused":
				return "secondary" as const;

			default:
				return "outline" as const;
		}
	};

	const handleCreateTest = () => {
		// Validate that there's no active test first
		if (hasActiveABTest) {
			toast.error("You can only have one active test per segment", {
				description:
					"Complete or archive the existing test to create a new one.",
			});
			return;
		}

		const newNodeId = `test-${nanoid(8)}`;
		const newNode: ABTestNode = {
			id: newNodeId,
			type: "ab-test",
			position: {
				x: 0,
				y: 150,
			},
			parentId: node.id,
			data: {
				title: "New A/B Test",
				description: "Compare variants to improve performance",
				status: "draft",
				hypothesis:
					"We believe that changing [element] will result in [outcome] because [reasoning].",
				isCompleted: false,
				startedAt: undefined,
				completedAt: undefined,
				pausedAt: undefined,
				resumedAt: undefined,
				endDate: undefined,
				primaryMetric: "conversions",
				completionCriteria: {
					sampleSizePerVariant: 1000,
					testDuration: 14,
				},
				confidenceLevel: 95,
				variants: [],
				rules: {
					winningStrategy: "winner",
				},
				winner: undefined,
				poolingPercent: 20, // Default 20% of traffic goes to A/B test
			},
		};

		// Add the new node
		addNodes(newNode);

		// Create an edge connecting the segment to the new AB test
		const newEdge = {
			id: `${node.id}-${newNodeId}`,
			source: node.id,
			target: newNodeId,
			type: "traffic-weight",
			animated: true,
			data: {
				trafficPercentage: 20, // Default pooling percentage
			},
		};

		addEdges(newEdge);

		// Auto-create two default variants (Control and Variant B)
		const gridConfig = {
			columns: 2,
			spacing: { horizontal: 550, vertical: 250 },
			initialOffset: { x: -275, y: 250 },
		};

		const variants = [
			{
				title: "Control",
				description: "Original version",
				isControl: true,
				variantIndex: 0,
			},
			{
				title: "Variant B",
				description: "Test variant",
				isControl: false,
				variantIndex: 1,
			},
		];

		const newVariantNodes = [];
		const newVariantEdges = [];

		for (let i = 0; i < variants.length; i++) {
			const variantData = variants[i];
			const variantId = `variant-${nanoid(8)}`;
			const rowIndex = Math.floor(i / gridConfig.columns);
			const colIndex = i % gridConfig.columns;

			const variantNode = {
				id: variantId,
				type: "variant" as const,
				parentId: newNodeId,
				position: {
					x:
						gridConfig.initialOffset.x +
						colIndex * gridConfig.spacing.horizontal,
					y:
						150 +
						gridConfig.initialOffset.y +
						rowIndex * gridConfig.spacing.vertical,
				},
				data: {
					title: variantData.title,
					description: variantData.description,
					// Assign segment's primary landing page to control variant
					variantId:
						variantData.isControl && node.data.primaryLandingPageId
							? node.data.primaryLandingPageId
							: undefined,
					trafficPercentage: 50, // Equal 50/50 split
					translations: [],
					isControl: variantData.isControl,
					variantIndex: variantData.variantIndex,
				},
			};

			// Create edge from AB test to variant
			const variantEdge = {
				id: `${newNodeId}-${variantId}`,
				source: newNodeId,
				target: variantId,
				type: "traffic-weight",
				animated: true,
				data: {
					trafficPercentage: 50,
				},
			};

			newVariantNodes.push(variantNode);
			newVariantEdges.push(variantEdge);
		}

		// Add all variant nodes and edges
		addNodes(newVariantNodes);
		addEdges(newVariantEdges);

		// Select the new AB test node and clear all external hover states
		setNodes((nodes) =>
			nodes.map((n) => ({
				...n,
				selected: n.id === newNodeId,
				data: {
					...n.data,
					isHovered: false, // Clear external hover state for all nodes
				},
			})),
		);
	};

	return (
		<div className="flex relative flex-col h-full">
			{/* Header - Fixed */}
			<div className="flex flex-shrink-0 gap-3 items-center p-4 border-b bg-muted">
				<div className="p-2 rounded-lg border bg-brand/10 border-brand text-brand">
					<Split className="size-4" />
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
								className="text-lg font-semibold leading-tight transition-colors cursor-pointer hover:text-brand"
								onClick={() => setIsEditingTitle(true)}
							>
								{title || "New Segment"}
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
								className="text-sm leading-tight transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
								onClick={() => setIsEditingDescription(true)}
							>
								{description ||
									"Configure targeting rules and traffic allocation"}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Content - Scrollable */}
			<div className="overflow-y-auto flex-1">
				<div className="p-4 space-y-4">
					{/* Default Landing Page Section */}
					<div className="space-y-2">
						<Label htmlFor="default-landing-page">Default Landing Page</Label>
						{!campaign ? (
							<div className="p-3 text-center rounded-lg bg-muted">
								<p className="text-sm text-muted-foreground">
									Please create a campaign first
								</p>
							</div>
						) : landingPages && landingPages.length > 0 ? (
							<>
								<Select
									value={node.data.primaryLandingPageId || undefined}
									onValueChange={updatePrimaryLandingPage}
								>
									<SelectTrigger id="default-landing-page" className="h-8">
										<div className="flex gap-2 items-center">
											<SelectValue placeholder="Select default landing page" />
											{currentPrimaryLandingPage?.language && (
												<Badge variant="outline" className="text-2xs">
													{currentPrimaryLandingPage.language}
												</Badge>
											)}
										</div>
									</SelectTrigger>
									<SelectContent>
										{landingPages.map((page) => (
											<SelectItem key={page._id} value={page._id}>
												{page.title}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="text-xs text-muted-foreground">
									This page will be shown to traffic matching this segment's
									rules
								</p>
								{node.data.primaryLandingPageId &&
									currentPrimaryLandingPage && (
										<div className="flex gap-2">
											<Button
												variant="outline"
												size="sm"
												className="flex-1"
												onClick={() => {
													if (currentPrimaryLandingPage.previewUrl) {
														window.open(
															currentPrimaryLandingPage.previewUrl,
															"_blank",
														);
													} else {
														toast.error("Cannot preview landing page", {
															description:
																"This landing page needs to be published first to generate a preview URL.",
														});
													}
												}}
												disabled={!currentPrimaryLandingPage.previewUrl}
											>
												<Eye className="size-3.5" />
												Preview
											</Button>
											<Button
												variant="outline"
												size="sm"
												className="flex-1"
												onClick={() => {
													window.location.href = `/assets/landing-pages/${currentPrimaryLandingPage._id}/edit`;
												}}
											>
												Edit
												<ChevronRight className="size-3.5" />
											</Button>
										</div>
									)}
								{node.data.primaryLandingPageId &&
									currentPrimaryLandingPage &&
									!currentPrimaryLandingPage.previewUrl && (
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
									onClick={() => campaign && openModal(campaign._id)}
								>
									Create your first landing page
								</Button>
							</div>
						)}
					</div>

					<Separator />

					{/* Translations Section - directly under Default Landing Page */}
					<div className="space-y-2">
						<div className="flex justify-between items-center">
							<Label>Translations</Label>
							{translationMode !== "disabled" &&
								node.data.primaryLandingPageId && (
									<Button
										size="sm"
										variant="outline"
										className="h-7 text-xs"
										onClick={() => setIsCreatingTranslation((v) => !v)}
									>
										{isCreatingTranslation ? "Cancel" : "Create"}
									</Button>
								)}
						</div>

						{/* Mode selector */}
						<Select
							value={translationMode}
							onValueChange={(v) =>
								handleTranslationModeChange(
									v as "disabled" | "auto-detect" | "parameter",
								)
							}
						>
							<SelectTrigger id="translation-mode" className="h-8">
								<div className="flex gap-2 items-center">
									{getTranslationModeIcon(translationMode)}
									{translationMode === "disabled"
										? "Disabled"
										: translationMode === "auto-detect"
											? "Auto-detect"
											: translationMode === "parameter"
												? "With parameter"
												: "Select translation mode"}
								</div>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="disabled">
									<div className="flex flex-col">
										<span>Disabled</span>
										<span className="text-xs leading-tight text-muted-foreground">
											No language-based routing
										</span>
									</div>
								</SelectItem>
								<SelectItem value="auto-detect">
									<div className="flex flex-col">
										<span>Auto-detect</span>
										<span className="text-xs leading-tight text-muted-foreground">
											Use browser language; route if a matching variant exists
										</span>
									</div>
								</SelectItem>
								<SelectItem value="parameter">
									<div className="flex flex-col">
										<span>With parameter</span>
										<span className="text-xs leading-tight text-muted-foreground">
											Respect "lang" query param only (e.g., lang=en)
										</span>
									</div>
								</SelectItem>
							</SelectContent>
						</Select>
						<p className="text-xs text-muted-foreground">
							Controls how visitors are routed to language-specific variants.
						</p>

						{/* Guidance when disabled or no primary page */}
						{translationMode === "disabled" && (
							<div className="text-xs text-muted-foreground">
								Enable translations to manage language variants for this
								segment.
							</div>
						)}
						{translationMode !== "disabled" &&
							!node.data.primaryLandingPageId && (
								<div className="text-xs text-muted-foreground">
									Select a default landing page to manage its translations.
								</div>
							)}

						{/* Create translation inline form */}
						{translationMode !== "disabled" &&
							node.data.primaryLandingPageId &&
							isCreatingTranslation && (
								<div className="flex gap-2 items-center">
									<LocaleSelector
										className="w-full h-8"
										defaultValue={translationLanguage}
										onLocaleChange={setTranslationLanguage}
									/>
									<Button
										size="sm"
										variant="outline"
										className="h-8"
										disabled={
											isCreatingTranslationLoading ||
											!translationLanguage.trim()
										}
										onClick={async () => {
											const lang = translationLanguage.trim();
											if (!lang) return;
											try {
												setIsCreatingTranslationLoading(true);
												await createTranslationMutation({
													originalId: node.data.primaryLandingPageId!,
													language: lang,
												});
												setTranslationLanguage("");
												setIsCreatingTranslation(false);
												toast.success("Translation created");
											} catch (error) {
												toast.error("Failed to create translation", {
													description:
														error instanceof ConvexError
															? error.data
															: "Unexpected error occurred",
												});
											} finally {
												setIsCreatingTranslationLoading(false);
											}
										}}
									>
										{isCreatingTranslationLoading ? (
											<span className="flex gap-2 items-center">
												<Spinner size="xs" /> Creating...
											</span>
										) : (
											<span className="flex gap-2 items-center">
												<Plus className="size-3.5" /> Create
											</span>
										)}
									</Button>
								</div>
							)}

						{/* Translations list */}
						{translationMode !== "disabled" &&
							node.data.primaryLandingPageId &&
							(translations && translations.length > 0 ? (
								<div className="grid grid-cols-1 gap-2">
									{translations.map((t) => (
										<div
											key={t._id}
											onClick={() => {
												window.location.href = `/assets/landing-pages/${t._id}/edit`;
											}}
											onMouseEnter={() => handleABTestHover(t._id)}
											onMouseLeave={() => handleABTestHover(null)}
											className="flex justify-between items-center px-2 py-1.5 rounded-lg border cursor-pointer group hover:bg-muted/50 hover:border-muted-foreground/10"
										>
											<div className="flex flex-1 gap-3 items-center">
												<div className="p-2 rounded-md border bg-muted">
													<Languages className="w-4 h-4" />
												</div>
												<div className="flex-1 leading-tight text-left">
													<div className="text-sm font-medium leading-tight">
														{t.title}
													</div>
													<div className="text-xs leading-tight text-muted-foreground max-w-[100px] truncate">
														{t.description || "Translation variant"}
													</div>
												</div>
											</div>
											<div className="flex flex-shrink-0 gap-1 items-center">
												<Badge variant="outline" className="text-xs">
													{(t.language || "").toUpperCase()}
												</Badge>
												<ArrowRight className="w-0 h-0 text-muted-foreground opacity-0 transition-all duration-200 ease-out group-hover:w-3.5 group-hover:h-3.5 group-hover:opacity-100 group-hover:translate-x-1 group-hover:text-foreground" />
											</div>
										</div>
									))}
								</div>
							) : (
								<div className="flex flex-col justify-center items-center h-24 rounded-lg border bg-muted">
									<p className="text-sm text-muted-foreground">
										No translations yet
									</p>
									<Button
										size="sm"
										variant="outline"
										className="mt-2"
										onClick={() => setIsCreatingTranslation(true)}
										disabled={!node.data.primaryLandingPageId}
									>
										Create your first translation
									</Button>
								</div>
							))}
					</div>

					<Separator />
					{/* Priority Section */}
					<div className="space-y-2">
						<div className="flex justify-between items-center">
							<Label>Priority</Label>
							<Button
								size="sm"
								variant="ghost"
								onClick={handleNavigateToTrafficPanel}
								className="h-7 text-xs text-muted-foreground hover:text-foreground"
							>
								Edit
								<ArrowUpRight className="size-3" />
							</Button>
						</div>
						<div className="flex gap-2 items-center">
							<Badge variant="outline" className="bg-muted">
								Priority {node.data.priority}
							</Badge>
							<p className="text-xs text-muted-foreground">
								Segments are evaluated by priority order
							</p>
						</div>
					</div>

					<Separator />

					{/* AB Tests Section */}
					<div className="space-y-3">
						<div className="flex justify-between items-center">
							<div className="flex gap-2 items-center">
								<Label>A/B Tests</Label>
								<Badge variant="outline" className="text-xs bg-muted">
									{allABTests.length} total
									{hiddenTestsCount > 0 && (
										<span className="ml-1 text-muted-foreground">
											({hiddenTestsCount} hidden)
										</span>
									)}
								</Badge>
							</div>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="sm"
										variant="outline"
										onClick={handleCreateTest}
										className="h-7 text-xs"
										disabled={hasActiveABTest}
									>
										<Plus className="size-3" />
										Create Test
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>
										{hasActiveABTest
											? "Complete the active test to create a new one"
											: "Create a new A/B test for this segment"}
									</p>
								</TooltipContent>
							</Tooltip>
						</div>

						{allABTests.length > 0 ? (
							<div className="grid grid-cols-1 gap-2">
								{allABTests.map((abTest) => (
									<div
										key={abTest.id}
										onClick={() => handleABTestClick(abTest.id)}
										onMouseEnter={() => handleABTestHover(abTest.id)}
										onMouseLeave={() => handleABTestHover(null)}
										className="flex justify-between items-center px-2 py-1.5 rounded-lg border cursor-pointer group hover:bg-muted/50 hover:border-muted-foreground/10"
									>
										<div className="flex flex-1 gap-3 items-center">
											<div className="flex gap-2 items-center">
												<div className="p-2 rounded-md border bg-muted">
													<TestTube className="w-4 h-4" />
												</div>
												<div className="flex-1 leading-tight text-left">
													<div className="text-sm font-medium leading-tight">
														{abTest.data.title}
													</div>
													<div className="text-xs leading-tight text-muted-foreground max-w-[100px] truncate">
														{abTest.data.description}
													</div>
												</div>
											</div>
										</div>
										<div className="flex flex-shrink-0 gap-1 items-center">
											<Badge
												variant={getStatusBadgeVariant(abTest.data.status)}
												className="text-xs"
											>
												{abTest.data.status.charAt(0).toUpperCase() +
													abTest.data.status.slice(1)}
											</Badge>
											{abTest.data.status === "completed" && (
												<Tooltip>
													<TooltipTrigger asChild>
														<Button
															size="sm"
															variant="ghost"
															onClick={(e) => {
																e.stopPropagation();
																handleToggleABTestVisibility(abTest.id);
															}}
															className="px-2 h-6 text-xs text-muted-foreground hover:text-foreground"
														>
															{abTest.hidden ? (
																<EyeOff className="size-3" />
															) : (
																<Eye className="size-3" />
															)}
														</Button>
													</TooltipTrigger>
													<TooltipContent>
														<p>{abTest.hidden ? "Show" : "Hide"}</p>
													</TooltipContent>
												</Tooltip>
											)}
											{/* Arrow icon - placed inside the container to ensure proper layout */}
											<ArrowRight className="w-0 h-0 text-muted-foreground opacity-0 transition-all duration-200 ease-out group-hover:w-3.5 group-hover:h-3.5 group-hover:opacity-100 group-hover:translate-x-1 group-hover:text-foreground" />
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="flex flex-col justify-center items-center h-24 rounded-lg border bg-muted">
								<p className="text-sm text-muted-foreground">
									No A/B tests found
								</p>
								{!hasActiveABTest && (
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												size="sm"
												variant="outline"
												onClick={handleCreateTest}
												className="mt-2"
											>
												Create your first A/B test
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											<p>Create a new A/B test for this segment</p>
										</TooltipContent>
									</Tooltip>
								)}
								{hasActiveABTest && (
									<p className="mt-1 text-xs text-muted-foreground">
										Complete the active test to create a new one
									</p>
								)}
							</div>
						)}
					</div>

					<Separator />

					{/* Current Rules Section */}
					<div className="space-y-3">
						<div className="flex justify-between items-center">
							<div className="flex gap-2 items-center">
								<Label>Current Rules</Label>
								<Badge variant="outline" className="text-xs bg-muted">
									{rules.length} rules
									{customParameterCount > 1 && (
										<span className="ml-1 text-muted-foreground">
											({customParameterCount} custom)
										</span>
									)}
								</Badge>
							</div>
							<Button
								size="sm"
								variant="outline"
								onClick={() => setShowAddRules(true)}
								className="h-7 text-xs"
								disabled={!canAddMoreRules}
							>
								<Plus className="size-3" />
								Add Rule
							</Button>
						</div>

						{rules.length > 0 ? (
							<div className="grid grid-cols-1 gap-2">
								{rules.map((rule) => {
									const ruleTypeDefinition =
										RULE_TYPE_DEFINITIONS[rule.ruleType];
									return (
										<div
											key={rule.id}
											onClick={() => handleEditRule(rule)}
											className="flex gap-3 justify-between items-center p-2 w-full h-auto rounded-md border shadow-sm transition-colors cursor-pointer bg-muted text-card-foreground hover:bg-muted/50"
										>
											<div className="flex gap-3 items-center">
												<div className="p-2 rounded-md border bg-muted">
													{getRuleIcon(rule.ruleType)}
												</div>
												<div className="flex-1 leading-tight text-left">
													<div className="text-sm font-medium leading-tight">
														{rule.label}
													</div>
													<div className="text-xs leading-tight text-muted-foreground">
														{ruleTypeDefinition?.description ||
															`${rule.ruleType}: ${Array.isArray(rule.value) ? rule.value.join(", ") : String(rule.value)}`}
													</div>
												</div>
											</div>
											<div className="flex gap-1 items-center">
												<ArrowRight className="size-3.5 text-muted-foreground" />
											</div>
										</div>
									);
								})}
							</div>
						) : (
							<div className="flex flex-col justify-center items-center h-24 rounded-lg border bg-muted">
								<p className="text-sm text-muted-foreground">
									No rules configured yet
								</p>
								{canAddMoreRules ? (
									<Button
										size="sm"
										variant="outline"
										onClick={() => setShowAddRules(true)}
										className="mt-2"
									>
										Add your first rule
									</Button>
								) : (
									<p className="mt-1 text-xs text-muted-foreground">
										{usedRuleTypes >= totalRuleTypes
											? "All rule types are in use (except custom parameters)"
											: "All rule types are in use"}
									</p>
								)}
							</div>
						)}
					</div>

					<InfoBox variant="info" iconPlacement="top">
						<h4 className="font-medium text-primary">
							How segment rules work?
						</h4>
						<ol className="space-y-1 text-sm list-decimal list-inside text-muted-foreground">
							<li>
								Traffic matching <span className="font-semibold">ALL</span>{" "}
								rules will see this segment's landing page.
							</li>
							<li>
								Rules are evaluated using{" "}
								<span className="font-semibold">AND</span> logic (all must
								match).
							</li>
							<li>
								Only one instance of each rule type is allowed per segment
								(except custom parameters).
							</li>
							<li>Higher priority segments are checked first.</li>
							<li>
								Non-matching traffic continues to lower priority segments.
							</li>
						</ol>
					</InfoBox>
				</div>
			</div>

			{/* Add Rules Panel Overlay */}
			{showAddRules && (
				<div className="absolute inset-0 z-10 bg-background">
					<AddRulesPanel node={node} onBack={() => setShowAddRules(false)} />
				</div>
			)}

			{/* Edit Rule Panel Overlay */}
			{editingRule && (
				<div className="absolute inset-0 z-10 bg-background">
					<RuleConfigurationPanel
						node={node}
						ruleTypeId={editingRule.ruleType}
						existingRule={editingRule}
						onBack={() => setEditingRule(null)}
					/>
				</div>
			)}
		</div>
	);
};
