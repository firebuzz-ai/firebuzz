"use client";

import { TrafficDistributionSlider } from "@/app/(workspace)/(dashboard)/campaigns/[id]/edit/_components/panel/value-selectors/traffic-distribution-slider";
import type {
	ABTestNode,
	VariantNode,
} from "@/components/canvas/campaign/nodes/campaign/types";
import type { Doc } from "@firebuzz/convex";
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
import { Slider } from "@firebuzz/ui/components/ui/slider";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
	ArrowRight,
	Crown,
	Pause,
	Play,
	Plus,
	Square,
	TestTube,
	Trash2,
} from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { CAMPAIGN_GOALS } from "@firebuzz/utils";
import { useNodes, useReactFlow } from "@xyflow/react";
import { nanoid } from "nanoid";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { PrimaryGoalSelector } from "../value-selectors/primary-goal-selector";

interface ABTestPanelProps {
	node: ABTestNode;
	campaign?: Doc<"campaigns">;
	onNavigateToCampaignOverview?: () => void;
}

interface TestStatusControlProps {
	status: "draft" | "running" | "completed" | "paused";
	onStatusChange: (action: string) => void;
}

const TestStatusControl = ({
	status,
	onStatusChange,
}: TestStatusControlProps) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
	const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({
		width: 0,
		left: 0,
		opacity: 0,
	});

	const controls = [
		{
			id: "draft",
			label: "Draft",
			icon: TestTube,
			action: "draft",
			color: "bg-primary",
			disabled: status === "draft",
		},
		{
			id: "running",
			label: "Running",
			icon: Play,
			action: "start",
			color: "bg-blue-500",
			disabled: status === "running",
		},
		{
			id: "paused",
			label: "Paused",
			icon: Pause,
			action: "pause",
			color: "bg-gray-600",
			disabled: status === "paused",
		},
		{
			id: "completed",
			label: "Completed",
			icon: Square,
			action: "finish",
			color: "bg-emerald-600",
			disabled: status === "completed",
		},
	];

	const activeIndex = controls.findIndex((control) => control.id === status);

	useLayoutEffect(() => {
		const updateIndicatorPosition = () => {
			if (
				activeIndex >= 0 &&
				buttonsRef.current[activeIndex] &&
				containerRef.current
			) {
				const activeButton = buttonsRef.current[activeIndex];
				const containerRect = containerRef.current.getBoundingClientRect();
				const buttonRect = activeButton.getBoundingClientRect();

				if (buttonRect.width > 0 && containerRect.width > 0) {
					// Use the button's position
					const relativeLeft = buttonRect.left - containerRect.left;

					// Small inset for visual appeal
					const horizontalInset = 2;

					// Set specific height based on button height with padding
					const indicatorHeight = buttonRect.height - 4;

					setIndicatorStyle({
						width: buttonRect.width - horizontalInset * 2,
						left: relativeLeft + horizontalInset,
						// Use CSS centering trick for perfect vertical alignment
						top: 0,
						bottom: 0,
						height: indicatorHeight,
						margin: "auto 0",
						opacity: 1,
						transform: "translateX(0)",
					});
				}
			}
		};

		// Handle resize events
		const handleResize = () => {
			updateIndicatorPosition();
		};

		// Try positioning multiple times for animation timing
		const timeouts: ReturnType<typeof setTimeout>[] = [];
		updateIndicatorPosition();

		for (const delay of [0, 50, 100]) {
			const timeout = setTimeout(updateIndicatorPosition, delay);
			timeouts.push(timeout);
		}

		// Add resize observer
		const resizeObserver = new ResizeObserver(handleResize);
		if (containerRef.current) {
			resizeObserver.observe(containerRef.current);
		}

		// Add window resize listener as fallback
		window.addEventListener("resize", handleResize);

		return () => {
			for (const timeout of timeouts) {
				clearTimeout(timeout);
			}
			resizeObserver.disconnect();
			window.removeEventListener("resize", handleResize);
		};
	}, [activeIndex]);

	const getIndicatorColor = () => {
		const activeControl = controls[activeIndex];
		return activeControl ? activeControl.color : "bg-gray-500";
	};

	return (
		<div className="relative w-full">
			<div
				ref={containerRef}
				className="flex relative overflow-hidden w-full p-1.5 rounded-lg border bg-muted/50"
			>
				{controls.map((control, index) => (
					<button
						type="button"
						key={control.id}
						ref={(el) => {
							buttonsRef.current[index] = el;
						}}
						onClick={() => !control.disabled && onStatusChange(control.action)}
						disabled={control.disabled}
						className={cn(
							"relative z-10 flex flex-1 justify-center items-center px-2.5 py-1.5 text-xs font-medium transition-colors rounded",
							status === control.id
								? control.id === "draft"
									? "text-primary-foreground"
									: "text-white"
								: "text-muted-foreground hover:text-foreground",
							control.disabled &&
								status !== control.id &&
								"opacity-50 cursor-not-allowed",
						)}
					>
						<span>{control.label}</span>
					</button>
				))}
				{/* Animated indicator */}
				<div
					className={cn(
						"absolute rounded-md transition-all duration-300 ease-out",
						getIndicatorColor(),
					)}
					style={indicatorStyle}
				/>
			</div>
		</div>
	);
};

export const ABTestPanel = ({
	node,
	campaign,
	onNavigateToCampaignOverview,
}: ABTestPanelProps) => {
	const { updateNodeData, addNodes, addEdges, setNodes, setEdges } =
		useReactFlow();
	const nodes = useNodes();
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [isEditingDescription, setIsEditingDescription] = useState(false);
	const [title, setTitle] = useState(node.data.title);
	const [description, setDescription] = useState(node.data.description || "");

	// Combine default goals with custom goals
	const availableGoals = [
		...CAMPAIGN_GOALS.map((goal) => ({ ...goal, isCustom: false })),
		...(campaign?.campaignSettings?.customGoals || []),
	];

	// Get variant nodes that are connected to this A/B test node, sorted by variantIndex
	const variantNodes = useMemo(() => {
		return nodes
			.filter((n) => n.type === "variant" && n.parentId === node.id)
			.sort((a, b) => {
				const aIndex = (a.data as VariantNode["data"]).variantIndex || 0;
				const bIndex = (b.data as VariantNode["data"]).variantIndex || 0;
				return aIndex - bIndex;
			}) as VariantNode[];
	}, [nodes, node.id]);

	const updateABTestData = (updates: Partial<typeof node.data>) => {
		updateNodeData(node.id, updates);
	};

	const handleTitleSave = () => {
		updateABTestData({ title: title.trim() || "A/B Test" });
		setIsEditingTitle(false);
	};

	const handleDescriptionSave = () => {
		updateABTestData({ description: description.trim() });
		setIsEditingDescription(false);
	};

	const updateCompletionCriteria = (
		criteria: Partial<typeof node.data.completionCriteria>,
	) => {
		updateABTestData({
			completionCriteria: {
				...(node.data.completionCriteria || {}),
				...criteria,
			},
		});
	};

	const updateRules = (rules: Partial<typeof node.data.rules>) => {
		updateABTestData({
			rules: { ...node.data.rules, ...rules },
		});
	};

	const addVariant = () => {
		const variantCount = variantNodes.length;

		// Check variant limit
		if (variantCount >= 5) return;

		const newNodeId = `variant-${nanoid(8)}`;

		// Grid configuration (same as in abtest-node.tsx)
		const gridConfig = {
			columns: 2,
			spacing: { horizontal: 550, vertical: 250 },
			initialOffset: { x: -275, y: 250 },
		};

		const newNodeIndex = variantCount;
		const rowIndex = Math.floor(newNodeIndex / gridConfig.columns);
		const colIndex = newNodeIndex % gridConfig.columns;

		// Calculate equal traffic percentage
		const equalPercentage = Math.floor(100 / (variantCount + 1));
		const remainder = 100 - equalPercentage * (variantCount + 1);

		const newVariantNode = {
			id: newNodeId,
			type: "variant" as const,
			parentId: node.id,
			position: {
				x:
					node.position.x +
					gridConfig.initialOffset.x +
					colIndex * gridConfig.spacing.horizontal,
				y:
					node.position.y +
					gridConfig.initialOffset.y +
					rowIndex * gridConfig.spacing.vertical,
			},
			data: {
				title: variantCount === 0 ? "Control" : `Variant ${variantCount}`,
				description: variantCount === 0 ? "Original version" : "Test variant",
				variantId: null,
				trafficPercentage:
					equalPercentage + (newNodeIndex === 0 ? remainder : 0),
				translations: [],
				isControl: variantCount === 0, // First variant is control
				variantIndex: variantCount, // Add required variantIndex field
			},
		};

		// Add the new variant node
		addNodes(newVariantNode);

		// Create edge connecting A/B test to variant
		const newEdge = {
			id: `${node.id}-${newNodeId}`,
			source: node.id,
			target: newNodeId,
			type: "traffic-weight",
			animated: true,
			data: {
				trafficPercentage:
					equalPercentage + (newNodeIndex === 0 ? remainder : 0),
			},
		};

		addEdges(newEdge);

		// Update existing variants with new traffic percentages
		setNodes((nodes) =>
			nodes.map((n) => {
				// Update existing variant nodes
				if (
					n.type === "variant" &&
					n.parentId === node.id &&
					n.id !== newNodeId
				) {
					const variantIdx = variantNodes.findIndex((v) => v.id === n.id);
					if (variantIdx !== -1) {
						return {
							...n,
							data: {
								...n.data,
								trafficPercentage:
									equalPercentage + (variantIdx === 0 ? remainder : 0),
							},
						};
					}
				}
				// Select only the new node
				return {
					...n,
					selected: n.id === newNodeId,
					data: { ...n.data, isHovered: false },
				};
			}),
		);

		// Update existing edges with new traffic percentages
		setEdges((edges) =>
			edges.map((edge) => {
				if (edge.source === node.id && edge.target !== newNodeId) {
					const targetVariant = variantNodes.find((v) => v.id === edge.target);
					if (targetVariant) {
						const variantIdx = variantNodes.findIndex(
							(v) => v.id === edge.target,
						);
						return {
							...edge,
							data: {
								...edge.data,
								trafficPercentage:
									equalPercentage + (variantIdx === 0 ? remainder : 0),
							},
						};
					}
				}
				return edge;
			}),
		);
	};

	const updateVariant = (
		variantId: string,
		updates: Partial<VariantNode["data"]>,
	) => {
		setNodes((nodes) =>
			nodes.map((n) =>
				n.id === variantId && n.type === "variant"
					? { ...n, data: { ...n.data, ...updates } }
					: n,
			),
		);
	};

	const removeVariant = (variantId: string) => {
		// Get remaining variants before removal
		const remainingVariants = variantNodes.filter((v) => v.id !== variantId);

		if (remainingVariants.length === 0) return;

		// Calculate new weights for remaining variants
		const equalPercentage = Math.floor(100 / remainingVariants.length);
		const remainder = 100 - equalPercentage * remainingVariants.length;

		// Remove the variant node and its edges, then redistribute weights
		setNodes((nodes) => {
			const filteredNodes = nodes.filter((n) => n.id !== variantId);
			return filteredNodes.map((n) => {
				const remainingIndex = remainingVariants.findIndex(
					(rv) => rv.id === n.id,
				);
				if (
					remainingIndex !== -1 &&
					n.type === "variant" &&
					n.parentId === node.id
				) {
					return {
						...n,
						data: {
							...n.data,
							trafficPercentage:
								equalPercentage + (remainingIndex === 0 ? remainder : 0),
						},
					};
				}
				return n;
			});
		});

		// Update corresponding edges
		setEdges((edges) => {
			const filteredEdges = edges.filter((e) => e.target !== variantId);
			return filteredEdges.map((edge) => {
				const remainingIndex = remainingVariants.findIndex(
					(rv) => rv.id === edge.target,
				);
				if (remainingIndex !== -1 && edge.source === node.id) {
					return {
						...edge,
						data: {
							...edge.data,
							trafficPercentage:
								equalPercentage + (remainingIndex === 0 ? remainder : 0),
						},
					};
				}
				return edge;
			});
		});
	};

	// Helper functions for letter-based variant system
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

	const handleVariantHover = (variantId: string | null) => {
		// Apply hover effect to the actual canvas node
		setNodes((nodes) =>
			nodes.map((node) => ({
				...node,
				data: {
					...node.data,
					isHovered: node.id === variantId,
				},
			})),
		);
	};

	const handleVariantClick = (variantId: string) => {
		// Select the variant node and clear all external hover states
		setNodes((nodes) =>
			nodes.map((n) => ({
				...n,
				selected: n.id === variantId,
				data: {
					...n.data,
					isHovered: false, // Clear external hover state for all nodes
				},
			})),
		);
	};

	const promoteVariant = (variantId: string) => {
		const currentVariant = variantNodes.find((v) => v.id === variantId);
		if (!currentVariant || currentVariant.data.variantIndex === 0) return;

		const currentIndex = currentVariant.data.variantIndex;
		const targetIndex = currentIndex - 1;
		const targetVariant = variantNodes.find(
			(v) => v.data.variantIndex === targetIndex,
		);

		if (targetVariant) {
			// Swap indices
			updateVariant(currentVariant.id, { variantIndex: targetIndex });
			updateVariant(targetVariant.id, { variantIndex: currentIndex });
		}
	};

	const makeControl = (variantId: string) => {
		const currentVariant = variantNodes.find((v) => v.id === variantId);
		if (!currentVariant || currentVariant.data.isControl) return;

		const currentControlVariant = variantNodes.find((v) => v.data.isControl);

		// Create a reordering plan
		const reorderedVariants = [...variantNodes].sort((a, b) => {
			const aIndex = a.data.variantIndex || 0;
			const bIndex = b.data.variantIndex || 0;
			return aIndex - bIndex;
		});

		// Build the new indices mapping
		const indexUpdates: Array<{
			variantId: string;
			newIndex: number;
			isControl: boolean;
		}> = [];

		// The new control gets index 0
		indexUpdates.push({ variantId, newIndex: 0, isControl: true });

		// All other variants shift up by 1 index
		let nextIndex = 1;
		for (const variant of reorderedVariants) {
			if (variant.id === variantId) continue; // Skip the new control

			if (variant.data.isControl && currentControlVariant) {
				// Old control becomes a regular variant
				indexUpdates.push({
					variantId: variant.id,
					newIndex: nextIndex,
					isControl: false,
				});
			} else {
				// Regular variants maintain their relative order but shift indices
				indexUpdates.push({
					variantId: variant.id,
					newIndex: nextIndex,
					isControl: false,
				});
			}
			nextIndex++;
		}

		// Apply all updates at once
		setNodes((nodes) =>
			nodes.map((n) => {
				const update = indexUpdates.find((u) => u.variantId === n.id);
				if (update && n.type === "variant" && n.parentId === node.id) {
					return {
						...n,
						data: {
							...n.data,
							isControl: update.isControl,
							variantIndex: update.newIndex,
						},
					};
				}
				return n;
			}),
		);
	};

	const handleTestAction = (action: string) => {
		switch (action) {
			case "draft":
				updateABTestData({ status: "draft" });
				break;
			case "start":
				updateABTestData({ status: "running" });
				break;
			case "pause":
				updateABTestData({ status: "paused" });
				break;
			case "finish":
				updateABTestData({ status: "completed", isCompleted: true });
				break;
		}
	};

	// Goal handlers
	const getCurrentGoal = () => {
		if (
			node.data.primaryMetric &&
			typeof node.data.primaryMetric === "object"
		) {
			return node.data.primaryMetric;
		}
		// Find goal by string value for backward compatibility
		return (
			availableGoals.find((goal) => goal.id === node.data.primaryMetric) ||
			availableGoals[0]
		);
	};

	const handleGoalChange = (goal: (typeof availableGoals)[0]) => {
		// Store the goal ID as a string for compatibility with the schema
		updateABTestData({ primaryMetric: goal.id });
	};

	const handleNavigateToCampaignOverview = () => {
		// Deselect all nodes to show campaign overview
		setNodes((nodes) =>
			nodes.map((n) => ({
				...n,
				selected: false,
				data: { ...n.data, isHovered: false },
			})),
		);

		// Navigate to campaign overview
		if (onNavigateToCampaignOverview) {
			onNavigateToCampaignOverview();
		}
	};

	return (
		<div className="flex relative flex-col h-full">
			{/* Header - Fixed */}
			<div className="flex flex-shrink-0 gap-3 items-center p-4 border-b bg-muted">
				<div className="p-2 rounded-lg border bg-brand/10 border-brand text-brand">
					<TestTube className="size-4" />
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
								{title || "A/B Test"}
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
									"Configure test parameters, variants, and success metrics"}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Content - Scrollable */}
			<div className="overflow-y-auto flex-1">
				<div className="p-4 space-y-4">
					{/* Test Controls */}
					<div className="space-y-3">
						<Label>Test Controls</Label>
						<TestStatusControl
							status={node.data.status || "draft"}
							onStatusChange={handleTestAction}
						/>
					</div>

					<Separator />

					{/* Variants Section */}
					<div className="space-y-3">
						<div className="flex justify-between items-center">
							<div className="flex gap-2 items-center">
								<Label>Variants</Label>
								<Badge variant="outline" className="text-xs bg-muted">
									{variantNodes.length} variants
								</Badge>
							</div>
							<Tooltip>
								<TooltipTrigger asChild>
									<span>
										<Button
											size="sm"
											variant="outline"
											onClick={addVariant}
											disabled={variantNodes.length >= 5}
											className="h-7 text-xs"
										>
											<Plus className="mr-1 size-3" />
											Add Variant
										</Button>
									</span>
								</TooltipTrigger>
								{variantNodes.length >= 5 && (
									<TooltipContent>
										<p>Maximum 5 variants allowed</p>
									</TooltipContent>
								)}
							</Tooltip>
						</div>

						{variantNodes.length > 0 ? (
							<div className="space-y-2">
								{variantNodes.map((variant, index) => {
									const variantLetter = getVariantLetter(
										variant.data.variantIndex || index,
									);
									return (
										<div
											key={variant.id}
											onClick={() => handleVariantClick(variant.id)}
											onMouseEnter={() => handleVariantHover(variant.id)}
											onMouseLeave={() => handleVariantHover(null)}
											className="flex justify-between items-center px-2 py-1.5 rounded-lg border cursor-pointer group hover:bg-muted/50 hover:border-muted-foreground/10"
										>
											<div className="flex flex-1 gap-3 items-center">
												<div className="flex gap-2 items-center">
													{/* Letter-based icon */}
													<div
														className={cn(
															"flex justify-center items-center w-6 h-6 text-xs font-bold rounded-md",
															getVariantColor(
																variant.data.variantIndex || index,
																variant.data.isControl || false,
															),
														)}
													>
														{variantLetter}
													</div>
													<div className="flex flex-col">
														<div className="flex gap-2 items-center">
															<span className="text-sm font-medium leading-tight">
																{variant.data.title}
															</span>
															{variant.data.isControl && (
																<Badge
																	variant="outline"
																	className="text-xs"
																	onClick={(e) => e.stopPropagation()}
																>
																	Control
																</Badge>
															)}
														</div>
														<div className="text-xs leading-tight text-muted-foreground">
															{variant.data.variantId
																? "Landing page assigned"
																: "No landing page"}{" "}
															• {variant.data.trafficPercentage || 0}% traffic
														</div>
													</div>
												</div>
											</div>
											<div
												className="flex flex-shrink-0 gap-1 items-center"
												onClick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													return false;
												}}
												onMouseDown={(e) => {
													e.preventDefault();
													e.stopPropagation();
													return false;
												}}
												onMouseUp={(e) => {
													e.preventDefault();
													e.stopPropagation();
													return false;
												}}
												onPointerDown={(e) => {
													e.preventDefault();
													e.stopPropagation();
													return false;
												}}
											>
												{/* Promote button */}
												{variant.data.variantIndex > 0 && (
													<Tooltip>
														<TooltipTrigger asChild>
															<Button
																size="iconSm"
																variant="ghost"
																onClick={(e) => {
																	e.preventDefault();
																	e.stopPropagation();
																	promoteVariant(variant.id);
																}}
																onMouseDown={(e) => {
																	e.preventDefault();
																	e.stopPropagation();
																}}
																className="opacity-0 group-hover:opacity-100 !px-1 !py-1 !h-auto"
															>
																<ArrowRight className="size-3 text-muted-foreground rotate-[-90deg]" />
															</Button>
														</TooltipTrigger>
														<TooltipContent>
															<p>Promote</p>
														</TooltipContent>
													</Tooltip>
												)}

												{/* Make control button */}
												{!variant.data.isControl && (
													<Tooltip>
														<TooltipTrigger asChild>
															<Button
																size="iconSm"
																variant="ghost"
																onClick={(e) => {
																	e.preventDefault();
																	e.stopPropagation();
																	makeControl(variant.id);
																}}
																onMouseDown={(e) => {
																	e.preventDefault();
																	e.stopPropagation();
																}}
																className="opacity-0 group-hover:opacity-100 !px-1 !py-1 !h-auto"
															>
																<Crown className="size-3 text-muted-foreground hover:text-yellow-500" />
															</Button>
														</TooltipTrigger>
														<TooltipContent>
															<p>Make Control</p>
														</TooltipContent>
													</Tooltip>
												)}

												{/* Delete button */}
												<Tooltip>
													<TooltipTrigger asChild>
														<Button
															size="iconSm"
															variant="ghost"
															onClick={(e) => {
																e.preventDefault();
																e.stopPropagation();
																removeVariant(variant.id);
															}}
															onMouseDown={(e) => {
																e.preventDefault();
																e.stopPropagation();
															}}
															disabled={
																variantNodes.length <= 2 ||
																variant.data.isControl
															}
															className="opacity-0 group-hover:opacity-100 !px-1 !py-1 !h-auto"
														>
															<Trash2 className="size-3 text-muted-foreground" />
														</Button>
													</TooltipTrigger>
													<TooltipContent>
														<p>
															{variant.data.isControl
																? "Cannot delete control variant"
																: variantNodes.length <= 2
																	? "Minimum 2 variants required"
																	: "Delete"}
														</p>
													</TooltipContent>
												</Tooltip>

												{/* Arrow icon */}
												<ArrowRight className="w-0 h-0 text-muted-foreground opacity-0 transition-all duration-200 ease-out group-hover:w-3.5 group-hover:h-3.5 group-hover:opacity-100 group-hover:translate-x-1 group-hover:text-foreground" />
											</div>
										</div>
									);
								})}
							</div>
						) : (
							<div className="flex flex-col justify-center items-center h-24 rounded-lg border bg-muted">
								<p className="text-sm text-muted-foreground">
									No variants added yet
								</p>
								<Button
									size="sm"
									variant="outline"
									onClick={addVariant}
									className="mt-2"
								>
									Add your first variant
								</Button>
							</div>
						)}
					</div>

					{/* Traffic Distribution */}
					{variantNodes.length > 0 && (
						<>
							{/*   <Separator /> */}
							<div className="pt-4 space-y-4">
								<TrafficDistributionSlider
									variants={variantNodes.map((variant, index) => ({
										id: variant.id,
										title: variant.data.title,
										percentage: variant.data.trafficPercentage || 0,
										color: getVariantColor(
											variant.data.variantIndex || index,
											variant.data.isControl || false,
										),
										isControl: variant.data.isControl,
										variantIndex: variant.data.variantIndex || index,
									}))}
									onDistributionChange={(distributions) => {
										// Update nodes
										setNodes((nodes) =>
											nodes.map((n) => {
												const distribution = distributions.find(
													(d) => d.variantId === n.id,
												);
												if (
													distribution &&
													n.type === "variant" &&
													n.parentId === node.id
												) {
													return {
														...n,
														data: {
															...n.data,
															trafficPercentage: distribution.percentage,
														},
													};
												}
												return n;
											}),
										);

										// Update corresponding edges
										setEdges((edges) =>
											edges.map((edge) => {
												const distribution = distributions.find(
													(d) => d.variantId === edge.target,
												);
												if (distribution && edge.source === node.id) {
													return {
														...edge,
														data: {
															...edge.data,
															trafficPercentage: distribution.percentage,
														},
													};
												}
												return edge;
											}),
										);
									}}
								/>
							</div>
						</>
					)}

					<Separator />

					{/* Test Settings */}
					<div className="space-y-4">
						<Label>Test Settings</Label>

						{/* Pooling Percentage Slider */}
						<div className="p-4 space-y-3 rounded-lg bg-muted">
							<div className="flex justify-between items-center">
								<span className="text-sm font-medium">Traffic Allocation</span>
								<Badge variant="outline">
									{node.data.poolingPercent || 20}%
								</Badge>
							</div>
							<Slider
								variant="secondary"
								value={[node.data.poolingPercent || 20]}
								onValueChange={(values) => {
									const clampedValue = Math.max(1, Math.min(100, values[0]));
									updateABTestData({ poolingPercent: clampedValue });

									// Update the incoming edge data
									setEdges((edges) =>
										edges.map((edge) => {
											if (
												edge.target === node.id &&
												edge.type === "traffic-weight"
											) {
												return {
													...edge,
													data: {
														...edge.data,
														trafficPercentage: clampedValue,
													},
												};
											}
											return edge;
										}),
									);
								}}
								min={1}
								max={100}
								step={1}
								className="h-2"
							/>
							<p className="text-xs text-muted-foreground">
								This test receives {node.data.poolingPercent || 20}% of the
								segment traffic
							</p>
						</div>

						{/* Primary Goal Selection */}
						{campaign && availableGoals.length > 0 ? (
							<div className="space-y-4">
								<PrimaryGoalSelector
									selectedGoal={getCurrentGoal()}
									availableGoals={availableGoals}
									onGoalChange={handleGoalChange}
									label="Primary Goal"
									onNavigateToCampaignOverview={
										handleNavigateToCampaignOverview
									}
								/>
							</div>
						) : (
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="primary-metric">Primary Metric</Label>
									<Select
										value={
											typeof node.data.primaryMetric === "string"
												? node.data.primaryMetric
												: "conversions"
										}
										onValueChange={(value) =>
											updateABTestData({ primaryMetric: value })
										}
									>
										<SelectTrigger id="primary-metric" className="h-8">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="conversions">Conversions</SelectItem>
											<SelectItem value="clicks">Clicks</SelectItem>
											<SelectItem value="revenue">Revenue</SelectItem>
											<SelectItem value="custom">Custom Metric</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<Label htmlFor="confidence-level">Confidence Level</Label>
									<Select
										value={node.data.confidenceLevel.toString()}
										onValueChange={(value) =>
											updateABTestData({
												confidenceLevel: Number.parseInt(value) as 90 | 95 | 99,
											})
										}
									>
										<SelectTrigger id="confidence-level" className="h-8">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="90">90%</SelectItem>
											<SelectItem value="95">95%</SelectItem>
											<SelectItem value="99">99%</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						)}

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="sample-size">Sample Size per Variant</Label>
								<Input
									id="sample-size"
									type="number"
									value={
										node.data.completionCriteria?.sampleSizePerVariant || ""
									}
									onChange={(e) =>
										updateCompletionCriteria({
											sampleSizePerVariant:
												Number.parseInt(e.target.value) || undefined,
										})
									}
									placeholder="e.g. 1000"
									className="h-8"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="test-duration">Duration (days)</Label>
								<Input
									id="test-duration"
									type="number"
									value={node.data.completionCriteria?.testDuration || ""}
									onChange={(e) =>
										updateCompletionCriteria({
											testDuration:
												Number.parseInt(e.target.value) || undefined,
										})
									}
									placeholder="e.g. 14"
									className="h-8"
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="winning-strategy">Winning Strategy</Label>
							<Select
								value={node.data.rules.winningStrategy}
								onValueChange={(value) =>
									updateRules({
										winningStrategy: value as "winner" | "winnerOrControl",
									})
								}
							>
								<SelectTrigger id="winning-strategy" className="h-8">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="winner">Winner only</SelectItem>
									<SelectItem value="winnerOrControl">
										Winner or Control
									</SelectItem>
								</SelectContent>
							</Select>
							<p className="text-xs text-muted-foreground">
								{node.data.rules.winningStrategy === "winner"
									? "Only declare a winner if it significantly beats all other variants"
									: "Declare a winner if it beats control, even if other variants perform similarly"}
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="hypothesis">Hypothesis</Label>
							<Textarea
								id="hypothesis"
								value={node.data.hypothesis}
								onChange={(e) =>
									updateABTestData({ hypothesis: e.target.value })
								}
								placeholder="Describe what you expect to happen and why"
								rows={3}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
