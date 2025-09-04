"use client";

import { type Doc, api, useMutation } from "@firebuzz/convex";
import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
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
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
	ArrowDown,
	ArrowLeft,
	ArrowUp,
	Calendar,
	ChevronLeft,
	ChevronRight,
	CreditCard,
	Download,
	Eye,
	FileText,
	Goal as GoalIcon,
	Heart,
	Mail,
	MousePointerClick,
	Percent,
	Phone,
	Share2,
	ShoppingCart,
	TextCursorInput,
	UserPlus,
} from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";

const iconOptions = [
	{ value: "text-cursor-input", label: "Form Input", icon: TextCursorInput },
	{ value: "mouse-pointer-click", label: "Click", icon: MousePointerClick },
	{ value: "eye", label: "View", icon: Eye },
	{ value: "percent", label: "Percentage", icon: Percent },
	{ value: "goal", label: "Goal", icon: GoalIcon },
	{ value: "shopping-cart", label: "Purchase", icon: ShoppingCart },
	{ value: "user-plus", label: "Signup", icon: UserPlus },
	{ value: "download", label: "Download", icon: Download },
	{ value: "mail", label: "Email", icon: Mail },
	{ value: "phone", label: "Phone", icon: Phone },
	{ value: "calendar", label: "Schedule", icon: Calendar },
	{ value: "file-text", label: "Document", icon: FileText },
	{ value: "credit-card", label: "Payment", icon: CreditCard },
	{ value: "share-2", label: "Share", icon: Share2 },
	{ value: "heart", label: "Like", icon: Heart },
];

type Event = {
	id: string;
	title: string;
	description?: string;
	icon: string;
	direction: "up" | "down";
	placement: "internal" | "external";
	value: number;
	currency?: string;
	type: "conversion" | "engagement";
	isCustom: boolean;
};

interface CustomEventsPanelProps {
	campaign: Doc<"campaigns">;
	onBackToCampaignOverview: () => void;
	editEventId?: string; // Optional: if provided, we're editing this event
}

interface EventFormData {
	title: string;
	description: string;
	icon: string;
	direction: "up" | "down";
	placement: "internal" | "external";
	value: number;
	currency: string;
	type: "conversion" | "engagement";
}

const defaultFormData: EventFormData = {
	title: "",
	description: "",
	icon: "goal",
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

export const CustomEventsPanel = ({
	campaign,
	onBackToCampaignOverview,
	editEventId,
}: CustomEventsPanelProps) => {
	const updateCampaignSettings = useMutation(
		api.collections.campaigns.mutations.updateCampaignSettings,
	);
	const [formData, setFormData] = useState<EventFormData>(defaultFormData);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	// Determine if we're in edit mode
	const isEditMode = Boolean(editEventId);
	const customEvents = campaign.campaignSettings?.customEvents || [];
	const editingEvent = editEventId
		? customEvents.find((e) => e.id === editEventId)
		: null;

	// Initialize form data for editing
	useEffect(() => {
		if (isEditMode && editingEvent) {
			setFormData({
				title: editingEvent.title,
				description: editingEvent.description || "",
				icon: editingEvent.icon,
				direction: editingEvent.direction,
				placement: editingEvent.placement,
				value: editingEvent.value,
				currency: editingEvent.currency || "USD",
				type: editingEvent.type,
			});
		} else {
			setFormData(defaultFormData);
		}
	}, [isEditMode, editingEvent]);

	const handleSubmitEvent = async () => {
		const finalTitle = formData.title.trim();
		const finalDescription = formData.description.trim();

		if (!finalTitle) return;

		try {
			if (isEditMode && editingEvent) {
				// Update existing event
				const updatedEvent: Event = {
					...editingEvent,
					title: finalTitle,
					description: finalDescription || undefined,
					icon: formData.icon,
					direction: formData.direction,
					placement: formData.placement,
					value: formData.value,
					currency: formData.currency,
					type: formData.type,
				};

				const updatedCustomEvents = customEvents.map((event) =>
					event.id === editEventId ? updatedEvent : event,
				);

				await updateCampaignSettings({
					campaignId: campaign._id,
					campaignSettings: {
						customEvents: updatedCustomEvents,
						// If this was the primary goal, update it too
						...(campaign.campaignSettings?.primaryGoal?.id === editEventId && {
							primaryGoal: updatedEvent,
						}),
					},
				});
			} else {
				// Add new event
				const newEvent: Event = {
					id: `${nanoid()}`,
					title: finalTitle,
					description: finalDescription || undefined,
					icon: formData.icon,
					direction: formData.direction,
					placement: formData.placement,
					value: formData.value,
					currency: formData.currency,
					type: formData.type,
					isCustom: true,
				};

				const updatedCustomEvents = [...customEvents, newEvent];

				// Prepare campaign settings update
				const settingsUpdate: { customEvents: Event[]; primaryGoal?: Event } = {
					customEvents: updatedCustomEvents,
				};

				// Set as primary goal if no primary goal exists
				if (!campaign.campaignSettings?.primaryGoal) {
					settingsUpdate.primaryGoal = newEvent;
				}

				await updateCampaignSettings({
					campaignId: campaign._id,
					campaignSettings: settingsUpdate,
				});
			}

			// Navigate back
			onBackToCampaignOverview();
		} catch (error) {
			console.error("Failed to save custom event:", error);
		}
	};

	const handleFormChange = (
		field: keyof EventFormData,
		value: string | number,
	) => {
		setFormData((prev) => {
			const newData = { ...prev, [field]: value };

			// If placement changes to external, force type to be conversion
			if (field === "placement" && value === "external") {
				newData.type = "conversion";
			}

			return newData;
		});
	};

	// Check scroll position and update button states
	const checkScrollButtons = useCallback(() => {
		if (!scrollContainerRef.current) return;

		const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
		setCanScrollLeft(scrollLeft > 0);
		setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
	}, []);

	// Scroll functions
	const scrollLeft = () => {
		if (!scrollContainerRef.current) return;
		scrollContainerRef.current.scrollBy({ left: -44, behavior: "smooth" }); // 40px width + 4px gap
	};

	const scrollRight = () => {
		if (!scrollContainerRef.current) return;
		scrollContainerRef.current.scrollBy({ left: 44, behavior: "smooth" }); // 40px width + 4px gap
	};

	// Check scroll buttons on mount and when container changes
	useEffect(() => {
		checkScrollButtons();
		const resizeObserver = new ResizeObserver(checkScrollButtons);
		if (scrollContainerRef.current) {
			resizeObserver.observe(scrollContainerRef.current);
		}
		return () => resizeObserver.disconnect();
	}, [checkScrollButtons]);

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
								{isEditMode ? "Edit Custom Event" : "Add Custom Event"}
							</div>
							<div className="text-sm leading-tight text-muted-foreground">
								{isEditMode
									? `Update the event settings for ${campaign.title}`
									: `Create a new custom event for ${campaign.title}`}
							</div>
						</>
					</div>
				</div>
			</div>

			{/* Content - Scrollable */}
			<div className="overflow-y-auto flex-1">
				{/* Event Form */}
				<div className="p-4 space-y-4">
					{/* Event Title and Description */}
					<div className="space-y-2">
						<Label htmlFor="event-title">Event Title*</Label>
						<Input
							id="event-title"
							value={formData.title}
							onChange={(e) => handleFormChange("title", e.target.value)}
							placeholder="e.g., Newsletter Signup"
							className="h-8"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="event-description">Description</Label>
						<Textarea
							id="event-description"
							value={formData.description}
							onChange={(e) => handleFormChange("description", e.target.value)}
							placeholder="Describe what this event measures..."
							rows={2}
						/>
					</div>

					{/* Icon Selection */}
					<div className="space-y-2">
						<Label>Icon</Label>
						<div className="relative">
							{/* Left scroll button */}
							{canScrollLeft && (
								<button
									type="button"
									onClick={scrollLeft}
									className="flex absolute left-0 top-[20px] z-10 justify-center items-center rounded-full border shadow-sm transition-colors -translate-y-1/2 size-8 bg-background/90 hover:bg-muted"
								>
									<ChevronLeft className="size-4" />
								</button>
							)}

							{/* Scrollable container */}
							<div
								ref={scrollContainerRef}
								onScroll={checkScrollButtons}
								className="flex overflow-x-auto gap-2 pb-2 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
								style={{
									scrollbarWidth: "none",
									msOverflowStyle: "none",
								}}
							>
								{iconOptions.map((option) => {
									const Icon = option.icon;
									const isSelected = formData.icon === option.value;
									return (
										<Tooltip key={option.value}>
											<TooltipTrigger asChild>
												<button
													type="button"
													onClick={() => handleFormChange("icon", option.value)}
													className={cn(
														"flex flex-shrink-0 justify-center items-center rounded-lg border transition-all bg-muted size-10 snap-center",
														isSelected
															? "border-brand bg-brand/10 text-brand"
															: "border-border hover:border-brand/20 hover:bg-brand/5",
													)}
												>
													<Icon className="size-4" />
												</button>
											</TooltipTrigger>
											<TooltipContent>
												<p>{option.label}</p>
											</TooltipContent>
										</Tooltip>
									);
								})}
							</div>

							{/* Right scroll button */}
							{canScrollRight && (
								<button
									type="button"
									onClick={scrollRight}
									className="flex absolute right-0 top-[20px] z-10 justify-center items-center rounded-full border shadow-sm transition-colors -translate-y-1/2 size-8 bg-background/90 hover:bg-muted"
								>
									<ChevronRight className="size-4" />
								</button>
							)}
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="event-type">Type</Label>
							<Select
								value={formData.type}
								onValueChange={(value) => handleFormChange("type", value)}
								disabled={formData.placement === "external"}
							>
								<SelectTrigger
									id="event-type"
									className={cn(
										"h-8",
										formData.placement === "external" &&
											"opacity-50 cursor-not-allowed",
									)}
								>
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
							{formData.placement === "external" && (
								<p className="text-xs text-muted-foreground">
									External events must be conversion type
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="event-direction">Direction</Label>
							<Select
								value={formData.direction}
								onValueChange={(value) => handleFormChange("direction", value)}
							>
								<SelectTrigger id="event-direction" className="h-8">
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
							<Label htmlFor="event-value">Default Value</Label>
							<Input
								id="event-value"
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
							<Label htmlFor="event-currency">Currency</Label>
							<Select
								value={formData.currency}
								onValueChange={(value) => handleFormChange("currency", value)}
							>
								<SelectTrigger id="event-currency" className="h-8">
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
						<Label htmlFor="event-placement">Placement</Label>
						<Select
							value={formData.placement}
							onValueChange={(value) => handleFormChange("placement", value)}
						>
							<SelectTrigger id="event-placement" className="h-8">
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
							onClick={handleSubmitEvent}
							disabled={!formData.title.trim()}
						>
							{isEditMode ? "Update Event" : "Add Event"}
						</Button>
					</div>
					<InfoBox variant="warning">
						{formData.placement === "internal"
							? "You must track these custom events in your landing page. Just ask Firebuzz editor to add custom events into your landing page."
							: "You must track these custom events externally via our Tracking API or Tag Manager. Learn more in our documentation."}
					</InfoBox>
				</div>
			</div>
		</div>
	);
};
