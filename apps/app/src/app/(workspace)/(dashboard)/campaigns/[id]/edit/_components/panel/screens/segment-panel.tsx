"use client";

import type {
	RuleTypeId,
	SegmentNode,
	SegmentRule,
} from "@/components/canvas/campaign/nodes/campaign/types";
import { type Doc, api, useCachedQuery } from "@firebuzz/convex";
import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
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
import {
	ArrowRight,
	ArrowUpRight,
	Plus,
	Split,
} from "@firebuzz/ui/icons/lucide";
import { useNodes, useReactFlow } from "@xyflow/react";
import { useMemo, useState } from "react";
import { RULE_TYPE_DEFINITIONS } from "../helpers/rule-types";
import { AddRulesPanel } from "./add-rules-panel";
import { RuleConfigurationPanel } from "./rule-configuration-panel";

interface SegmentPanelProps {
	node: SegmentNode;
	campaign?: Doc<"campaigns">;
}

export const SegmentPanel = ({ node, campaign }: SegmentPanelProps) => {
	const { updateNodeData, setNodes } = useReactFlow();
	const nodes = useNodes();
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [isEditingDescription, setIsEditingDescription] = useState(false);
	const [title, setTitle] = useState(node.data.title);
	const [description, setDescription] = useState(node.data.description || "");
	const [showAddRules, setShowAddRules] = useState(false);
	const [editingRule, setEditingRule] = useState<SegmentRule | null>(null);

	// Fetch landing pages for the campaign
	const landingPages = useCachedQuery(
		api.collections.landingPages.queries.getByCampaignId,
		campaign
			? {
					campaignId: campaign._id,
				}
			: "skip",
	);

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
		updateSegmentData({
			primaryLandingPageId: landingPageId,
			validations: node.data.validations.map((v) =>
				v.message.includes("default landing page")
					? { ...v, isValid: !!landingPageId }
					: v,
			),
		});
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
										<SelectValue placeholder="Select default landing page" />
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
							</>
						) : (
							<div className="flex flex-col justify-center items-center h-32 rounded-lg border bg-muted">
								<p className="text-sm text-muted-foreground">
									No landing pages found
								</p>
								<Button size="sm" variant="outline" className="mt-2">
									Create your first landing page
								</Button>
							</div>
						)}
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
								Edit in Traffic Panel
								<ArrowUpRight className="ml-1 size-3" />
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
								<Plus className="mr-1 size-3" />
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
