"use client";

import type {
	FilterOperator,
	SegmentRule,
} from "@/components/canvas/campaign/nodes/campaign/types";
import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { useState } from "react";
import { RULE_TYPE_DEFINITIONS, getOperatorLabel } from "../helpers/rule-types";
import { HourOfDaySelector } from "../value-selectors";
import { FilterOperatorSelector } from "../value-selectors/filter-operator-selector";

interface HourOfDayRuleProps {
	onRuleChange: (rule: Partial<SegmentRule>) => void;
	existingRule?: SegmentRule;
}

export const HourOfDayRule = ({
	onRuleChange,
	existingRule,
}: HourOfDayRuleProps) => {
	const [operator, setOperator] = useState<FilterOperator>(
		existingRule?.operator || "equals",
	);
	const [value, setValue] = useState<number | number[] | [number, number]>(
		() => {
			if (existingRule) {
				if (Array.isArray(existingRule.value)) {
					return existingRule.value.map(Number) as number[] | [number, number];
				}

				if (typeof existingRule.value === "number") {
					return existingRule.value;
				}
			}
			return -1;
		},
	);

	const ruleType = RULE_TYPE_DEFINITIONS.hourOfDay;

	// Determine mode based on operator
	const getMode = (op: FilterOperator): "single" | "multiple" | "range" => {
		if (op === "between") return "range";
		if (op === "in" || op === "not_in") return "multiple";
		return "single";
	};

	const mode = getMode(operator);

	const handleChange = (
		newOperator?: FilterOperator,
		newValue?: string | string[] | boolean | number | number[],
	) => {
		const currentOperator = newOperator || operator;
		const currentMode = getMode(currentOperator);

		if (newOperator) setOperator(newOperator);

		// Convert value to appropriate type
		let finalValue: number | number[] | [number, number];
		if (Array.isArray(newValue)) {
			finalValue = newValue.map(Number) as number[] | [number, number];
		} else if (typeof newValue === "number") {
			finalValue = newValue;
		} else {
			finalValue = value;
		}

		if (newValue !== undefined) setValue(finalValue);

		// Generate label based on value and operator
		let label = "";
		const operatorLabel = getOperatorLabel(currentOperator);

		if (
			currentMode === "range" &&
			Array.isArray(finalValue) &&
			finalValue.length === 2
		) {
			label = `Hour of Day ${operatorLabel} ${finalValue[0]}:00 and ${finalValue[1]}:00`;
		} else if (currentMode === "multiple" && Array.isArray(finalValue)) {
			const hours = finalValue.map((h) => `${h}:00`).join(", ");
			label = `Hour of Day ${operatorLabel} ${hours}`;
		} else if (
			currentMode === "single" &&
			typeof finalValue === "number" &&
			finalValue >= 0
		) {
			label = `Hour of Day ${operatorLabel} ${finalValue}:00`;
		}

		if (
			label &&
			((Array.isArray(finalValue) && finalValue.length > 0) ||
				(typeof finalValue === "number" && finalValue >= 0))
		) {
			onRuleChange({
				ruleType: "hourOfDay",
				operator: currentOperator,
				value: finalValue,
				label,
			});
		}
	};

	const handleOperatorChange = (newOperator: FilterOperator) => {
		const oldMode = getMode(operator);
		const newMode = getMode(newOperator);

		setOperator(newOperator);

		// Adjust value when switching between modes
		if (oldMode !== newMode) {
			if (newMode === "single") {
				const newValue =
					Array.isArray(value) && value.length > 0 ? value[0] : 0;
				setValue(newValue);
				handleChange(newOperator, newValue);
			} else if (newMode === "multiple") {
				const newValue =
					typeof value === "number"
						? [value]
						: Array.isArray(value)
							? value
							: [];
				setValue(newValue);
				handleChange(newOperator, newValue);
			} else if (newMode === "range") {
				const newValue: [number, number] = Array.isArray(value)
					? [value[0] || 0, value[value.length - 1] || 23]
					: [0, 23];
				setValue(newValue);
				handleChange(newOperator, newValue);
			}
		} else {
			handleChange(newOperator);
		}
	};

	return (
		<div className="space-y-4">
			<FilterOperatorSelector
				label="Filter Condition"
				value={operator}
				onChange={handleOperatorChange}
				supportedOperators={ruleType.supportedOperators}
				ruleType="hourOfDay"
				description="Choose how to filter visitors by hour of day"
			/>

			<HourOfDaySelector
				label="Select Hours"
				value={value}
				onChange={(newValue) => handleChange(undefined, newValue)}
				mode={mode}
				description={
					mode === "range"
						? "Select a time range to target visitors during specific hours."
						: mode === "multiple"
							? "Select multiple hours to target visitors during those specific times."
							: "Select a specific hour to target visitors."
				}
				showTimeLabels={true}
				showPeriodHighlights={true}
			/>

			<InfoBox variant="info" iconPlacement="top">
				Target visitors based on the hour of the day in their local time. This
				helps deliver time-specific content or promotions.
			</InfoBox>
		</div>
	);
};
