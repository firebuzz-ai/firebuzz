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

interface UtmContentRuleProps {
	onRuleChange: (rule: Partial<SegmentRule>) => void;
	existingRule?: SegmentRule;
}

export const UtmContentRule = ({
	onRuleChange,
	existingRule,
}: UtmContentRuleProps) => {
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
	const ruleType = RULE_TYPE_DEFINITIONS.utmContent;

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
				label = `UTM Content ${operatorLabel} ${currentValue.join(", ")}`;
			} else {
				label = `UTM Content ${operatorLabel} ${currentValue}`;
			}

			onRuleChange({
				ruleType: "utmContent",
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
				ruleType="utmContent"
				description="Choose how to filter visitors by UTM content"
			/>

			<HybridSelectValue
				label="UTM Content"
				value={value}
				onChange={(newValue) => handleChange(undefined, newValue)}
				options={ruleType.options || []}
				placeholder="Enter content identifier"
				customInputPlaceholder="e.g., banner-top, sidebar-ad, version-a"
				multiple={ruleType.operatorValueTypes?.[operator] === "array"}
				description="Enter the content identifiers for A/B testing or ad differentiation."
			/>

			<InfoBox variant="info" iconPlacement="top">
				Target visitors based on UTM content parameters. This is used to
				differentiate between similar content or links within the same campaign,
				such as different ad variations or CTA buttons.
			</InfoBox>
		</div>
	);
};
