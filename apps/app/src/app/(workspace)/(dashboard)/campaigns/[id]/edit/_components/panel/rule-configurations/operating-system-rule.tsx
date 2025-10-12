"use client";

import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { useState } from "react";
import type {
	FilterOperator,
	SegmentRule,
} from "@/components/canvas/campaign/nodes/campaign/types";
import { getOperatorLabel, RULE_TYPE_DEFINITIONS } from "../helpers/rule-types";
import { MultiSelectValue, SingleSelectValue } from "../value-selectors";
import { FilterOperatorSelector } from "../value-selectors/filter-operator-selector";

interface OperatingSystemRuleProps {
	onRuleChange: (rule: Partial<SegmentRule>) => void;
	existingRule?: SegmentRule;
}

export const OperatingSystemRule = ({
	onRuleChange,
	existingRule,
}: OperatingSystemRuleProps) => {
	const [operator, setOperator] = useState<FilterOperator>(
		existingRule?.operator || "equals",
	);
	const [singleValue, setSingleValue] = useState<string>(() => {
		if (existingRule && !Array.isArray(existingRule.value)) {
			return String(existingRule.value || "");
		}
		return "";
	});
	const [multipleValues, setMultipleValues] = useState<string[]>(() => {
		if (existingRule && Array.isArray(existingRule.value)) {
			return existingRule.value.map(String);
		}
		return [];
	});
	const ruleType = RULE_TYPE_DEFINITIONS.operatingSystem;

	const currentValueType = ruleType.operatorValueTypes?.[operator];
	const isMultiSelect = currentValueType === "array";

	const handleChange = (
		newOperator?: FilterOperator,
		newValue?: string | string[],
	) => {
		const currentOperator = newOperator || operator;
		const currentIsMultiSelect =
			ruleType.operatorValueTypes?.[currentOperator] === "array";

		if (newOperator) setOperator(newOperator);

		let finalValue: string | string[];
		if (currentIsMultiSelect) {
			finalValue = Array.isArray(newValue) ? newValue : multipleValues;
		} else {
			finalValue = typeof newValue === "string" ? newValue : singleValue;
		}

		if (
			(Array.isArray(finalValue) && finalValue.length > 0) ||
			(!Array.isArray(finalValue) && finalValue)
		) {
			const valueLabels = Array.isArray(finalValue)
				? finalValue
						.map((val) => {
							const option = ruleType.options?.find((opt) => opt.value === val);
							return option ? option.label : val;
						})
						.join(", ")
				: (() => {
						const option = ruleType.options?.find(
							(opt) => opt.value === finalValue,
						);
						return option ? option.label : finalValue;
					})();

			const operatorLabel = getOperatorLabel(currentOperator);

			onRuleChange({
				ruleType: "operatingSystem",
				operator: currentOperator,
				value: finalValue,
				label: `Operating System ${operatorLabel} ${valueLabels}`,
			});
		}
	};

	const handleOperatorChange = (newOperator: FilterOperator) => {
		const newValueType = ruleType.operatorValueTypes?.[newOperator];
		const oldValueType = ruleType.operatorValueTypes?.[operator];

		setOperator(newOperator);

		// Clear values when switching between single/multi select
		if (newValueType === "array" && oldValueType !== "array") {
			setSingleValue("");
			handleChange(newOperator, multipleValues);
		} else if (newValueType !== "array" && oldValueType === "array") {
			setMultipleValues([]);
			handleChange(newOperator, singleValue);
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
				ruleType="operatingSystem"
				description="Choose how to filter visitors by operating system"
			/>

			{isMultiSelect ? (
				<MultiSelectValue
					label="Select Operating Systems"
					values={multipleValues}
					onChange={(values) => {
						setMultipleValues(values);
						handleChange(undefined, values);
					}}
					options={ruleType.options || []}
					placeholder="Select one or more operating systems"
					description="Choose operating systems to target. You can select multiple options."
				/>
			) : (
				<SingleSelectValue
					label="Select Operating System"
					value={singleValue}
					onChange={(value) => {
						setSingleValue(value);
						handleChange(undefined, value);
					}}
					options={ruleType.options || []}
					placeholder="Select an operating system"
				/>
			)}

			<InfoBox variant="info" iconPlacement="top">
				Target users based on their operating system. This helps deliver
				platform-specific experiences or features.
			</InfoBox>
		</div>
	);
};
