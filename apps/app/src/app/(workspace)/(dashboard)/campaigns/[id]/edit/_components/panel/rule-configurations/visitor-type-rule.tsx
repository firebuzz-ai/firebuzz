"use client";

import type { SegmentRule } from "@/components/canvas/campaign/nodes/campaign/types";
import { useState } from "react";
import { RULE_TYPE_DEFINITIONS } from "../helpers/rule-types";
import { VisitorTypeSelector } from "../value-selectors/visitor-type-selector";

interface VisitorTypeRuleProps {
	onRuleChange: (rule: Partial<SegmentRule>) => void;
	existingRule?: SegmentRule;
}

export const VisitorTypeRule = ({
	onRuleChange,
	existingRule,
}: VisitorTypeRuleProps) => {
	const [value, setValue] = useState<string>(
		existingRule && typeof existingRule.value === "string"
			? existingRule.value
			: "",
	);
	const ruleType = RULE_TYPE_DEFINITIONS.visitorType;

	const handleValueChange = (newValue: string) => {
		setValue(newValue);

		if (newValue) {
			const selectedOption = ruleType.options?.find(
				(opt) => opt.value === newValue,
			);
			const label = selectedOption ? selectedOption.label : newValue;

			onRuleChange({
				ruleType: "visitorType",
				operator: "equals",
				value: newValue,
				label: `Visitor Type: ${label}`,
			});
		}
	};

	return (
		<div className="space-y-4">
			<VisitorTypeSelector
				label="Select Visitor Type"
				value={value}
				onChange={handleValueChange}
				description="Target visitors based on their visit history to personalize their experience."
			/>
		</div>
	);
};
