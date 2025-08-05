"use client";

import type {
	FilterOperator,
	SegmentRule,
} from "@/components/canvas/campaign/nodes/campaign/types";
import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Label } from "@firebuzz/ui/components/ui/label";
import { useState } from "react";
import { RULE_TYPE_DEFINITIONS, getOperatorLabel } from "../helpers/rule-types";
import { FilterOperatorSelector } from "../value-selectors/filter-operator-selector";
import { HybridSelectValue } from "../value-selectors/hybrid-select-value";

interface CustomParameterRuleProps {
	onRuleChange: (rule: Partial<SegmentRule>) => void;
	existingRule?: SegmentRule;
}

export const CustomParameterRule = ({
	onRuleChange,
	existingRule,
}: CustomParameterRuleProps) => {
	const [operator, setOperator] = useState<FilterOperator>(
		existingRule?.operator || "equals",
	);
	const [paramName, setParamName] = useState<string>(() => {
		if (existingRule && typeof existingRule.value === "string") {
			const [name] = existingRule.value.split("=");
			return name || "";
		}
		return "";
	});
	const ruleType = RULE_TYPE_DEFINITIONS.customParameter;
	const [paramValue, setParamValue] = useState<string | string[]>(() => {
		if (existingRule && typeof existingRule.value === "string") {
			// Parse existing value (format: "param=value" or "param=value1,value2,...")
			const [, ...valueParts] = existingRule.value.split("=");
			if (valueParts.length > 0) {
				const valueString = valueParts.join("=");
				const operatorValueType =
					ruleType.operatorValueTypes?.[existingRule.operator];

				if (operatorValueType === "array") {
					return valueString.split(",").map((v) => v.trim());
				}
				return valueString;
			}
		}
		return "";
	});

	const handleChange = (
		newOperator?: FilterOperator,
		newParamName?: string,
		newParamValue?: string | string[],
	) => {
		const currentOperator = newOperator || operator;
		const currentParamName =
			newParamName !== undefined ? newParamName : paramName;
		const currentParamValue =
			newParamValue !== undefined ? newParamValue : paramValue;

		if (newOperator) setOperator(newOperator);
		if (newParamName !== undefined) setParamName(newParamName);
		if (newParamValue !== undefined) setParamValue(newParamValue);

		if (
			currentParamName &&
			currentParamValue &&
			(Array.isArray(currentParamValue)
				? currentParamValue.length > 0
				: currentParamValue)
		) {
			const operatorLabel = getOperatorLabel(currentOperator);
			let fullValue: string;
			let label: string;

			if (Array.isArray(currentParamValue)) {
				fullValue = `${currentParamName}=${currentParamValue.join(",")}`;
				label = `URL Parameter "${currentParamName}" ${operatorLabel} [${currentParamValue.join(", ")}]`;
			} else {
				fullValue = `${currentParamName}=${currentParamValue}`;
				label = `URL Parameter "${currentParamName}" ${operatorLabel} "${currentParamValue}"`;
			}

			onRuleChange({
				ruleType: "customParameter",
				operator: currentOperator,
				value: fullValue,
				label,
			});
		}
	};

	const handleOperatorChange = (newOperator: FilterOperator) => {
		const operatorValueType = ruleType.operatorValueTypes?.[newOperator];
		const isMultiSelect = operatorValueType === "array";

		// Convert value type when switching operators
		if (isMultiSelect && !Array.isArray(paramValue)) {
			const newValue = paramValue ? [String(paramValue)] : [];
			handleChange(newOperator, undefined, newValue);
		} else if (!isMultiSelect && Array.isArray(paramValue)) {
			const newValue = paramValue.length > 0 ? String(paramValue[0]) : "";
			handleChange(newOperator, undefined, newValue);
		} else {
			handleChange(newOperator, undefined, paramValue);
		}
	};

	return (
		<div className="space-y-4">
			<FilterOperatorSelector
				label="Filter Condition"
				value={operator}
				onChange={handleOperatorChange}
				supportedOperators={ruleType.supportedOperators}
				ruleType="customParameter"
				description="Choose how to filter visitors by custom parameters"
			/>

			<div className="space-y-2">
				<Label>Parameter Name</Label>
				<Input
					type="text"
					className="h-8"
					placeholder="e.g., ref, campaign_id, source"
					value={paramName}
					onChange={(e) => handleChange(undefined, e.target.value, undefined)}
				/>
			</div>

			<HybridSelectValue
				label="Parameter Value"
				value={paramValue}
				onChange={(newValue) => handleChange(undefined, undefined, newValue)}
				options={[]} // No predefined options for custom parameters
				placeholder="Enter parameter value"
				customInputPlaceholder="e.g., summer2024, partner123, affiliate"
				multiple={ruleType.operatorValueTypes?.[operator] === "array"}
				description="Enter the value(s) that the parameter should match."
			/>

			<InfoBox variant="info" iconPlacement="top">
				Target visitors based on custom URL parameters. This is useful for
				tracking specific campaigns, partners, or custom identifiers in your
				URLs.
			</InfoBox>
		</div>
	);
};
