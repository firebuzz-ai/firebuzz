"use client";

import { Button } from "@firebuzz/ui/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@firebuzz/ui/components/ui/command";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Label } from "@firebuzz/ui/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@firebuzz/ui/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@firebuzz/ui/components/ui/select";
import {
	Check,
	ChevronsUpDown,
	Focus,
	Goal as GoalIcon,
	MousePointerClick,
} from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { useState } from "react";

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

interface GoalSelectorProps {
	selectedGoal?: Goal;
	availableGoals: Goal[];
	onGoalChange: (goal: Goal) => void;
	onValueChange: (value: number) => void;
	onCurrencyChange: (currency: string) => void;
	label?: string;
	className?: string;
	onNavigateToCustomGoals?: (editGoalId?: string) => void;
	customGoalsCount?: number;
}

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

export const GoalSelector = ({
	selectedGoal,
	availableGoals,
	onGoalChange,
	onValueChange,
	onCurrencyChange,
	label = "Primary Goal",
	className,
	onNavigateToCustomGoals,
}: GoalSelectorProps) => {
	const [open, setOpen] = useState(false);

	const handleGoalSelect = (goalId: string) => {
		const goal = availableGoals.find((g) => g.id === goalId);
		if (goal) {
			onGoalChange(goal);
			setOpen(false);
		}
	};

	const getGoalTypeIcon = (type: string, isCustom = false) => {
		if (isCustom) {
			return <Focus className="size-3.5 text-muted-foreground" />;
		}
		switch (type) {
			case "conversion":
				return <GoalIcon className="size-3.5 text-muted-foreground" />;
			case "engagement":
				return <MousePointerClick className="size-3.5 text-muted-foreground" />;
			default:
				return <GoalIcon className="size-3.5 text-muted-foreground" />;
		}
	};

	return (
		<div className={cn("space-y-4", className)}>
			{/* Goal Selection - Custom Combobox */}
			<div className="space-y-2">
				<Label>{label}</Label>
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							// biome-ignore lint/a11y/useSemanticElements: <explanation>
							role="combobox"
							aria-expanded={open}
							className="justify-between w-full h-8"
						>
							{selectedGoal ? (
								<div className="flex gap-2 items-center">
									{getGoalTypeIcon(selectedGoal.type, selectedGoal.isCustom)}
									<span className="truncate">{selectedGoal.title}</span>
								</div>
							) : (
								<span className="text-muted-foreground">Select a goal</span>
							)}
							<ChevronsUpDown className="ml-2 w-4 h-4 opacity-50 shrink-0" />
						</Button>
					</PopoverTrigger>
					<PopoverContent
						className="w-[--radix-popover-trigger-width] p-0"
						align="start"
					>
						<Command>
							<CommandInput placeholder="Search goals..." className="h-8" />
							<CommandList>
								<CommandEmpty>No goals found.</CommandEmpty>
								<CommandGroup>
									{availableGoals.map((goal) => (
										<CommandItem
											key={goal.id}
											value={goal.id}
											onSelect={() => handleGoalSelect(goal.id)}
											className="flex gap-3 items-center cursor-pointer"
										>
											<Check
												className={cn(
													"h-4 w-4",
													selectedGoal?.id === goal.id
														? "opacity-100"
														: "opacity-0",
												)}
											/>
											{getGoalTypeIcon(goal.type, goal.isCustom)}
											<div className="flex-1 min-w-0">
												<div className="font-medium truncate">{goal.title}</div>
												{goal.description && (
													<p className="text-xs text-muted-foreground mt-0.5 truncate">
														{goal.description}
													</p>
												)}
											</div>
										</CommandItem>
									))}
								</CommandGroup>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>
			</div>

			{/* Goal Value and Currency */}
			{selectedGoal && (
				<div className="space-y-3">
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-2">
							<Label htmlFor="goal-value">Goal Value</Label>
							<Input
								id="goal-value"
								type="number"
								value={selectedGoal.value}
								onChange={(e) => {
									const value = Number.parseFloat(e.target.value) || 0;
									onValueChange(value);
								}}
								min="0"
								step="0.01"
								className="h-8"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="goal-currency">Currency</Label>
							<Select
								value={selectedGoal.currency || "USD"}
								onValueChange={onCurrencyChange}
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

					{/* Add/Edit Custom Goal Button */}
					{onNavigateToCustomGoals && (
						<Button
							variant="outline"
							size="sm"
							className="w-full h-8"
							onClick={() =>
								onNavigateToCustomGoals(
									selectedGoal.isCustom ? selectedGoal.id : undefined,
								)
							}
						>
							{selectedGoal.isCustom ? "Edit Custom Goal" : "Add Custom Goal"}
						</Button>
					)}
				</div>
			)}
		</div>
	);
};
