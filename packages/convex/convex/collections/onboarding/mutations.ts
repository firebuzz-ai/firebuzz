import { vWorkflowId } from "@convex-dev/workflow";
import { vResultValidator } from "@convex-dev/workpool";
import { hslToHex } from "@firebuzz/utils";
import { ConvexError, v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import { internalMutation, mutation } from "../../_generated/server";
import { workflow } from "../../components/workflows";
import { internalMutationWithTrigger } from "../../triggers";
import { ERRORS } from "../../utils/errors";
import { getCurrentUserWithWorkspace } from "../users/utils";
import { onboardingSchema } from "./schema";
import { generateThemeFromBrandColors, normalizeToDomain } from "./utils";

export const create = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    createdBy: v.id("users"),
    type: v.union(v.literal("project"), v.literal("workspace")),
    isTrialActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("onboarding", {
      workspaceId: args.workspaceId,
      projectId: args.projectId,
      isCompleted: false,
      step: 1,
      animationStep: 2,
      isProcessing: false,
      type: args.type,
      createdBy: args.createdBy,
      isTrialActive: args.isTrialActive ?? false,
    });
  },
});

export const update = internalMutation({
  args: {
    onboardingId: v.id("onboarding"),
    step: v.optional(v.number()),
    animationStep: v.optional(v.number()),
    isProcessing: v.optional(v.boolean()),
    step1: onboardingSchema.validator.fields.step1,
    step2: onboardingSchema.validator.fields.step2,
    step3: onboardingSchema.validator.fields.step3,
    step4: onboardingSchema.validator.fields.step4,
    step5: onboardingSchema.validator.fields.step5,
    internalWorkflowIds: onboardingSchema.validator.fields.internalWorkflowIds,
    isCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const updateObject: Partial<Doc<"onboarding">> = {};

    if (args.step) {
      updateObject.step = args.step;
    }

    if (args.animationStep) {
      updateObject.animationStep = args.animationStep;
    }

    if (args.isProcessing !== undefined) {
      updateObject.isProcessing = args.isProcessing;
    }

    if (args.step1) {
      updateObject.step1 = args.step1;
    }

    if (args.step2) {
      updateObject.step2 = args.step2;
    }

    if (args.step3) {
      updateObject.step3 = args.step3;
    }

    if (args.step4) {
      updateObject.step4 = args.step4;
    }

    if (args.step5) {
      updateObject.step5 = args.step5;
    }

    if (args.internalWorkflowIds) {
      updateObject.internalWorkflowIds = args.internalWorkflowIds;
    }

    if (args.isCompleted !== undefined) {
      updateObject.isCompleted = args.isCompleted;
    }

    await ctx.db.patch(args.onboardingId, updateObject);
  },
});

export const deleteByWorkspaceIdInternal = internalMutationWithTrigger({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const onboarding = await ctx.db
      .query("onboarding")
      .withIndex("by_workspace_id", (q) =>
        q.eq("workspaceId", args.workspaceId)
      )
      .filter((q) => q.eq(q.field("type"), "workspace"))
      .first();

    if (!onboarding) {
      return;
    }

    await ctx.db.delete(onboarding._id);
  },
});

export const deleteByProjectIdInternal = internalMutationWithTrigger({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const onboarding = await ctx.db
      .query("onboarding")
      .withIndex("by_project_id", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("type"), "project"))
      .first();

    if (!onboarding) {
      return;
    }

    await ctx.db.delete(onboarding._id);
  },
});

export const completeOnboarding = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const onboarding = await ctx.db
      .query("onboarding")
      .withIndex("by_workspace_id", (q) =>
        q.eq("workspaceId", args.workspaceId)
      )
      .first();

    if (!onboarding) {
      console.warn("No onboarding found for workspace", args.workspaceId);
      return;
    }

    await ctx.db.patch(onboarding._id, {
      isCompleted: true,
      animationStep: 13,
    });

    // Update the workspace
    await ctx.db.patch(args.workspaceId, {
      isOnboarded: true,
    });
  },
});

/* STEPS - (Workspace Onboarding) */

// Step-1
export const startStep1 = mutation({
  args: {
    onboardingId: v.id("onboarding"),
    domain: v.string(),
  },
  handler: async (ctx, args) => {
    const { onboardingId } = args;

    const user = await getCurrentUserWithWorkspace(ctx);

    // Normalize the domain
    let normalizedDomain: string;
    try {
      normalizedDomain = normalizeToDomain(args.domain);
    } catch (error) {
      console.error("❌ Error normalizing domain:", error);
      throw new ConvexError(ERRORS.INVALID_ARGUMENTS);
    }

    const onboarding = await ctx.db.get(onboardingId);

    if (!onboarding) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    if (onboarding.workspaceId !== user?.currentWorkspaceId) {
      throw new ConvexError(ERRORS.UNAUTHORIZED);
    }

    // Check if the onboarding is already processing
    if (onboarding.isProcessing) {
      throw new ConvexError("Onboarding is already processing.");
    }

    // Start the Workflow
    const workflowId = await workflow.start(
      ctx,
      internal.components.workflows.onboardingWorkspaceStepOne,
      { onboardingId, domain: normalizedDomain },
      {
        onComplete:
          internal.collections.onboarding.mutations.handleOnWorkflowComplete,
        context: {
          onboardingId,
          step: 1,
        },
      }
    );

    // Update onboarding to processing
    await ctx.db.patch(onboardingId, {
      step1: {
        workflowId,
        formData: {
          domain: normalizedDomain,
        },
      },
      animationStep: 3,
      isProcessing: true,
    });
  },
});

export const startStep2 = mutation({
  args: {
    onboardingId: v.id("onboarding"),
    urls: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { onboardingId, urls } = args;

    const user = await getCurrentUserWithWorkspace(ctx);

    const onboarding = await ctx.db.get(onboardingId);

    if (!onboarding) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    if (onboarding.workspaceId !== user?.currentWorkspaceId) {
      throw new ConvexError(ERRORS.UNAUTHORIZED);
    }

    if (onboarding.isProcessing) {
      throw new ConvexError("Onboarding is already processing.");
    }

    // Start the Workflow
    const workflowId = await workflow.start(
      ctx,
      internal.components.workflows.onboardingWorkspaceStepTwo,
      { onboardingId, urls },
      {
        onComplete:
          internal.collections.onboarding.mutations.handleOnWorkflowComplete,
        context: {
          onboardingId,
          step: 2,
        },
      }
    );

    // Update the onboarding to processing
    await ctx.db.patch(onboardingId, {
      isProcessing: true,
      animationStep: 6,
      step2: {
        workflowId,
        formData: {
          domain: onboarding.step1?.formData?.domain ?? "",
          urls,
        },
      },
    });
  },
});

export const startStep3 = mutation({
  args: {
    onboardingId: v.id("onboarding"),
    brandName: v.string(),
    brandDescription: v.string(),
    brandPersona: v.string(),
  },
  handler: async (ctx, args) => {
    const { onboardingId, brandName, brandDescription, brandPersona } = args;

    const user = await getCurrentUserWithWorkspace(ctx);

    const onboarding = await ctx.db.get(onboardingId);

    if (!onboarding) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    if (onboarding.workspaceId !== user?.currentWorkspaceId) {
      throw new ConvexError(ERRORS.UNAUTHORIZED);
    }

    if (onboarding.isProcessing) {
      throw new ConvexError("Onboarding is already processing.");
    }

    // Start the Workflow
    const workflowId = await workflow.start(
      ctx,
      internal.components.workflows.onboardingWorkspaceStepThree,
      { onboardingId },
      {
        onComplete:
          internal.collections.onboarding.mutations.handleOnWorkflowComplete,
        context: {
          onboardingId,
          step: 3,
        },
      }
    );

    // Update the onboarding to processing
    await ctx.db.patch(onboardingId, {
      isProcessing: true,
      animationStep: 9,
      step3: {
        workflowId,
        formData: {
          brandName,
          brandDescription,
          brandPersona,
        },
      },
    });
  },
});

export const startStep4 = mutation({
  args: {
    onboardingId: v.id("onboarding"),
    primaryColor: v.string(),
    secondaryColor: v.string(),
    logo: v.string(),
  },
  handler: async (
    ctx,
    { onboardingId, primaryColor, secondaryColor, logo }
  ) => {
    const user = await getCurrentUserWithWorkspace(ctx);

    const onboarding = await ctx.db.get(onboardingId);

    if (!onboarding) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    if (onboarding.workspaceId !== user?.currentWorkspaceId) {
      throw new ConvexError(ERRORS.UNAUTHORIZED);
    }

    if (onboarding.isProcessing) {
      throw new ConvexError("Onboarding is already processing.");
    }

    const themeData = onboarding.step4?.formData?.theme;
    if (!themeData) {
      throw new ConvexError("Theme not found");
    }

    const currentLightTheme = themeData.lightTheme;
    const currentDarkTheme = themeData.darkTheme;
    if (!currentLightTheme || !currentDarkTheme) {
      throw new ConvexError("Theme not found");
    }

    const finalLightTheme = generateThemeFromBrandColors(
      primaryColor,
      secondaryColor,
      hslToHex(currentLightTheme.accent),
      true
    );

    const finalDarkTheme = generateThemeFromBrandColors(
      primaryColor,
      secondaryColor,
      hslToHex(currentDarkTheme?.accent ?? currentLightTheme.accent),
      false
    );

    const finalFormData = {
      theme: {
        ...themeData,
        darkTheme: finalDarkTheme,
        lightTheme: {
          ...finalLightTheme,
          radius:
            onboarding.step4?.formData?.theme?.lightTheme.radius ?? "0.5rem",
        },
      },
      logo,
    };

    // Update form data
    await ctx.db.patch(onboardingId, {
      step4: {
        formData: finalFormData,
      },
    });

    // Start the Workflow
    const workflowId = await workflow.start(
      ctx,
      internal.components.workflows.onboardingWorkspaceStepFour,
      { onboardingId, logo },
      {
        onComplete:
          internal.collections.onboarding.mutations.handleOnWorkflowComplete,
        context: {
          onboardingId,
          step: 4,
        },
      }
    );

    // Update the onboarding to processing
    await ctx.db.patch(onboardingId, {
      isProcessing: true,
      animationStep: 11,
      step4: {
        workflowId,
        formData: finalFormData,
      },
    });
  },
});

export const handleBackStep = mutation({
  args: {
    onboardingId: v.id("onboarding"),
    step: v.number(),
    animationStep: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserWithWorkspace(ctx);
    const { onboardingId } = args;

    // This is the initial animation step for each step
    const initialAnimationStep = {
      1: 2,
      2: 5,
      3: 8,
      4: 10,
    };

    const onboarding = await ctx.db.get(onboardingId);

    if (!onboarding) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    if (onboarding.workspaceId !== user?.currentWorkspaceId) {
      throw new ConvexError(ERRORS.UNAUTHORIZED);
    }

    let animationStep = args.animationStep;
    let step = args.step;
    if (!animationStep) {
      animationStep =
        initialAnimationStep[args.step as keyof typeof initialAnimationStep] ??
        2;
    }

    // Handle the skip case
    if (args.step === 2 && !onboarding.step1?.formData?.domain) {
      step = 1;
      animationStep = 2;
    }

    await ctx.db.patch(onboardingId, {
      step,
      animationStep,
    });
  },
});

export const handleClearError = mutation({
  args: {
    onboardingId: v.id("onboarding"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserWithWorkspace(ctx);

    const onboarding = await ctx.db.get(args.onboardingId);

    if (!onboarding) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    if (onboarding.workspaceId !== user?.currentWorkspaceId) {
      throw new ConvexError(ERRORS.UNAUTHORIZED);
    }

    await ctx.db.patch(args.onboardingId, {
      error: undefined,
    });
  },
});

export const handleOnWorkflowComplete = internalMutation({
  args: {
    workflowId: vWorkflowId,
    result: vResultValidator,
    context: v.any(), // used to pass through data from the start site.
  },
  handler: async (ctx, args) => {
    const { result, context } = args;

    if (result.kind === "failed") {
      const updateStepObject = {
        isProcessing: false,
        step: 1,
        animationStep: 2,
        error: result.error,
      };

      switch (context.step) {
        case 1:
          updateStepObject.step = 1;
          updateStepObject.animationStep = 2;
          break;
        case 2:
          updateStepObject.step = 2;
          updateStepObject.animationStep = 5;
          break;
        case 3:
          updateStepObject.step = 3;
          updateStepObject.animationStep = 8;
          break;
        case 4:
          updateStepObject.step = 4;
          updateStepObject.animationStep = 10;
          break;
      }

      // Update the onboarding to failed
      await ctx.db.patch(context.onboardingId, updateStepObject);
    }
  },
});

export const handleSkip = mutation({
  args: {
    onboardingId: v.id("onboarding"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserWithWorkspace(ctx);

    const onboarding = await ctx.db.get(args.onboardingId);

    if (!onboarding) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    if (onboarding.workspaceId !== user?.currentWorkspaceId) {
      throw new ConvexError(ERRORS.UNAUTHORIZED);
    }

    await ctx.db.patch(args.onboardingId, {
      isProcessing: false,
      animationStep: 8,
      step: 3,
    });
  },
});
