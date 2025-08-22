import { zid } from "convex-helpers/server/zod";
import { z } from "zod";
import {
  filterOperatorSchema,
  ruleTypeIdSchema,
  translationModeSchema,
} from "./schemas";

// Cleaned segment rule schema
export const cleanedSegmentRuleSchema = z.object({
  id: z.string(),
  ruleType: ruleTypeIdSchema,
  operator: filterOperatorSchema,
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.array(z.number()),
  ]),
  isRequired: z.boolean().optional(),
});

// Cleaned A/B test variant schema
export const cleanedABTestVariantSchema = z.object({
  id: z.string(),
  name: z.string(),
  landingPageId: zid("landingPages").optional(),
  trafficAllocation: z.number(),
  isControl: z.boolean(),
});

// Cleaned A/B test schema
export const cleanedABTestSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.union([
    z.literal("draft"),
    z.literal("running"),
    z.literal("completed"),
    z.literal("paused"),
  ]),
  hypothesis: z.string(),
  isCompleted: z.boolean(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  pausedAt: z.string().optional(),
  resumedAt: z.string().optional(),
  endDate: z.string().optional(),
  primaryMetric: z.string(),
  completionCriteria: z.object({
    sampleSizePerVariant: z.number(),
    testDuration: z.number(),
  }),
  confidenceLevel: z.union([z.literal(90), z.literal(95), z.literal(99)]),
  rules: z.object({
    winningStrategy: z.union([
      z.literal("winner"),
      z.literal("winnerOrControl"),
    ]),
  }),
  poolingPercent: z.number(),
  variants: z.array(cleanedABTestVariantSchema),
  winner: z.string().optional(),
});

// Cleaned segment schema
export const cleanedSegmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  priority: z.number(),
  primaryLandingPageId: z.string().optional(),
  translationMode: translationModeSchema,
  translations: z.array(
    z.object({
      language: z.string(),
      landingPageId: z.string(),
    })
  ),
  rules: z.array(cleanedSegmentRuleSchema),
  abTests: z.array(cleanedABTestSchema).optional(),
});
