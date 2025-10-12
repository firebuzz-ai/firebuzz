"use client";

import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { useState } from "react";
import type {
	FilterOperator,
	SegmentRule,
} from "@/components/canvas/campaign/nodes/campaign/types";
import { getOperatorLabel, RULE_TYPE_DEFINITIONS } from "../helpers/rule-types";
import { ComboboxSelectValue, MultiSelectValue } from "../value-selectors";
import { FilterOperatorSelector } from "../value-selectors/filter-operator-selector";

interface CountryRuleProps {
	onRuleChange: (rule: Partial<SegmentRule>) => void;
	existingRule?: SegmentRule;
}

export const CountryRule = ({
	onRuleChange,
	existingRule,
}: CountryRuleProps) => {
	const [operator, setOperator] = useState<FilterOperator>(
		existingRule?.operator || "equals",
	);
	const [selectedCountries, setSelectedCountries] = useState<string[]>(() => {
		if (existingRule && Array.isArray(existingRule.value)) {
			return existingRule.value.map(String);
		}
		return [];
	});
	const [selectedCountry, setSelectedCountry] = useState<string>(
		existingRule && !Array.isArray(existingRule.value)
			? String(existingRule.value)
			: "",
	);

	const ruleType = RULE_TYPE_DEFINITIONS.country;

	const handleChange = (
		newOperator?: FilterOperator,
		newValue?: string | string[],
	) => {
		const currentOperator = newOperator || operator;
		const isMultiSelect =
			currentOperator === "in" || currentOperator === "not_in";

		if (newOperator) setOperator(newOperator);

		let finalValue: string | string[];
		let label = "";

		if (isMultiSelect) {
			finalValue = Array.isArray(newValue) ? newValue : selectedCountries;
			const countryLabels = finalValue.map((code) => {
				const country = ruleType.options?.find((opt) => opt.value === code);
				return country ? country.label : code;
			});
			const operatorLabel = getOperatorLabel(currentOperator);
			label = `Country ${operatorLabel} ${countryLabels.join(", ")}`;
		} else {
			finalValue = typeof newValue === "string" ? newValue : selectedCountry;
			const country = ruleType.options?.find((opt) => opt.value === finalValue);
			const countryLabel = country ? country.label : finalValue;
			const operatorLabel = getOperatorLabel(currentOperator);
			label = `Country ${operatorLabel} ${countryLabel}`;
		}

		if (
			finalValue &&
			(Array.isArray(finalValue) ? finalValue.length > 0 : true)
		) {
			onRuleChange({
				ruleType: "country",
				operator: currentOperator,
				value: finalValue,
				label,
			});
		}
	};

	const handleOperatorChange = (newOperator: FilterOperator) => {
		setOperator(newOperator);
		// Clear values when switching between single/multi select
		if (newOperator === "in" || newOperator === "not_in") {
			setSelectedCountry("");
			handleChange(newOperator, selectedCountries);
		} else {
			setSelectedCountries([]);
			handleChange(newOperator, selectedCountry);
		}
	};

	return (
		<div className="space-y-4">
			<FilterOperatorSelector
				label="Filter Condition"
				value={operator}
				onChange={handleOperatorChange}
				supportedOperators={ruleType.supportedOperators}
				ruleType="country"
				description="Choose how to filter visitors by country"
			/>

			{operator === "in" || operator === "not_in" ? (
				<MultiSelectValue
					label="Select Countries"
					values={selectedCountries}
					onChange={(values) => {
						setSelectedCountries(values);
						handleChange(undefined, values);
					}}
					options={ruleType.options || []}
					placeholder="Select one or more countries"
					description="Choose countries to target. You can select multiple options."
				/>
			) : (
				<ComboboxSelectValue
					label="Select Country"
					value={selectedCountry}
					onChange={(val: string) => {
						setSelectedCountry(val);
						handleChange(undefined, val);
					}}
					options={ruleType.options || []}
					placeholder="Select a country"
					searchPlaceholder="Search countries..."
					emptyMessage="No country found."
				/>
			)}

			<InfoBox variant="info" iconPlacement="top">
				Target visitors from specific countries. Use "is one of" or "is not one
				of" to select multiple countries at once.
			</InfoBox>
		</div>
	);
};
