import { vWorkflowId } from "@convex-dev/workflow";
import { defineTable } from "convex/server";
import { v } from "convex/values";
import { themeInsertSchema } from "../brands/themes/schema";

export const onboardingSchema = defineTable(
  v.object({
    step: v.number(),
    animationStep: v.number(),
    type: v.union(v.literal("project"), v.literal("workspace")),
    isProcessing: v.boolean(),
    isCompleted: v.boolean(),
    isTrialActive: v.boolean(),
    step1: v.optional(
      v.object({
        workflowId: v.optional(vWorkflowId),
        formData: v.optional(
          v.object({
            domain: v.string(),
          })
        ),
      })
    ),
    step2: v.optional(
      v.object({
        workflowId: v.optional(vWorkflowId),
        formData: v.optional(
          v.object({
            domain: v.string(),
            urls: v.array(v.string()),
          })
        ),
      })
    ),
    step3: v.optional(
      v.object({
        workflowId: v.optional(vWorkflowId),
        formData: v.optional(
          v.object({
            brandName: v.string(),
            brandDescription: v.string(),
            brandPersona: v.string(),
          })
        ),
      })
    ),
    step4: v.optional(
      v.object({
        workflowId: v.optional(vWorkflowId),
        formData: v.optional(
          v.object({
            logo: v.optional(v.string()),
            theme: v.optional(themeInsertSchema),
          })
        ),
      })
    ),
    step5: v.optional(
      v.object({
        formData: v.optional(
          v.object({
            selectedPlan: v.string(),
            stripePriceId: v.string(),
            checkoutSessionId: v.optional(v.string()),
          })
        ),
      })
    ),
    internalWorkflowIds: v.optional(
      v.object({
        themeWorkflowId: v.optional(vWorkflowId),
        marketingWorkflowId: v.optional(vWorkflowId),
      })
    ),
    error: v.optional(v.string()),
    // Relations
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    createdBy: v.id("users"),
  })
)
  .index("by_workspace_id", ["workspaceId"])
  .index("by_project_id", ["projectId"]);
