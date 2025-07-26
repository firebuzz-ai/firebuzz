import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import type { Doc } from "../../../_generated/dataModel";
import { internalMutation } from "../../../_generated/server";
import { retrier } from "../../../components/actionRetrier";
import {
	internalMutationWithTrigger,
	mutationWithTrigger,
} from "../../../triggers";
import { ERRORS } from "../../../utils/errors";
import { getCurrentUserWithWorkspace } from "../../users/utils";
import { getCurrentSubscription } from "../subscriptions/utils";
import { transactionSchema } from "./schema";

export const createInternal = internalMutationWithTrigger({
	args: transactionSchema.validator,
	handler: async (ctx, args) => {
		return await ctx.db.insert("transactions", args);
	},
});

export const createIdempotent = internalMutationWithTrigger({
	args: {
		...transactionSchema.validator.fields,
		idempotencyKey: v.string(),
	},
	handler: async (ctx, args) => {
		// Check if transaction already exists
		const existing = await ctx.db
			.query("transactions")
			.withIndex("by_idempotency_key", (q) =>
				q.eq("idempotencyKey", args.idempotencyKey),
			)
			.unique();

		if (existing) {
			return existing._id;
		}

		return await ctx.db.insert("transactions", args);
	},
});

export const addUsageIdempotent = mutationWithTrigger({
	args: {
		amount: v.number(),
		idempotencyKey: v.string(),
		reason: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		if (!user) {
			throw new Error(ERRORS.UNAUTHORIZED);
		}

		const workspace = await ctx.db.get(user.currentWorkspaceId);

		if (!workspace) {
			throw new Error(ERRORS.NOT_FOUND);
		}

		const subscription = await getCurrentSubscription(ctx, workspace._id);

		if (!subscription) {
			throw new Error(ERRORS.NOT_FOUND);
		}

		if (!workspace.customerId) {
			throw new Error(ERRORS.NOT_FOUND);
		}

		const usage = {
			workspaceId: workspace._id,
			projectId: user.currentProjectId,
			customerId: subscription.customerId,
			amount: args.amount,
			type: "usage" as const,
			periodStart: subscription.currentPeriodStart,
			expiresAt: subscription.currentPeriodEnd,
			subscriptionId: subscription._id,
			reason: args.reason || "Usage credits",
			idempotencyKey: args.idempotencyKey,
			updatedAt: new Date().toISOString(),
			createdBy: user._id,
		};

		// Check ratelimit for ingestCreditUsage
		const { ok, retryAfter } = await ctx.runQuery(
			internal.components.ratelimits.checkLimit,
			{
				name: "ingestCreditUsage",
			},
		);

		await retrier.runAfter(
			ctx,
			ok ? 0 : retryAfter,
			internal.lib.tinybird.ingestCreditUsageAction,
			{
				amount: args.amount,
				type: "usage",
				idempotencyKey: args.idempotencyKey,
				workspaceId: workspace._id,
				userId: user._id,
				projectId: user.currentProjectId!,
			},
		);

		const transaction = await ctx.db.insert("transactions", usage);

		return transaction;
	},
});

export const addTrialCredits = internalMutationWithTrigger({
	args: {
		workspaceId: v.id("workspaces"),
		customerId: v.id("customers"),
		amount: v.number(),
		subscriptionId: v.id("subscriptions"),
		periodStart: v.string(),
		expiresAt: v.string(),
		reason: v.optional(v.string()),
		idempotencyKey: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const now = new Date().toISOString();

		return await ctx.db.insert("transactions", {
			workspaceId: args.workspaceId,
			customerId: args.customerId,
			amount: args.amount,
			type: "trial",
			periodStart: args.periodStart,
			expiresAt: args.expiresAt,
			subscriptionId: args.subscriptionId,
			reason: args.reason || "Trial credits",
			idempotencyKey: args.idempotencyKey,
			updatedAt: now,
		});
	},
});

export const addSubscriptionCredits = internalMutationWithTrigger({
	args: {
		workspaceId: v.id("workspaces"),
		customerId: v.id("customers"),
		amount: v.number(),
		subscriptionId: v.id("subscriptions"),
		periodStart: v.string(),
		expiresAt: v.string(),
		reason: v.optional(v.string()),
		idempotencyKey: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const now = new Date().toISOString();

		return await ctx.db.insert("transactions", {
			workspaceId: args.workspaceId,
			customerId: args.customerId,
			amount: args.amount,
			type: "subscription",
			periodStart: args.periodStart,
			expiresAt: args.expiresAt,
			subscriptionId: args.subscriptionId,
			reason: args.reason || "Monthly subscription credits",
			idempotencyKey: args.idempotencyKey,
			updatedAt: now,
		});
	},
});

export const addTopupCredits = internalMutationWithTrigger({
	args: {
		workspaceId: v.id("workspaces"),
		customerId: v.id("customers"),
		amount: v.number(),
		periodStart: v.string(),
		expiresAt: v.string(),
		reason: v.optional(v.string()),
		metadata: v.optional(v.record(v.string(), v.any())),
		idempotencyKey: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const now = new Date().toISOString();
		return await ctx.db.insert("transactions", {
			workspaceId: args.workspaceId,
			customerId: args.customerId,
			amount: args.amount,
			type: "topup",
			periodStart: args.periodStart,
			expiresAt: args.expiresAt,
			reason: args.reason || "Credit top-up",
			metadata: args.metadata,
			idempotencyKey: args.idempotencyKey,
			updatedAt: now,
		});
	},
});

export const deductCredits = internalMutationWithTrigger({
	args: {
		workspaceId: v.id("workspaces"),
		customerId: v.id("customers"),
		amount: v.number(),
		reason: v.string(),
		periodStart: v.string(),
		expiresAt: v.string(),
		metadata: v.optional(v.record(v.string(), v.any())),
		idempotencyKey: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const now = new Date().toISOString();

		return await ctx.db.insert("transactions", {
			workspaceId: args.workspaceId,
			customerId: args.customerId,
			amount: -Math.abs(args.amount), // Ensure negative
			type: "usage",
			periodStart: args.periodStart,
			expiresAt: args.expiresAt,
			reason: args.reason,
			metadata: args.metadata,
			idempotencyKey: args.idempotencyKey,
			updatedAt: now,
		});
	},
});

export const adjustCredits = internalMutationWithTrigger({
	args: {
		workspaceId: v.id("workspaces"),
		customerId: v.id("customers"),
		amount: v.number(),
		reason: v.string(),
		periodStart: v.string(),
		expiresAt: v.string(),
		metadata: v.optional(v.record(v.string(), v.any())),
		idempotencyKey: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const now = new Date().toISOString();

		return await ctx.db.insert("transactions", {
			workspaceId: args.workspaceId,
			customerId: args.customerId,
			amount: args.amount,
			type: "adjustment",
			periodStart: args.periodStart,
			expiresAt: args.expiresAt,
			reason: args.reason,
			metadata: args.metadata,
			idempotencyKey: args.idempotencyKey,
			updatedAt: now,
		});
	},
});

export const expireTrialCredits = internalMutationWithTrigger({
	args: {
		workspaceId: v.id("workspaces"),
		subscriptionId: v.optional(v.id("stripeSubscriptions")),
		reason: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const now = new Date().toISOString();

		// Find trial credits for this workspace that haven't expired yet
		const trialCredits = await ctx.db
			.query("transactions")
			.withIndex("by_workspace_id", (q) =>
				q.eq("workspaceId", args.workspaceId),
			)
			.filter((q) =>
				q.and(
					q.eq(q.field("type"), "trial"),
					q.or(
						q.eq(q.field("expiresAt"), undefined),
						q.gt(q.field("expiresAt"), now),
					),
				),
			)
			.collect();

		// Set expiration to now (effectively expiring them)
		for (const credit of trialCredits) {
			await ctx.db.patch(credit._id, {
				expiresAt: now,
				updatedAt: now,
			});
		}

		return trialCredits.length;
	},
});

export const revokeCredits = internalMutationWithTrigger({
	args: {
		workspaceId: v.id("workspaces"),
		customerId: v.id("customers"),
		amount: v.number(),
		reason: v.string(),
		subscriptionId: v.id("subscriptions"),
		periodStart: v.string(),
		expiresAt: v.string(),
	},
	handler: async (ctx, args) => {
		const now = new Date().toISOString();

		return await ctx.db.insert("transactions", {
			workspaceId: args.workspaceId,
			customerId: args.customerId,
			amount: -Math.abs(args.amount), // Ensure negative
			type: "refund",
			periodStart: args.periodStart,
			expiresAt: args.expiresAt,
			subscriptionId: args.subscriptionId,
			reason: args.reason,
			updatedAt: now,
		});
	},
});

export const updateInternal = internalMutation({
	args: {
		transactionId: v.id("transactions"),
		expiresAt: v.optional(v.string()),
		reason: v.optional(v.string()),
		metadata: v.optional(v.record(v.string(), v.any())),
	},
	handler: async (ctx, args) => {
		const updateObject: Partial<Doc<"transactions">> = {
			updatedAt: new Date().toISOString(),
		};

		if (args.expiresAt !== undefined) {
			updateObject.expiresAt = args.expiresAt;
		}

		if (args.reason) {
			updateObject.reason = args.reason;
		}

		if (args.metadata) {
			updateObject.metadata = args.metadata;
		}

		await ctx.db.patch(args.transactionId, updateObject);
	},
});

export const deleteInternal = internalMutationWithTrigger({
	args: {
		transactionId: v.id("transactions"),
	},
	handler: async (ctx, args) => {
		await ctx.db.delete(args.transactionId);
	},
});
