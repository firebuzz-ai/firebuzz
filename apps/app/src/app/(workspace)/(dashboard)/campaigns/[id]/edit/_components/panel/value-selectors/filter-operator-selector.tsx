"use client";

import { Button } from "@firebuzz/ui/components/ui/button";
import { Label } from "@firebuzz/ui/components/ui/label";
import {
	ChevronLeft,
	ChevronRight,
	Equal,
	EqualNot,
	ListCheck,
	ListEnd,
	ListStart,
	ListX,
	MoreVertical,
	SearchCheck,
	SearchX,
} from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import type {
	FilterOperator,
	RuleTypeId,
} from "@/components/canvas/campaign/nodes/campaign/types";
import { getOperatorLabel } from "../helpers/rule-types";

// Icon mapping for each operator
const OPERATOR_ICONS: Record<
	FilterOperator,
	React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
	equals: Equal,
	not_equals: EqualNot,
	greater_than: ChevronRight,
	less_than: ChevronLeft,
	between: MoreVertical,
	in: ListCheck,
	not_in: ListX,
	contains: SearchCheck,
	not_contains: SearchX,
	starts_with: ListStart,
	ends_with: ListEnd,
};

interface FilterOperatorSelectorProps {
	label?: string;
	value: FilterOperator;
	onChange: (operator: FilterOperator) => void;
	supportedOperators: FilterOperator[];
	ruleType: RuleTypeId;
	description?: string;
	required?: boolean;
	disabled?: boolean;
	className?: string;
}

export const FilterOperatorSelector = ({
	label,
	value,
	onChange,
	supportedOperators,
	description,
	required = false,
	disabled = false,
	className,
}: FilterOperatorSelectorProps) => {
	return (
		<div className={cn("pb-6 space-y-3 border-b", className)}>
			<div>
				{label && (
					<Label
						className={cn(
							required && "after:content-['*'] after:ml-0.5 after:text-red-500",
						)}
					>
						{label}
					</Label>
				)}
				{description && (
					<p className="text-sm text-muted-foreground">{description}</p>
				)}
			</div>

			{/* Badge-style operator selection */}
			<div className="grid grid-cols-2 gap-2">
				{supportedOperators.map((operator) => {
					const isSelected = value === operator;
					const OperatorIcon = OPERATOR_ICONS[operator];
					const operatorLabel = getOperatorLabel(operator);

					return (
						<Button
							key={operator}
							type="button"
							variant="outline"
							onClick={() => onChange(operator)}
							disabled={disabled}
							className={cn(
								"justify-start p-3 h-auto transition-all duration-200",
								isSelected
									? "border shadow-sm border-brand bg-brand/5 text-brand"
									: "border hover:bg-muted/50",
							)}
						>
							<div className="flex gap-3 items-center w-full">
								{/* Rule type icon container */}
								<div
									className={cn(
										"p-1.5 rounded-md transition-colors flex-shrink-0",
										isSelected
											? "bg-brand/10 text-brand border border-brand/20"
											: "bg-muted text-muted-foreground border",
									)}
								>
									<OperatorIcon className="w-3.5 h-3.5" />
								</div>

								{/* Operator icon and label */}
								<div className="flex flex-1 gap-2 items-center min-w-0">
									<span
										className={cn(
											"text-sm font-medium truncate transition-colors",
											isSelected ? "text-brand" : "text-foreground",
										)}
									>
										{operatorLabel}
									</span>
								</div>
							</div>
						</Button>
					);
				})}
			</div>
		</div>
	);
};
