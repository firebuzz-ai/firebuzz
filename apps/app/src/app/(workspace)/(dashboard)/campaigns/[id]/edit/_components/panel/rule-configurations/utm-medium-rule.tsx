"use client";

import type {
	FilterOperator,
	SegmentRule,
} from "@/components/canvas/campaign/nodes/campaign/types";
import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { useState } from "react";
import { RULE_TYPE_DEFINITIONS, getOperatorLabel } from "../helpers/rule-types";
import { FilterOperatorSelector } from "../value-selectors/filter-operator-selector";
import { HybridSelectValue } from "../value-selectors/hybrid-select-value";

interface UtmMediumRuleProps {
	onRuleChange: (rule: Partial<SegmentRule>) => void;
	existingRule?: SegmentRule;
}

export const UtmMediumRule = ({
	onRuleChange,
	existingRule,
}: UtmMediumRuleProps) => {
	const [operator, setOperator] = useState<FilterOperator>(
		existingRule?.operator || "equals",
	);
	const [value, setValue] = useState<string | string[]>(() => {
		if (existingRule) {
			if (Array.isArray(existingRule.value)) {
				return existingRule.value.map(String);
			}
			return String(existingRule.value || "");
		}
		return "";
	});
	const ruleType = RULE_TYPE_DEFINITIONS.utmMedium;

	const handleChange = (
		newOperator?: FilterOperator,
		newValue?: string | string[],
	) => {
		const currentOperator = newOperator || operator;
		const currentValue = newValue !== undefined ? newValue : value;

		if (newOperator) setOperator(newOperator);
		if (newValue !== undefined) setValue(newValue);

		if (
			currentValue &&
			(Array.isArray(currentValue) ? currentValue.length > 0 : currentValue)
		) {
			const operatorLabel = getOperatorLabel(currentOperator);
			let label: string;

			if (Array.isArray(currentValue)) {
				label = `UTM Medium ${operatorLabel} ${currentValue.join(", ")}`;
			} else {
				label = `UTM Medium ${operatorLabel} ${currentValue}`;
			}

			onRuleChange({
				ruleType: "utmMedium",
				operator: currentOperator,
				value: currentValue,
				label,
			});
		}
	};

	const handleOperatorChange = (newOperator: FilterOperator) => {
		const operatorValueType = ruleType.operatorValueTypes?.[newOperator];
		const isMultiSelect = operatorValueType === "array";

		// Convert value type when switching operators
		if (isMultiSelect && !Array.isArray(value)) {
			const newValue = value ? [String(value)] : [];
			handleChange(newOperator, newValue);
		} else if (!isMultiSelect && Array.isArray(value)) {
			const newValue = value.length > 0 ? String(value[0]) : "";
			handleChange(newOperator, newValue);
		} else {
			handleChange(newOperator, value);
		}
	};

	return (
		<div className="space-y-4">
			<FilterOperatorSelector
				label="Filter Condition"
				value={operator}
				onChange={handleOperatorChange}
				supportedOperators={ruleType.supportedOperators}
				ruleType="utmMedium"
				description="Choose how to filter visitors by UTM medium"
			/>

			<HybridSelectValue
				label="UTM Medium"
				value={value}
				onChange={(newValue) => handleChange(undefined, newValue)}
				options={ruleType.options || []}
				placeholder="Select or enter UTM medium"
				customInputPlaceholder="e.g., cpc, email, social"
				multiple={ruleType.operatorValueTypes?.[operator] === "array"}
				description="Select from common mediums or enter a custom UTM medium parameter."
			/>

			<InfoBox variant="info" iconPlacement="top">
				Target visitors based on UTM medium parameters. This helps identify the
				marketing medium (e.g., email, social media, paid search) that brought
				the visitor.
			</InfoBox>
		</div>
	);
};
