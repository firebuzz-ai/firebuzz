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
import { DayOfWeekSelector } from "../value-selectors";
import { FilterOperatorSelector } from "../value-selectors/filter-operator-selector";

interface DayOfWeekRuleProps {
  onRuleChange: (rule: Partial<SegmentRule>) => void;
  existingRule?: SegmentRule;
}

export const DayOfWeekRule = ({
  onRuleChange,
  existingRule,
}: DayOfWeekRuleProps) => {
  const [operator, setOperator] = useState<FilterOperator>(
    existingRule?.operator || "equals"
  );
  const [value, setValue] = useState<string | string[]>(() => {
    if (existingRule) {
      if (Array.isArray(existingRule.value)) {
        return existingRule.value.map(String);
      }

      if (typeof existingRule.value === "string") {
        return existingRule.value;
      }
    }
    return "";
  });

  const ruleType = RULE_TYPE_DEFINITIONS.dayOfWeek;
  const currentValueType = getValueTypeForOperator(ruleType, operator);
  const isMultiSelect = currentValueType === "array";

  const handleChange = (
    newOperator?: FilterOperator,
    newValue?: string | string[] | boolean | number | number[]
  ) => {
    const currentOperator = newOperator || operator;
    const currentIsMultiSelect =
      getValueTypeForOperator(ruleType, currentOperator) === "array";

    if (newOperator) setOperator(newOperator);

    // Convert value to appropriate type
    let finalValue: string | string[];
    if (Array.isArray(newValue)) {
      finalValue = newValue.map(String);
    } else if (typeof newValue === "string") {
      finalValue = newValue;
    } else {
      finalValue = value;
    }

    if (newValue !== undefined) setValue(finalValue);

    // Ensure value matches operator type
    if (currentIsMultiSelect && !Array.isArray(finalValue)) {
      finalValue = finalValue ? [finalValue] : [];
    } else if (!currentIsMultiSelect && Array.isArray(finalValue)) {
      finalValue = finalValue[0] || "";
    }

    if (
      (Array.isArray(finalValue) && finalValue.length > 0) ||
      (!Array.isArray(finalValue) && finalValue)
    ) {
      const valueLabels = Array.isArray(finalValue)
        ? finalValue
            .map((val) => {
              const day = ruleType.options?.find((opt) => opt.value === val);
              return day ? day.label : val;
            })
            .join(", ")
        : (() => {
            const day = ruleType.options?.find(
              (opt) => opt.value === finalValue
            );
            return day ? day.label : finalValue;
          })();

      const operatorLabel = getOperatorLabel(currentOperator);

      onRuleChange({
        ruleType: "dayOfWeek",
        operator: currentOperator,
        value: finalValue,
        label: `Day of Week ${operatorLabel} ${valueLabels}`,
      });
    }
  };

  const handleOperatorChange = (newOperator: FilterOperator) => {
    const newValueType = getValueTypeForOperator(ruleType, newOperator);
    const oldValueType = getValueTypeForOperator(ruleType, operator);

    setOperator(newOperator);

    // Clear or adjust values when switching between single/multi select
    if (newValueType === "array" && oldValueType !== "array") {
      const currentValue = typeof value === "string" && value ? [value] : [];
      setValue(currentValue);
      handleChange(newOperator, currentValue);
    } else if (newValueType !== "array" && oldValueType === "array") {
      const currentValue =
        Array.isArray(value) && value.length > 0 ? value[0] : "";
      setValue(currentValue);
      handleChange(newOperator, currentValue);
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
        ruleType="dayOfWeek"
        description="Choose how to filter visitors by day of week"
      />

      <DayOfWeekSelector
        label="Select Days"
        value={value}
        onChange={(newValue) => handleChange(undefined, newValue)}
        multiple={isMultiSelect}
        description={
          isMultiSelect
            ? "Select multiple days of the week to target visitors on those specific days."
            : "Select a specific day of the week to target visitors."
        }
        showWeekendHighlight={true}
      />

      <InfoBox variant="info" iconPlacement="top">
        Target visitors on specific days of the week. Perfect for day-specific
        promotions or content scheduling.
      </InfoBox>
    </div>
  );
};
