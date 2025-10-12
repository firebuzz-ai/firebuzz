"use client";

import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Checkbox } from "@firebuzz/ui/components/ui/checkbox";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Label } from "@firebuzz/ui/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@firebuzz/ui/components/ui/select";
import { X } from "@firebuzz/ui/icons/lucide";
import { useState } from "react";
import type {
	FilterOperator,
	RuleTypeId,
	SegmentRule,
} from "@/components/canvas/campaign/nodes/campaign/types";
import {
	getOperatorLabel,
	getValueTypeForOperator,
	RULE_TYPE_DEFINITIONS,
} from "../helpers/rule-types";
import { FilterOperatorSelector } from "../value-selectors/filter-operator-selector";

interface GenericRuleProps {
	ruleTypeId: RuleTypeId;
	onRuleChange: (rule: Partial<SegmentRule>) => void;
	existingRule?: SegmentRule;
}

export const GenericRule = ({
	ruleTypeId,
	onRuleChange,
	existingRule,
}: GenericRuleProps) => {
	const [operator, setOperator] = useState<FilterOperator>(
		existingRule?.operator || "equals",
	);
	const [value, setValue] = useState<string | number | boolean | string[]>(
		existingRule &&
			!Array.isArray(existingRule.value) &&
			existingRule.operator !== "between"
			? existingRule.value
			: "",
	);
	const [selectedOptions, setSelectedOptions] = useState<string[]>(
		existingRule &&
			Array.isArray(existingRule.value) &&
			existingRule.operator !== "between"
			? existingRule.value.map(String)
			: [],
	);
	const [betweenValues, setBetweenValues] = useState<{
		min: string;
		max: string;
	}>(() => {
		if (
			existingRule &&
			existingRule.operator === "between" &&
			Array.isArray(existingRule.value) &&
			existingRule.value.length === 2
		) {
			return {
				min: String(existingRule.value[0]),
				max: String(existingRule.value[1]),
			};
		}
		return { min: "", max: "" };
	});

	const ruleType = RULE_TYPE_DEFINITIONS[ruleTypeId];
	const currentValueType = getValueTypeForOperator(ruleType, operator);

	const handleChange = () => {
		let finalValue: string | number | boolean | string[] | number[] = value;

		// Handle between operator - always returns array with [min, max]
		if (operator === "between") {
			if (currentValueType === "number") {
				const min = Number.parseFloat(betweenValues.min) || 0;
				const max = Number.parseFloat(betweenValues.max) || 0;
				finalValue = [min, max];
			} else {
				finalValue = [betweenValues.min, betweenValues.max];
			}
		}
		// Handle array values for multi-select options
		else if (
			currentValueType === "array" ||
			operator === "in" ||
			operator === "not_in"
		) {
			finalValue =
				selectedOptions.length > 0 ? selectedOptions : [String(value)];
		}
		// Convert to number if needed
		else if (currentValueType === "number" && typeof value === "string") {
			finalValue = Number.parseFloat(value) || 0;
		}

		const label = generateRuleLabel(ruleType.label, operator, finalValue);

		onRuleChange({
			ruleType: ruleTypeId,
			operator,
			value: finalValue,
			label,
		});
	};

	const generateRuleLabel = (
		typeLabel: string,
		op: FilterOperator,
		val: string | number | boolean | string[] | number[],
	): string => {
		const operatorLabel = getOperatorLabel(op);
		let valueLabel = "";

		if (Array.isArray(val)) {
			if (op === "between" && val.length === 2) {
				valueLabel = `${val[0]} and ${val[1]}`;
			} else {
				valueLabel = val.join(", ");
			}
		} else {
			valueLabel = String(val);
		}

		return `${typeLabel} ${operatorLabel} ${valueLabel}`;
	};

	const handleOperatorChange = (newOperator: FilterOperator) => {
		setOperator(newOperator);

		const newValueType = getValueTypeForOperator(ruleType, newOperator);

		// Clear incompatible values when switching operators
		if (newValueType !== "array" && selectedOptions.length > 0) {
			setSelectedOptions([]);
		}
		if (newValueType === "array" && value && !Array.isArray(value)) {
			setValue("");
		}
		if (newOperator !== "between") {
			setBetweenValues({ min: "", max: "" });
		}
		if (newOperator === "between") {
			setValue("");
			setSelectedOptions([]);
		}

		// Trigger rule change after state updates
		setTimeout(() => handleChange(), 0);
	};

	const handleOptionToggle = (optionValue: string) => {
		const newOptions = selectedOptions.includes(optionValue)
			? selectedOptions.filter((v) => v !== optionValue)
			: [...selectedOptions, optionValue];
		setSelectedOptions(newOptions);
		setTimeout(() => handleChange(), 0);
	};

	const handleValueChange = (newValue: string) => {
		setValue(newValue);
		setTimeout(() => handleChange(), 0);
	};

	const handleBetweenChange = (field: "min" | "max", newValue: string) => {
		setBetweenValues((prev) => ({ ...prev, [field]: newValue }));
		setTimeout(() => handleChange(), 0);
	};

	const renderValueInput = () => {
		// Between operator - two input fields for range
		if (operator === "between") {
			return (
				<div className="space-y-2">
					<Label>Enter Range</Label>
					<div className="flex gap-2 items-center">
						<Input
							type={currentValueType === "number" ? "number" : "text"}
							placeholder="Min"
							value={betweenValues.min}
							onChange={(e) => handleBetweenChange("min", e.target.value)}
							className="flex-1"
						/>
						<span className="text-muted-foreground">to</span>
						<Input
							type={currentValueType === "number" ? "number" : "text"}
							placeholder="Max"
							value={betweenValues.max}
							onChange={(e) => handleBetweenChange("max", e.target.value)}
							className="flex-1"
						/>
					</div>
				</div>
			);
		}

		// Multi-select for array values or in/not_in operators
		if (
			currentValueType === "array" ||
			operator === "in" ||
			operator === "not_in"
		) {
			if (ruleType.options) {
				return (
					<div className="space-y-2">
						<Label>Select Options</Label>
						<div className="grid overflow-y-auto grid-cols-1 gap-2 max-h-48">
							{ruleType.options.map((option) => (
								<div
									key={option.value}
									className="flex items-center p-2 space-x-2 rounded border cursor-pointer hover:bg-muted"
									onClick={() => handleOptionToggle(option.value)}
								>
									<Checkbox checked={selectedOptions.includes(option.value)} />
									{option.icon && <div className="w-4 h-4">{option.icon}</div>}
									<span className="text-sm">{option.label}</span>
								</div>
							))}
						</div>
						{selectedOptions.length > 0 && (
							<div className="flex flex-wrap gap-1">
								{selectedOptions.map((selected) => {
									const option = ruleType.options?.find(
										(o) => o.value === selected,
									);
									return (
										<Badge
											key={selected}
											variant="secondary"
											className="text-xs"
										>
											{option?.label || selected}
											<X
												className="ml-1 w-3 h-3 cursor-pointer"
												onClick={(e) => {
													e.stopPropagation();
													handleOptionToggle(selected);
												}}
											/>
										</Badge>
									);
								})}
							</div>
						)}
					</div>
				);
			}
			// Fallback for array input without predefined options
			return (
				<div className="space-y-2">
					<Label>Enter Values</Label>
					<Input
						placeholder="Enter values separated by commas"
						value={selectedOptions.join(", ")}
						onChange={(e) => {
							const values = e.target.value.split(",").map((v) => v.trim());
							setSelectedOptions(values.filter((v) => v));
							setTimeout(() => handleChange(), 0);
						}}
					/>
				</div>
			);
		}

		// Single select for single values
		if (ruleType.options) {
			return (
				<div className="space-y-2">
					<Label>Select Value</Label>
					<Select
						value={String(value)}
						onValueChange={(newValue) => {
							setValue(newValue);
							setTimeout(() => handleChange(), 0);
						}}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select an option" />
						</SelectTrigger>
						<SelectContent>
							{ruleType.options.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									<div className="flex gap-2 items-center">
										{option.icon && (
											<div className="w-4 h-4">{option.icon}</div>
										)}
										{option.label}
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			);
		}

		// Fallback input for single values
		return (
			<div className="space-y-2">
				<Label>Enter Value</Label>
				<Input
					type={currentValueType === "number" ? "number" : "text"}
					placeholder="Enter value"
					value={String(value)}
					onChange={(e) => handleValueChange(e.target.value)}
				/>
			</div>
		);
	};

	return (
		<div className="space-y-4">
			<FilterOperatorSelector
				value={operator}
				onChange={handleOperatorChange}
				supportedOperators={ruleType.supportedOperators}
				ruleType={ruleTypeId}
				label="Select Condition"
			/>

			{renderValueInput()}
		</div>
	);
};
