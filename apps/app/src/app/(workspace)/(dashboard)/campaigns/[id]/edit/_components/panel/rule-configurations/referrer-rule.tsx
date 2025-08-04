"use client";

import type {
  FilterOperator,
  SegmentRule,
} from "@/components/canvas/campaign/nodes/campaign/types";
import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { useState } from "react";
import { RULE_TYPE_DEFINITIONS, getOperatorLabel } from "../helpers/rule-types";
import { FilterOperatorSelector } from "../value-selectors/filter-operator-selector";
import { HybridSelectValue } from "../value-selectors/hybrid-select-value";

interface ReferrerRuleProps {
  onRuleChange: (rule: Partial<SegmentRule>) => void;
  existingRule?: SegmentRule;
}

export const ReferrerRule = ({
  onRuleChange,
  existingRule,
}: ReferrerRuleProps) => {
  const [operator, setOperator] = useState<FilterOperator>(
    existingRule?.operator || "contains"
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
  const ruleType = RULE_TYPE_DEFINITIONS.referrer;

  const handleChange = (
    newOperator?: FilterOperator,
    newValue?: string | string[]
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
        label = `Referrer ${operatorLabel} ${currentValue.join(", ")}`;
      } else {
        label = `Referrer ${operatorLabel} ${currentValue}`;
      }

      onRuleChange({
        ruleType: "referrer",
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
        ruleType="referrer"
        description="Choose how to filter visitors by referrer"
      />

      <HybridSelectValue
        label="Referrer URL"
        value={value}
        onChange={(newValue) => handleChange(undefined, newValue)}
        options={[]}
        placeholder="e.g., google.com, facebook.com, /blog"
        customInputPlaceholder="e.g., google.com, facebook.com, /blog"
        multiple={ruleType.operatorValueTypes?.[operator] === "array"}
        description="Enter a domain, full URL, or URL pattern to match"
      />

      <InfoBox variant="info" iconPlacement="top">
        Target visitors based on the referring website or page they came from.
        Use "contains" to match partial URLs or domains.
      </InfoBox>
    </div>
  );
};
