import type { SegmentRule } from "@/components/canvas/campaign/nodes/campaign/types";
import { nanoid } from "nanoid";

export const createDefaultVisitorTypeRule = (): SegmentRule => {
  return {
    id: `rule-${nanoid(8)}`,
    ruleType: "visitorType",
    operator: "equals",
    value: "all",
    label: "Visitor Type: All Visitors",
    isRequired: true,
  };
};

export const getDefaultSegmentRules = (): SegmentRule[] => {
  return [createDefaultVisitorTypeRule()];
};
