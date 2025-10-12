"use client";

import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { useState } from "react";
import type {
	FilterOperator,
	SegmentRule,
} from "@/components/canvas/campaign/nodes/campaign/types";
import { getOperatorLabel, RULE_TYPE_DEFINITIONS } from "../helpers/rule-types";
import { FilterOperatorSelector } from "../value-selectors/filter-operator-selector";
import { HybridSelectValue } from "../value-selectors/hybrid-select-value";

interface UtmTermRuleProps {
	onRuleChange: (rule: Partial<SegmentRule>) => void;
	existingRule?: SegmentRule;
}

export const UtmTermRule = ({
	onRuleChange,
	existingRule,
}: UtmTermRuleProps) => {
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
	const ruleType = RULE_TYPE_DEFINITIONS.utmTerm;

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
				label = `UTM Term ${operatorLabel} ${currentValue.join(", ")}`;
			} else {
				label = `UTM Term ${operatorLabel} ${currentValue}`;
			}

			onRuleChange({
				ruleType: "utmTerm",
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
				ruleType="utmTerm"
				description="Choose how to filter visitors by UTM term"
			/>

			<HybridSelectValue
				label="UTM Term"
				value={value}
				onChange={(newValue) => handleChange(undefined, newValue)}
				options={ruleType.options || []}
				placeholder="Enter search terms"
				customInputPlaceholder="e.g., running shoes, marketing software"
				multiple={ruleType.operatorValueTypes?.[operator] === "array"}
				description="Enter the search keywords or terms from paid search campaigns."
			/>

			<InfoBox variant="info" iconPlacement="top">
				Target visitors based on UTM term parameters. This is typically used for
				paid search campaigns to identify the keywords that triggered your ads.
			</InfoBox>
		</div>
	);
};
