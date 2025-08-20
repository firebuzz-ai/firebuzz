"use client";

import type { SegmentRule } from "@/components/canvas/campaign/nodes/campaign/types";
import { useState } from "react";
import { RULE_TYPE_DEFINITIONS } from "../helpers/rule-types";
import { EUCountrySelector } from "../value-selectors/eu-country-selector";

interface IsEUCountryRuleProps {
	onRuleChange: (rule: Partial<SegmentRule>) => void;
	existingRule?: SegmentRule;
}

export const IsEUCountryRule = ({
	onRuleChange,
	existingRule,
}: IsEUCountryRuleProps) => {
	const [value, setValue] = useState<string>(
		existingRule && typeof existingRule.value === "boolean"
			? String(existingRule.value)
			: "",
	);
	const ruleType = RULE_TYPE_DEFINITIONS.isEUCountry;

	const handleValueChange = (newValue: string) => {
		setValue(newValue);

		if (newValue) {
			const selectedOption = ruleType.options?.find(
				(opt) => opt.value === newValue,
			);
			const label = selectedOption ? selectedOption.label : newValue;

			onRuleChange({
				ruleType: "isEUCountry",
				operator: "equals",
				value: newValue === "true",
				label: `EU Country: ${label}`,
			});
		}
	};

	return (
		<div className="space-y-4">
			<EUCountrySelector
				label="Select EU Status"
				value={value}
				onChange={handleValueChange}
				description="Target visitors based on whether they are from an EU country for GDPR compliance."
			/>
		</div>
	);
};
