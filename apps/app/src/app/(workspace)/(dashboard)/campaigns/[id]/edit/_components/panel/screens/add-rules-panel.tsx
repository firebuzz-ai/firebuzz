"use client";

import type {
  RuleTypeId,
  SegmentNode,
} from "@/components/canvas/campaign/nodes/campaign/types";
import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Label } from "@firebuzz/ui/components/ui/label";
import { ArrowLeft, ArrowRight, Search, X } from "@firebuzz/ui/icons/lucide";
import { useState } from "react";
import { RULE_TYPE_DEFINITIONS } from "../helpers/rule-types";
import { RuleConfigurationPanel } from "./rule-configuration-panel";

interface AddRulesPanelProps {
  node: SegmentNode;
  onBack: () => void;
}

export const AddRulesPanel = ({ node, onBack }: AddRulesPanelProps) => {
  const [selectedRuleType, setSelectedRuleType] = useState<RuleTypeId | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Get rule types that are already in use
  const existingRuleTypes = new Set(
    node.data.rules.map((rule) => rule.ruleType)
  );

  // Filter rule types based on search query and exclude already used ones (except customParameter)
  const filteredRuleTypes = Object.values(RULE_TYPE_DEFINITIONS).filter(
    (ruleType) =>
      // Allow multiple custom parameter rules, restrict others
      (ruleType.id === "customParameter" ||
        !existingRuleTypes.has(ruleType.id)) &&
      (ruleType.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ruleType.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ruleType.valueType.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (selectedRuleType) {
    return (
      <RuleConfigurationPanel
        node={node}
        ruleTypeId={selectedRuleType}
        onBack={() => setSelectedRuleType(null)}
        onAddRule={() => onBack()} // Go directly back to segment panel after adding rule
      />
    );
  }

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
              Rule Types
            </div>
            <div className="text-sm leading-tight text-muted-foreground">
              Select a rule to configure
            </div>
          </div>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="overflow-y-auto flex-1">
        <div className="p-4 space-y-6">
          {/* Search */}
          <div className="space-y-2">
            <Label>Search Rule Types</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-3 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name, type, or value..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearchQuery("");
                  }
                }}
                className="pr-10 pl-10 h-8"
              />
              {searchQuery && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 top-1/2 p-0 w-6 h-6 transform -translate-y-1/2"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {/* All Rule Types */}
          <div className="space-y-3">
            <Label>
              {searchQuery
                ? `${filteredRuleTypes.length} matching`
                : "Available"}{" "}
              Rule Types
            </Label>
            <div className="grid grid-cols-1 gap-2">
              {filteredRuleTypes.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  {searchQuery ? (
                    <>
                      <Search className="mx-auto mb-2 w-8 h-8" />
                      <p className="text-sm">
                        No available rule types found matching "{searchQuery}"
                      </p>
                      <p className="mt-1 text-xs">
                        Try searching for visitor, device, country, etc.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="p-3 mx-auto mb-2 rounded-full bg-muted w-fit">
                        <X className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-medium">
                        All rule types are already in use
                      </p>
                      <p className="mt-1 text-xs">
                        You can only add one instance of each rule type per
                        segment.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={onBack}
                        className="mt-3"
                      >
                        <ArrowLeft className="mr-1 size-3" />
                        Back to Segment
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                filteredRuleTypes.map((ruleType) => (
                  <Button
                    key={ruleType.id}
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedRuleType(ruleType.id)}
                    className="justify-start p-2 h-auto group"
                  >
                    <div className="flex gap-3 justify-between items-center w-full">
                      <div className="flex gap-3 items-center">
                        <div className="p-2 rounded-md border bg-muted">
                          {ruleType.icon}
                        </div>
                        <div className="flex-1 leading-tight text-left">
                          <div className="text-sm font-medium leading-tight">
                            {ruleType.label}
                          </div>
                          <div className="text-xs leading-tight text-muted-foreground">
                            {ruleType.description}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-0 h-0 text-muted-foreground opacity-0 transition-all duration-200 ease-out group-hover:w-3.5 group-hover:h-3.5 group-hover:opacity-100 group-hover:translate-x-1 group-hover:text-foreground" />
                    </div>
                  </Button>
                ))
              )}
            </div>
          </div>

          <InfoBox variant="info" iconPlacement="top">
            <h4 className="font-medium text-primary">Rule System</h4>
            <ol className="space-y-1 text-sm list-decimal list-inside text-muted-foreground">
              <li>All rules in a segment must match (AND logic)</li>
              <li>
                Only one instance of each rule type per segment (except custom
                parameters)
              </li>
              <li>Each rule type supports different filter operators</li>
              <li>Configure precise conditions for your targeting needs</li>
            </ol>
          </InfoBox>
        </div>
      </div>
    </div>
  );
};
