"use client";

import { CampaignNodeIcons } from "@/components/canvas/campaign/nodes/campaign/icons";
import { type Doc, api, useCachedQuery, useMutation } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import {
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	FileText,
	Info,
	Workflow,
} from "@firebuzz/ui/icons/lucide";
import { CAMPAIGN_GOALS } from "@firebuzz/utils";
import { useReactFlow } from "@xyflow/react";
import { useState } from "react";
import { DurationSlider } from "../value-selectors/duration-slider";
import { GoalSelector } from "../value-selectors/goal-selector";

interface CampaignOverviewPanelProps {
	campaign: Doc<"campaigns">;
	onNavigateToCustomGoals?: (editGoalId?: string) => void;
}

export const CampaignOverviewPanel = ({
	campaign,
	onNavigateToCustomGoals,
}: CampaignOverviewPanelProps) => {
	const { setNodes } = useReactFlow();
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [isEditingDescription, setIsEditingDescription] = useState(false);
	const [title, setTitle] = useState(campaign.title);
	const [description, setDescription] = useState(campaign.description || "");
	const [_hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

	// Get validation data from server
	const validation = useCachedQuery(
		api.collections.campaigns.validation.getCampaignValidation,
		{ campaignId: campaign._id },
	);

	// Provide defaults while loading
	const issuesBySeverity = validation?.issuesBySeverity || {
		errors: [],
		warnings: [],
		info: [],
	};

	const canPublish = validation?.canPublish || false;

	const updateCampaign = useMutation(
		api.collections.campaigns.mutations.update,
	);
	const updateCampaignSettings = useMutation(
		api.collections.campaigns.mutations.updateCampaignSettings,
	).withOptimisticUpdate((localStore, args) => {
		// Get the current campaign data
		const existingCampaign = localStore.getQuery(
			api.collections.campaigns.queries.getById,
			{ id: campaign._id },
		);

		if (existingCampaign) {
			// Update the campaign settings optimistically
			localStore.setQuery(
				api.collections.campaigns.queries.getById,
				{ id: campaign._id },
				{
					...existingCampaign,
					campaignSettings: {
						...existingCampaign.campaignSettings,
						...args.campaignSettings,
					},
				},
			);
		}
	});

	// Combine default goals with custom goals
	const availableGoals = [
		...CAMPAIGN_GOALS.map((goal) => ({ ...goal, isCustom: false })),
		...(campaign.campaignSettings?.customGoals || []),
	];

	const handleTitleSave = async () => {
		try {
			await updateCampaign({
				id: campaign._id,
				projectId: campaign.projectId,
				title: title.trim() || "Untitled Campaign",
			});
			setIsEditingTitle(false);
		} catch (error) {
			console.error("Failed to update campaign title:", error);
		}
	};

	const handleDescriptionSave = async () => {
		try {
			await updateCampaign({
				id: campaign._id,
				projectId: campaign.projectId,
				description: description.trim(),
			});
			setIsEditingDescription(false);
		} catch (error) {
			console.error("Failed to update campaign description:", error);
		}
	};

	const handleNodeClick = (nodeId: string) => {
		setNodes((nodes) =>
			nodes.map((node) => ({
				...node,
				selected: node.id === nodeId,
			})),
		);
	};

	const handleNodeHover = (nodeId: string | null) => {
		setHoveredNodeId(nodeId);
		// Apply hover effect to the actual canvas node
		setNodes((nodes) =>
			nodes.map((node) => ({
				...node,
				data: {
					...node.data,
					isHovered: node.id === nodeId,
				},
			})),
		);
	};

	const getNodeIcon = (nodeType: string) => {
		switch (nodeType) {
			case "traffic":
				return CampaignNodeIcons.traffic;
			case "segment":
				return CampaignNodeIcons.segment;
			case "ab-test":
				return CampaignNodeIcons["ab-test"];
			case "variant":
				return CampaignNodeIcons.variant;
			case "note":
				return CampaignNodeIcons.note;
			default:
				return <FileText className="!size-3" />;
		}
	};

	const getNodeTypeLabel = (nodeType: string) => {
		switch (nodeType) {
			case "traffic":
				return "Traffic";
			case "segment":
				return "Segment";
			case "ab-test":
				return "A/B Test";
			case "variant":
				return "Variant";
			case "note":
				return "Note";
			default:
				return "Unknown";
		}
	};

	// Campaign Settings Handlers
	const handleGoalChange = async (goal: (typeof availableGoals)[0]) => {
		try {
			await updateCampaignSettings({
				campaignId: campaign._id,
				campaignSettings: { primaryGoal: goal },
			});
		} catch (error) {
			console.error("Failed to update primary goal:", error);
		}
	};

	const handleGoalValueChange = async (value: number) => {
		if (campaign.campaignSettings?.primaryGoal) {
			try {
				const updatedGoal = { ...campaign.campaignSettings.primaryGoal, value };
				await updateCampaignSettings({
					campaignId: campaign._id,
					campaignSettings: { primaryGoal: updatedGoal },
				});
			} catch (error) {
				console.error("Failed to update goal value:", error);
			}
		}
	};

	const handleCurrencyChange = async (currency: string) => {
		if (campaign.campaignSettings?.primaryGoal) {
			try {
				const updatedGoal = {
					...campaign.campaignSettings.primaryGoal,
					currency,
				};
				await updateCampaignSettings({
					campaignId: campaign._id,
					campaignSettings: { primaryGoal: updatedGoal },
				});
			} catch (error) {
				console.error("Failed to update currency:", error);
			}
		}
	};

	const handleSessionDurationChange = async (duration: number) => {
		try {
			await updateCampaignSettings({
				campaignId: campaign._id,
				campaignSettings: { sessionDuration: duration },
			});
		} catch (error) {
			console.error("Failed to update session duration:", error);
		}
	};

	const handleAttributionPeriodChange = async (period: number) => {
		try {
			await updateCampaignSettings({
				campaignId: campaign._id,
				campaignSettings: { attributionPeriod: period },
			});
		} catch (error) {
			console.error("Failed to update attribution period:", error);
		}
	};

	return (
		<div className="flex flex-col h-full">
			{/* Header - Fixed */}
			<div className="flex flex-shrink-0 gap-3 items-center p-4 border-b bg-muted">
				<div className="p-2 rounded-lg border bg-brand/10 border-brand text-brand">
					<Workflow className="size-4" />
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
										setTitle(campaign.title);
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
								{title || "Untitled Campaign"}
							</div>
						)}
						{isEditingDescription ? (
							<Input
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								onBlur={handleDescriptionSave}
								onKeyDown={(e) => {
									if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
										handleDescriptionSave();
									} else if (e.key === "Escape") {
										setDescription(campaign.description || "");
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
								{description || "Add a description..."}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Content - Scrollable */}
			<div className="overflow-y-auto flex-1">
				{/* Campaign Settings */}
				<div className="p-4 space-y-4 border-b">
					<div>
						<h3 className="text-sm font-medium">Campaign Settings</h3>
						<p className="text-xs text-muted-foreground">
							Configure goals, tracking, and measurement settings
						</p>
					</div>

					<div className="space-y-4">
						{/* Primary Goal Selection */}
						<GoalSelector
							selectedGoal={campaign.campaignSettings?.primaryGoal}
							availableGoals={availableGoals}
							onGoalChange={handleGoalChange}
							onValueChange={handleGoalValueChange}
							onCurrencyChange={handleCurrencyChange}
							label="Primary Goal"
							onNavigateToCustomGoals={onNavigateToCustomGoals}
						/>

						<Separator />

						{/* Duration Settings */}
						<div className="space-y-4">
							<DurationSlider
								label="Session Duration"
								value={campaign.campaignSettings?.sessionDuration || 30}
								min={5}
								max={30}
								unit="minutes"
								description="How long a user session lasts for tracking purposes"
								onChange={handleSessionDurationChange}
							/>

							<DurationSlider
								label="Attribution Period"
								value={campaign.campaignSettings?.attributionPeriod || 30}
								min={1}
								max={30}
								unit="days"
								description="How long to track conversions after initial interaction"
								onChange={handleAttributionPeriodChange}
							/>
						</div>
					</div>
				</div>

				{/* Campaign Validation Checklist */}
				<div className="p-4 space-y-3">
					<div>
						<div className="flex justify-between items-center mb-1">
							<h3 className="text-sm font-medium">Node Validation</h3>
						</div>
						<p className="text-xs text-muted-foreground">
							{canPublish
								? "Your campaign is ready to publish!"
								: "Resolve all errors before publishing"}
						</p>
					</div>

					<div className="space-y-3">
						{/* Errors */}
						{issuesBySeverity.errors.length > 0 && (
							<div className="space-y-3">
								{issuesBySeverity.errors.map((result) => (
									<div
										key={result.nodeId}
										className="relative z-20 w-full rounded-lg border transition-all duration-200 cursor-pointer group hover:bg-muted"
										onClick={() => handleNodeClick(result.nodeId)}
										onMouseEnter={() => handleNodeHover(result.nodeId)}
										onMouseLeave={() => handleNodeHover(null)}
									>
										{/* Header */}
										<div className="flex gap-2 items-center px-3 py-2 rounded-t-lg border-b bg-background-subtle">
											<div className="p-1 rounded-lg border bg-muted">
												{getNodeIcon(result.nodeType)}
											</div>
											<span className="flex-1 text-sm font-medium">
												{result.nodeTitle}
											</span>
											<Badge variant="outline" className="text-xs">
												{getNodeTypeLabel(result.nodeType)}
											</Badge>
										</div>

										{/* Validation Messages */}
										<div className="px-3 py-2 space-y-1">
											{result.validations.map((validation) => (
												<div
													key={validation.id}
													className="flex gap-2 items-start"
												>
													<AlertCircle className="flex-shrink-0 text-destructive size-3 mt-0.5" />
													<span className="text-xs text-muted-foreground">
														{validation.message}
													</span>
												</div>
											))}
										</div>
									</div>
								))}
							</div>
						)}

						{/* Warnings */}
						{issuesBySeverity.warnings.length > 0 && (
							<div className="space-y-3">
								{issuesBySeverity.warnings.map((result) => (
									<div
										key={result.nodeId}
										className="relative z-20 w-full rounded-lg border transition-all duration-200 cursor-pointer group hover:bg-muted"
										onClick={() => handleNodeClick(result.nodeId)}
										onMouseEnter={() => handleNodeHover(result.nodeId)}
										onMouseLeave={() => handleNodeHover(null)}
									>
										{/* Header */}
										<div className="flex gap-2 items-center px-3 py-2 rounded-t-lg border-b">
											<div className="p-1 rounded-lg border bg-muted">
												{getNodeIcon(result.nodeType)}
											</div>
											<span className="flex-1 text-sm font-medium">
												{result.nodeTitle}
											</span>
											<Badge variant="outline" className="text-xs">
												{getNodeTypeLabel(result.nodeType)}
											</Badge>
										</div>

										{/* Validation Messages */}
										<div className="px-3 py-2 space-y-1">
											{result.validations.map((validation) => (
												<div
													key={validation.id}
													className="flex gap-2 items-start"
												>
													<AlertTriangle className="flex-shrink-0 text-amber-600 size-3 mt-0.5" />
													<span className="text-xs text-muted-foreground">
														{validation.message}
													</span>
												</div>
											))}
										</div>
									</div>
								))}
							</div>
						)}

						{/* Info/Tips */}
						{issuesBySeverity.info.length > 0 && (
							<div className="space-y-3">
								{issuesBySeverity.info.map((result) => (
									<div
										key={result.nodeId}
										className="relative z-20 w-full rounded-lg border transition-all duration-200 cursor-pointer group hover:bg-muted"
										onClick={() => handleNodeClick(result.nodeId)}
										onMouseEnter={() => handleNodeHover(result.nodeId)}
										onMouseLeave={() => handleNodeHover(null)}
									>
										{/* Header */}
										<div className="flex gap-2 items-center px-3 py-2 rounded-t-lg border-b">
											<div className="p-1 rounded-lg border bg-muted">
												{getNodeIcon(result.nodeType)}
											</div>
											<span className="flex-1 text-sm font-medium">
												{result.nodeTitle}
											</span>
											<Badge variant="outline" className="text-xs">
												{getNodeTypeLabel(result.nodeType)}
											</Badge>
										</div>

										{/* Validation Messages */}
										<div className="px-3 py-2 space-y-1">
											{result.validations.map((validation) => (
												<div
													key={validation.id}
													className="flex gap-2 items-start"
												>
													<Info className="flex-shrink-0 text-blue-600 size-3 mt-0.5" />
													<span className="text-xs text-muted-foreground">
														{validation.message}
													</span>
												</div>
											))}
										</div>
									</div>
								))}
							</div>
						)}

						{/* All Good State */}
						{issuesBySeverity.errors.length === 0 &&
							issuesBySeverity.warnings.length === 0 &&
							issuesBySeverity.info.length === 0 && (
								<div className="flex flex-col gap-3 items-center py-8 text-center rounded-md border text-muted-foreground bg-muted">
									<div className="p-2 text-emerald-600 rounded-md border bg-muted">
										<CheckCircle2 className="size-6" />
									</div>

									<div>
										{" "}
										<p className="text-sm font-medium text-primary">
											All validations passed!
										</p>
										<p className="text-xs text-muted-foreground">
											Your campaign is ready to publish
										</p>
									</div>
								</div>
							)}
					</div>
				</div>
			</div>
		</div>
	);
};
