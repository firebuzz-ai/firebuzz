"use client";

import type {
  FilterOperator,
  SegmentRule,
} from "@/components/canvas/campaign/nodes/campaign/types";
import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { useState } from "react";
import { RULE_TYPE_DEFINITIONS, getOperatorLabel } from "../helpers/rule-types";
import { FilterOperatorSelector } from "../value-selectors/filter-operator-selector";
import { MultiSelectValue } from "../value-selectors/multi-select-value";
import { SingleSelectValue } from "../value-selectors/single-select-value";

interface TimeZoneRuleProps {
  onRuleChange: (rule: Partial<SegmentRule>) => void;
  existingRule?: SegmentRule;
}

export const TimeZoneRule = ({
  onRuleChange,
  existingRule,
}: TimeZoneRuleProps) => {
  const [operator, setOperator] = useState<FilterOperator>(
    existingRule?.operator || "equals"
  );
  const [selectedTimezones, setSelectedTimezones] = useState<string[]>(() => {
    if (existingRule && Array.isArray(existingRule.value)) {
      return existingRule.value.map(String);
    }
    return [];
  });
  const [selectedTimezone, setSelectedTimezone] = useState<string>(
    existingRule && !Array.isArray(existingRule.value)
      ? String(existingRule.value)
      : ""
  );

  const ruleType = RULE_TYPE_DEFINITIONS.timeZone;

  const handleChange = (
    newOperator?: FilterOperator,
    newValue?: string | string[]
  ) => {
    const currentOperator = newOperator || operator;
    const isMultiSelect =
      currentOperator === "in" || currentOperator === "not_in";

    if (newOperator) setOperator(newOperator);

    let finalValue: string | string[];
    let label = "";

    if (isMultiSelect) {
      finalValue = Array.isArray(newValue) ? newValue : selectedTimezones;
      const timezoneLabels = finalValue.map((value) => {
        const timezone = ruleType.options?.find((opt) => opt.value === value);
        return timezone ? timezone.label : value;
      });
      const operatorLabel = getOperatorLabel(currentOperator);
      label = `Time Zone ${operatorLabel} ${timezoneLabels.join(", ")}`;
    } else {
      finalValue = typeof newValue === "string" ? newValue : selectedTimezone;
      const timezone = ruleType.options?.find(
        (opt) => opt.value === finalValue
      );
      const timezoneLabel = timezone ? timezone.label : finalValue;
      const operatorLabel = getOperatorLabel(currentOperator);
      label = `Time Zone ${operatorLabel} ${timezoneLabel}`;
    }

    if (
      finalValue &&
      (Array.isArray(finalValue) ? finalValue.length > 0 : true)
    ) {
      onRuleChange({
        ruleType: "timeZone",
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
      setSelectedTimezone("");
      handleChange(newOperator, selectedTimezones);
    } else {
      setSelectedTimezones([]);
      handleChange(newOperator, selectedTimezone);
    }
  };

  return (
    <div className="space-y-4">
      <FilterOperatorSelector
        label="Filter Condition"
        value={operator}
        onChange={handleOperatorChange}
        supportedOperators={ruleType.supportedOperators}
        ruleType="timeZone"
        description="Choose how to filter visitors by time zone"
      />

      {operator === "in" || operator === "not_in" ? (
        <MultiSelectValue
          label="Select Time Zones"
          values={selectedTimezones}
          onChange={(newValue) => {
            setSelectedTimezones(newValue);
            handleChange(undefined, newValue);
          }}
          options={ruleType.options || []}
          description="Select multiple time zones to target."
        />
      ) : (
        <SingleSelectValue
          label="Select Time Zone"
          value={selectedTimezone}
          onChange={(newValue) => {
            setSelectedTimezone(newValue);
            handleChange(undefined, newValue);
          }}
          options={ruleType.options || []}
          placeholder="Select a time zone"
          description="Select a time zone to target."
        />
      )}

      <InfoBox variant="info" iconPlacement="top">
        Target visitors based on their time zone. This helps deliver
        time-sensitive content or campaigns to the right audience at the right
        time.
      </InfoBox>
    </div>
  );
};
