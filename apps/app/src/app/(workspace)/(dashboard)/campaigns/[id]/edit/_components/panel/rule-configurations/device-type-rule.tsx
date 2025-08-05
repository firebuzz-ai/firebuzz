"use client";

import type {
	FilterOperator,
	SegmentRule,
} from "@/components/canvas/campaign/nodes/campaign/types";
import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { useState } from "react";
import {
	RULE_TYPE_DEFINITIONS,
	getOperatorLabel,
	getValueTypeForOperator,
} from "../helpers/rule-types";
import { MultiSelectValue, SingleSelectValue } from "../value-selectors";
import { FilterOperatorSelector } from "../value-selectors/filter-operator-selector";

interface DeviceTypeRuleProps {
	onRuleChange: (rule: Partial<SegmentRule>) => void;
	existingRule?: SegmentRule;
}

export const DeviceTypeRule = ({
	onRuleChange,
	existingRule,
}: DeviceTypeRuleProps) => {
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

	const ruleType = RULE_TYPE_DEFINITIONS.deviceType;
	const currentValueType = getValueTypeForOperator(ruleType, operator);
	const isMultiSelect = currentValueType === "array";

	const handleChange = (
		newOperator?: FilterOperator,
		newValue?: string | string[],
	) => {
		const currentOperator = newOperator || operator;
		const currentIsMultiSelect =
			getValueTypeForOperator(ruleType, currentOperator) === "array";

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
				ruleType: "deviceType",
				operator: currentOperator,
				value: finalValue,
				label: `Device Type ${operatorLabel} ${valueLabels}`,
			});
		}
	};

	const handleOperatorChange = (newOperator: FilterOperator) => {
		const newValueType = getValueTypeForOperator(ruleType, newOperator);
		const oldValueType = getValueTypeForOperator(ruleType, operator);

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
				ruleType="deviceType"
				description="Choose how to filter visitors by device type"
			/>

			{isMultiSelect ? (
				<MultiSelectValue
					label="Select Device Types"
					values={multipleValues}
					onChange={(values) => {
						setMultipleValues(values);
						handleChange(undefined, values);
					}}
					options={ruleType.options || []}
					placeholder="Select one or more device types"
					description="Choose device types to target. You can select multiple options."
				/>
			) : (
				<SingleSelectValue
					label="Select Device Type"
					value={singleValue}
					onChange={(value) => {
						setSingleValue(value);
						handleChange(undefined, value);
					}}
					options={ruleType.options || []}
					placeholder="Select a device type"
				/>
			)}

			<InfoBox variant="info" iconPlacement="top">
				Target users based on their device type. Mobile includes phones, Desktop
				includes computers, and Tablet includes iPad and similar devices.
			</InfoBox>
		</div>
	);
};
