"use client";

import { type Doc, api, useMutation } from "@firebuzz/convex";
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
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import {
	ArrowDown,
	ArrowLeft,
	ArrowUp,
	GoalIcon,
	MousePointerClick,
} from "@firebuzz/ui/icons/lucide";
import { nanoid } from "nanoid";
import { useEffect, useState } from "react";

type Goal = {
	id: string;
	title: string;
	description?: string;
	direction: "up" | "down";
	placement: "internal" | "external";
	value: number;
	currency?: string;
	type: "conversion" | "engagement";
	isCustom: boolean;
};

interface CustomGoalsPanelProps {
	campaign: Doc<"campaigns">;
	onBackToCampaignOverview: () => void;
	editGoalId?: string; // Optional: if provided, we're editing this goal
}

interface GoalFormData {
	title: string;
	description: string;
	direction: "up" | "down";
	placement: "internal" | "external";
	value: number;
	currency: string;
	type: "conversion" | "engagement";
}

const defaultFormData: GoalFormData = {
	title: "",
	description: "",
	direction: "up",
	placement: "internal",
	value: 1,
	currency: "USD",
	type: "conversion",
};

const currencyOptions = [
	{ value: "USD", label: "USD ($)" },
	{ value: "EUR", label: "EUR (€)" },
	{ value: "GBP", label: "GBP (£)" },
	{ value: "JPY", label: "JPY (¥)" },
	{ value: "CAD", label: "CAD ($)" },
	{ value: "AUD", label: "AUD ($)" },
	{ value: "CHF", label: "CHF (₣)" },
	{ value: "CNY", label: "CNY (¥)" },
	{ value: "INR", label: "INR (₹)" },
	{ value: "BRL", label: "BRL (R$)" },
	{ value: "TRY", label: "TRY (₺)" },
	{ value: "SEK", label: "SEK (kr)" },
	{ value: "NOK", label: "NOK (kr)" },
	{ value: "DKK", label: "DKK (kr)" },
	{ value: "MXN", label: "MXN ($)" },
];

export const CustomGoalsPanel = ({
	campaign,
	onBackToCampaignOverview,
	editGoalId,
}: CustomGoalsPanelProps) => {
	const updateCampaignSettings = useMutation(
		api.collections.campaigns.mutations.updateCampaignSettings,
	);
	const [formData, setFormData] = useState<GoalFormData>(defaultFormData);

	// Determine if we're in edit mode
	const isEditMode = Boolean(editGoalId);
	const customGoals = campaign.campaignSettings?.customGoals || [];
	const editingGoal = editGoalId
		? customGoals.find((g) => g.id === editGoalId)
		: null;

	// Initialize form data for editing
	useEffect(() => {
		if (isEditMode && editingGoal) {
			setFormData({
				title: editingGoal.title,
				description: editingGoal.description || "",
				direction: editingGoal.direction,
				placement: editingGoal.placement,
				value: editingGoal.value,
				currency: editingGoal.currency || "USD",
				type: editingGoal.type,
			});
		} else {
			setFormData(defaultFormData);
		}
	}, [isEditMode, editingGoal]);

	const handleSubmitGoal = async () => {
		const finalTitle = formData.title.trim();
		const finalDescription = formData.description.trim();

		if (!finalTitle) return;

		try {
			if (isEditMode && editingGoal) {
				// Update existing goal
				const updatedGoal: Goal = {
					...editingGoal,
					title: finalTitle,
					description: finalDescription || undefined,
					direction: formData.direction,
					placement: formData.placement,
					value: formData.value,
					currency: formData.currency,
					type: formData.type,
				};

				const updatedCustomGoals = customGoals.map((goal) =>
					goal.id === editGoalId ? updatedGoal : goal,
				);

				await updateCampaignSettings({
					campaignId: campaign._id,
					campaignSettings: {
						customGoals: updatedCustomGoals,
						// If this was the primary goal, update it too
						...(campaign.campaignSettings?.primaryGoal?.id === editGoalId && {
							primaryGoal: updatedGoal,
						}),
					},
				});
			} else {
				// Add new goal
				const newGoal: Goal = {
					id: `custom-goal-${nanoid()}`,
					title: finalTitle,
					description: finalDescription || undefined,
					direction: formData.direction,
					placement: formData.placement,
					value: formData.value,
					currency: formData.currency,
					type: formData.type,
					isCustom: true,
				};

				const updatedCustomGoals = [...customGoals, newGoal];

				// Prepare campaign settings update
				const settingsUpdate: { customGoals: Goal[]; primaryGoal?: Goal } = {
					customGoals: updatedCustomGoals,
				};

				// Set as primary goal if no primary goal exists
				if (!campaign.campaignSettings?.primaryGoal) {
					settingsUpdate.primaryGoal = newGoal;
				}

				await updateCampaignSettings({
					campaignId: campaign._id,
					campaignSettings: settingsUpdate,
				});
			}

			// Navigate back
			onBackToCampaignOverview();
		} catch (error) {
			console.error("Failed to save custom goal:", error);
		}
	};

	const handleFormChange = (
		field: keyof GoalFormData,
		value: string | number,
	) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	return (
		<div className="flex flex-col h-full">
			{/* Header - Fixed */}
			<div className="flex flex-shrink-0 gap-3 items-center p-4 border-b bg-muted">
				<Button
					size="iconSm"
					variant="outline"
					onClick={onBackToCampaignOverview}
					className="!px-2 !py-2 !h-auto rounded-lg border bg-brand/10 border-brand text-brand hover:bg-brand/5 hover:text-brand"
				>
					<ArrowLeft className="size-4" />
				</Button>

				<div className="flex-1">
					<div className="flex flex-col">
						<>
							<div className="text-lg font-semibold leading-tight">
								{isEditMode ? "Edit Custom Goal" : "Add Custom Goal"}
							</div>
							<div className="text-sm leading-tight text-muted-foreground">
								{isEditMode
									? `Update the goal settings for ${campaign.title}`
									: `Create a new custom goal for ${campaign.title}`}
							</div>
						</>
					</div>
				</div>
			</div>

			{/* Content - Scrollable */}
			<div className="overflow-y-auto flex-1">
				{/* Goal Form */}
				<div className="p-4 space-y-4">
					{/* Goal Title and Description */}
					<div className="space-y-2">
						<Label htmlFor="goal-title">Goal Title*</Label>
						<Input
							id="goal-title"
							value={formData.title}
							onChange={(e) => handleFormChange("title", e.target.value)}
							placeholder="e.g., Newsletter Signup"
							className="h-8"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="goal-description">Description</Label>
						<Textarea
							id="goal-description"
							value={formData.description}
							onChange={(e) => handleFormChange("description", e.target.value)}
							placeholder="Describe what this goal measures..."
							rows={2}
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="goal-type">Type</Label>
							<Select
								value={formData.type}
								onValueChange={(value) => handleFormChange("type", value)}
							>
								<SelectTrigger id="goal-type" className="h-8">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="conversion">
										<div className="flex gap-2 items-center">
											<GoalIcon className="text-muted-foreground size-3.5" />
											Conversion
										</div>
									</SelectItem>
									<SelectItem value="engagement">
										<div className="flex gap-2 items-center">
											<MousePointerClick className="text-muted-foreground size-4" />
											Engagement
										</div>
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="goal-direction">Direction</Label>
							<Select
								value={formData.direction}
								onValueChange={(value) => handleFormChange("direction", value)}
							>
								<SelectTrigger id="goal-direction" className="h-8">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="up">
										<div className="flex gap-2 items-center">
											<ArrowUp className="text-muted-foreground size-3" />
											Higher is better
										</div>
									</SelectItem>
									<SelectItem value="down">
										<div className="flex gap-2 items-center">
											<ArrowDown className="text-muted-foreground size-3" />
											Lower is better
										</div>
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="goal-value">Default Value</Label>
							<Input
								id="goal-value"
								type="number"
								value={formData.value}
								className="h-8"
								onChange={(e) =>
									handleFormChange(
										"value",
										Number.parseFloat(e.target.value) || 0,
									)
								}
								min="0"
								step="0.01"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="goal-currency">Currency</Label>
							<Select
								value={formData.currency}
								onValueChange={(value) => handleFormChange("currency", value)}
							>
								<SelectTrigger id="goal-currency" className="h-8">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{currencyOptions.map((currency) => (
										<SelectItem key={currency.value} value={currency.value}>
											{currency.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="goal-placement">Placement</Label>
						<Select
							value={formData.placement}
							onValueChange={(value) => handleFormChange("placement", value)}
						>
							<SelectTrigger id="goal-placement" className="h-8">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="internal">
									Internal (tracked within campaign)
								</SelectItem>
								<SelectItem value="external">
									External (tracked outside campaign)
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="flex gap-2 pt-4">
						<Button
							className="w-full h-8"
							size="sm"
							variant="outline"
							onClick={handleSubmitGoal}
							disabled={!formData.title.trim()}
						>
							{isEditMode ? "Update Goal" : "Add Goal"}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};
