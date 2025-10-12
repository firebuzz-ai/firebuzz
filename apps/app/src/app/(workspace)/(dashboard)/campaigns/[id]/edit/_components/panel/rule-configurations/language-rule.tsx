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

interface LanguageRuleProps {
	onRuleChange: (rule: Partial<SegmentRule>) => void;
	existingRule?: SegmentRule;
}

export const LanguageRule = ({
	onRuleChange,
	existingRule,
}: LanguageRuleProps) => {
	const [operator, setOperator] = useState<FilterOperator>(
		existingRule?.operator || "equals",
	);
	const [selectedLanguages, setSelectedLanguages] = useState<string[]>(() => {
		if (existingRule && Array.isArray(existingRule.value)) {
			return existingRule.value.map(String);
		}
		return [];
	});
	const [selectedLanguage, setSelectedLanguage] = useState<string>(
		existingRule && !Array.isArray(existingRule.value)
			? String(existingRule.value)
			: "",
	);

	const ruleType = RULE_TYPE_DEFINITIONS.language;

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
			finalValue = Array.isArray(newValue) ? newValue : selectedLanguages;
			const languageLabels = finalValue.map((code) => {
				const language = ruleType.options?.find((opt) => opt.value === code);
				return language ? language.label : code;
			});
			const operatorLabel = getOperatorLabel(currentOperator);
			label = `Language ${operatorLabel} ${languageLabels.join(", ")}`;
		} else {
			finalValue = typeof newValue === "string" ? newValue : selectedLanguage;
			const language = ruleType.options?.find(
				(opt) => opt.value === finalValue,
			);
			const languageLabel = language ? language.label : finalValue;
			const operatorLabel = getOperatorLabel(currentOperator);
			label = `Language ${operatorLabel} ${languageLabel}`;
		}

		if (
			finalValue &&
			(Array.isArray(finalValue) ? finalValue.length > 0 : true)
		) {
			onRuleChange({
				ruleType: "language",
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
			setSelectedLanguage("");
			handleChange(newOperator, selectedLanguages);
		} else {
			setSelectedLanguages([]);
			handleChange(newOperator, selectedLanguage);
		}
	};

	return (
		<div className="space-y-4">
			<FilterOperatorSelector
				label="Filter Condition"
				value={operator}
				onChange={handleOperatorChange}
				supportedOperators={ruleType.supportedOperators}
				ruleType="language"
				description="Choose how to filter visitors by language"
			/>

			{operator === "in" || operator === "not_in" ? (
				<MultiSelectValue
					label="Select Languages"
					values={selectedLanguages}
					onChange={(values) => {
						setSelectedLanguages(values);
						handleChange(undefined, values);
					}}
					options={ruleType.options || []}
					placeholder="Select one or more languages"
					description="Choose languages to target. You can select multiple options."
				/>
			) : (
				<ComboboxSelectValue
					label="Select Language"
					value={selectedLanguage}
					onChange={(val: string) => {
						setSelectedLanguage(val);
						handleChange(undefined, val);
					}}
					options={ruleType.options || []}
					placeholder="Select a language"
					searchPlaceholder="Search languages..."
					emptyMessage="No language found."
				/>
			)}

			<InfoBox variant="info" iconPlacement="top">
				Target visitors based on their browser language settings. This helps
				deliver content in the user's preferred language.
			</InfoBox>
		</div>
	);
};
