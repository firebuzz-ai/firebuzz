"use client";

import type {
  RuleTypeId,
  SegmentNode,
  SegmentRule,
} from "@/components/canvas/campaign/nodes/campaign/types";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Label } from "@firebuzz/ui/components/ui/label";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import { ArrowLeft } from "@firebuzz/ui/icons/lucide";
import { useReactFlow } from "@xyflow/react";
import { nanoid } from "nanoid";
import { useState } from "react";
import { RULE_TYPE_DEFINITIONS } from "../helpers/rule-types";
import { BrowserRule } from "../rule-configurations/browser-rule";
import { CountryRule } from "../rule-configurations/country-rule";
import { CustomParameterRule } from "../rule-configurations/custom-parameter-rule";
import { DayOfWeekRule } from "../rule-configurations/day-of-week-rule";
import { DeviceTypeRule } from "../rule-configurations/device-type-rule";
import { GenericRule } from "../rule-configurations/generic-rule";
import { HourOfDayRule } from "../rule-configurations/hour-of-day-rule";
import { LanguageRule } from "../rule-configurations/language-rule";
import { OperatingSystemRule } from "../rule-configurations/operating-system-rule";
import { ReferrerRule } from "../rule-configurations/referrer-rule";
import { TimeZoneRule } from "../rule-configurations/time-zone-rule";
import { UtmMediumRule } from "../rule-configurations/utm-medium-rule";
import { UtmSourceRule } from "../rule-configurations/utm-source-rule";
import { VisitorTypeRule } from "../rule-configurations/visitor-type-rule";

interface RuleConfigurationPanelProps {
  node: SegmentNode;
  ruleTypeId: RuleTypeId;
  onBack: () => void;
  existingRule?: SegmentRule;
}

export const RuleConfigurationPanel = ({
  node,
  ruleTypeId,
  onBack,
  existingRule,
}: RuleConfigurationPanelProps) => {
  const { updateNodeData } = useReactFlow();
  const ruleType = RULE_TYPE_DEFINITIONS[ruleTypeId];
  const [currentRule, setCurrentRule] = useState<
    Partial<SegmentRule> | undefined
  >(existingRule);
  const [createdRuleId, setCreatedRuleId] = useState<string | null>(null);

  const updateSegmentData = (updates: Partial<typeof node.data>) => {
    updateNodeData(node.id, updates);
  };

  const handleRuleChange = (rule: Partial<SegmentRule>) => {
    setCurrentRule(rule);

    // For existing rules or already created rules, update immediately
    if ((existingRule || createdRuleId) && rule.value !== undefined) {
      const ruleToUpdate = existingRule || 
        node.data.rules.find(r => r.id === createdRuleId);
      
      if (ruleToUpdate) {
        const updatedRule: SegmentRule = {
          ...ruleToUpdate,
          operator: rule.operator || ruleToUpdate.operator,
          value: rule.value,
          label: rule.label || ruleToUpdate.label,
        };
        updateSegmentData({
          rules: node.data.rules.map((r) =>
            r.id === updatedRule.id ? updatedRule : r
          ),
        });
      }
    }
    // For new rules, add immediately when all required fields are present
    else if (
      !existingRule &&
      !createdRuleId &&
      rule.value !== undefined &&
      rule.operator &&
      rule.label
    ) {
      const newRuleId = `rule-${nanoid(8)}`;
      const newRule: SegmentRule = {
        id: newRuleId,
        ruleType: ruleTypeId,
        operator: rule.operator,
        value: rule.value,
        label: rule.label,
      };

      setCreatedRuleId(newRuleId);
      updateSegmentData({
        rules: [...node.data.rules, newRule],
      });
    }
  };

  const deleteRule = () => {
    if (existingRule) {
      if (existingRule.isRequired) {
        return;
      }

      updateSegmentData({
        rules: node.data.rules.filter((rule) => rule.id !== existingRule.id),
      });

      onBack();
    }
  };

  const renderRuleComponent = () => {
    switch (ruleTypeId) {
      case "visitorType":
        return (
          <VisitorTypeRule
            onRuleChange={handleRuleChange}
            existingRule={existingRule}
          />
        );
      case "deviceType":
        return (
          <DeviceTypeRule
            onRuleChange={handleRuleChange}
            existingRule={existingRule}
          />
        );
      case "country":
        return (
          <CountryRule
            onRuleChange={handleRuleChange}
            existingRule={existingRule}
          />
        );
      case "language":
        return (
          <LanguageRule
            onRuleChange={handleRuleChange}
            existingRule={existingRule}
          />
        );
      case "browser":
        return (
          <BrowserRule
            onRuleChange={handleRuleChange}
            existingRule={existingRule}
          />
        );
      case "operatingSystem":
        return (
          <OperatingSystemRule
            onRuleChange={handleRuleChange}
            existingRule={existingRule}
          />
        );
      case "utmSource":
        return (
          <UtmSourceRule
            onRuleChange={handleRuleChange}
            existingRule={existingRule}
          />
        );
      case "utmMedium":
        return (
          <UtmMediumRule
            onRuleChange={handleRuleChange}
            existingRule={existingRule}
          />
        );
      case "referrer":
        return (
          <ReferrerRule
            onRuleChange={handleRuleChange}
            existingRule={existingRule}
          />
        );
      case "customParameter":
        return (
          <CustomParameterRule
            onRuleChange={handleRuleChange}
            existingRule={existingRule}
          />
        );
      case "timeZone":
        return (
          <TimeZoneRule
            onRuleChange={handleRuleChange}
            existingRule={existingRule}
          />
        );
      case "hourOfDay":
        return (
          <HourOfDayRule
            onRuleChange={handleRuleChange}
            existingRule={existingRule}
          />
        );
      case "dayOfWeek":
        return (
          <DayOfWeekRule
            onRuleChange={handleRuleChange}
            existingRule={existingRule}
          />
        );
      default:
        return (
          <GenericRule
            ruleTypeId={ruleTypeId}
            onRuleChange={handleRuleChange}
            existingRule={existingRule}
          />
        );
    }
  };

  const isFormValid = () => {
    return (
      currentRule && currentRule.value !== undefined && currentRule.value !== ""
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header - Fixed */}
      <div className="flex flex-shrink-0 gap-3 items-center p-4 border-b bg-muted">
        <Button
          size="iconSm"
          variant="outline"
          onClick={onBack}
          className="!px-2 !py-2 !h-auto rounded-lg border bg-brand/10 border-brand text-brand hover:bg-brand/5 hover:text-brand"
        >
          <ArrowLeft className="size-4" />
        </Button>

        <div className="flex-1">
          <div className="flex flex-col">
            <div className="text-lg font-semibold leading-tight">
              {existingRule ? "Edit" : "Configure"} {ruleType.label} Rule
            </div>
            <div className="text-sm leading-tight text-muted-foreground">
              {existingRule ? "Update conditions for" : "Set conditions for"}{" "}
              {ruleType.label.toLowerCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="overflow-y-auto flex-1">
        <div className="p-4 space-y-6">
          {/* Rule Component */}
          {renderRuleComponent()}

          {/* Rule Preview */}
          {isFormValid() && currentRule && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Rule Preview</Label>
                <div className="p-3 rounded border bg-muted">
                  <span className="text-sm font-medium">
                    {currentRule.label}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Delete Button - Only show when editing existing rule */}
          {existingRule && !existingRule.isRequired && (
            <div className="flex justify-end mt-4 w-full">
              <Button
                onClick={deleteRule}
                size="sm"
                variant="ghost"
                type="button"
                disabled={existingRule.isRequired}
                className="flex-1 text-destructive hover:bg-destructive/10"
              >
                Delete Rule
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
