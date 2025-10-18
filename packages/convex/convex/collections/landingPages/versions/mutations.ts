import { ConvexError, v } from "convex/values";
import { internal } from "../../../_generated/api";
import { mutation } from "../../../_generated/server";
import { retrier } from "../../../components/actionRetrier";
import { aggregateLandingPageVersions } from "../../../components/aggregates";
import { r2 } from "../../../components/r2";
import {
	internalMutationWithTrigger,
	mutationWithTrigger,
} from "../../../triggers";
import { getCurrentUserWithWorkspace } from "../../users/utils";
import { createInternal } from "./utils";

export const create = mutationWithTrigger({
	args: {
		landingPageId: v.id("landingPages"),
		messageId: v.optional(v.string()),
		filesString: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		const landingPage = await ctx.db.get(args.landingPageId);

		if (!landingPage) {
			throw new ConvexError("Landing page not found");
		}

		if (landingPage.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError("Unauthorized");
		}

		const { landingPageVersionId, number } = await createInternal(ctx, {
			landingPageId: args.landingPageId,
			filesString: args.filesString,
			userId: user._id,
			workspaceId: user.currentWorkspaceId,
			projectId: landingPage.projectId,
			campaignId: landingPage.campaignId,
			messageId: args.messageId,
		});

		return {
			landingPageVersionId,
			number,
		};
	},
});

export const updateCurrentVersionFiles = mutation({
	args: {
		landingPageId: v.id("landingPages"),
		filesString: v.string(),
	},
	handler: async (ctx, { landingPageId, filesString }) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		const landingPage = await ctx.db.get(landingPageId);

		if (!landingPage) {
			throw new ConvexError("Landing page not found");
		}

		if (landingPage.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError("Unauthorized");
		}

		if (!landingPage.landingPageVersionId) {
			throw new ConvexError("Landing page version not found");
		}

		// Get the landing page version
		const landingPageVersion = await ctx.db.get(
			landingPage.landingPageVersionId,
		);

		if (!landingPageVersion || !landingPageVersion.key) {
			throw new ConvexError("Landing page version not found");
		}

		// Delete the files from R2
		await r2.deleteObject(ctx, landingPageVersion.key);

		// Update the files in R2
		await retrier.run(
			ctx,
			internal.collections.landingPages.versions.actions.store,
			{
				key: landingPageVersion.key,
				filesString: filesString,
			},
		);
	},
});

export const deletePermanent = mutationWithTrigger({
	args: {
		id: v.id("landingPageVersions"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		const landingPageVersion = await ctx.db.get(args.id);

		if (!landingPageVersion) {
			throw new ConvexError("Landing page version not found");
		}

		if (landingPageVersion.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError("Unauthorized");
		}

		await ctx.db.delete(args.id);

		// Delete the files from R2
		await r2.deleteObject(
			ctx,
			`landing-page-versions/${landingPageVersion.landingPageId}/${landingPageVersion._id}.txt`,
		);
	},
});

export const createWithCommit = internalMutationWithTrigger({
	args: {
		landingPageId: v.id("landingPages"),
		key: v.string(),
		commitMessage: v.string(),
		description: v.optional(v.string()),
		messageId: v.optional(v.string()),
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
		campaignId: v.id("campaigns"),
		createdBy: v.id("users"),
	},
	handler: async (ctx, args) => {
		console.log(
			"[createWithCommit] Creating version for landingPage:",
			args.landingPageId,
		);

		// Check last count of landing page versions
		const lastCount = await aggregateLandingPageVersions.count(ctx, {
			namespace: args.landingPageId,

			bounds: {},
		});

		console.log(
			"[createWithCommit] Last count:",
			lastCount,
			"New version will be:",
			lastCount + 1,
		);

		// Create the landing page version
		const landingPageVersionId = await ctx.db.insert("landingPageVersions", {
			number: lastCount + 1,
			createdBy: args.createdBy,
			workspaceId: args.workspaceId,
			projectId: args.projectId,
			campaignId: args.campaignId,
			landingPageId: args.landingPageId,
			messageId: args.messageId,
			key: args.key,
			commitMessage: args.commitMessage,
			description: args.description,
		});

		console.log(
			"[createWithCommit] Version record created:",
			landingPageVersionId,
		);

		// Update the landing page version
		await ctx.db.patch(args.landingPageId, {
			landingPageVersionId,
		});

		console.log("[createWithCommit] Updated landingPage with version pointer");

		return {
			landingPageVersionId,
			number: lastCount + 1,
		};
	},
});

export const revert = mutation({
	args: {
		landingPageId: v.id("landingPages"),
		versionId: v.id("landingPageVersions"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		// Verify landing page exists and user has access
		const landingPage = await ctx.db.get(args.landingPageId);

		if (!landingPage) {
			throw new ConvexError("Landing page not found");
		}

		if (landingPage.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError("Unauthorized");
		}

		// Verify version exists and belongs to landing page
		const version = await ctx.db.get(args.versionId);

		if (!version) {
			throw new ConvexError("Version not found");
		}

		if (version.landingPageId !== args.landingPageId) {
			throw new ConvexError("Version does not belong to this landing page");
		}

		// Get active session for this landing page
		const session = await ctx.db
			.query("agentSessions")
			.withIndex("by_landing_page_id", (q) =>
				q.eq("landingPageId", args.landingPageId),
			)
			.filter((q) => q.eq(q.field("status"), "active"))
			.first();

		if (!session) {
			throw new ConvexError("No active session found");
		}

		if (!session.sandboxId) {
			throw new ConvexError("Session has no sandbox");
		}

		// Set reverting state immediately for UI feedback
		await ctx.db.patch(args.landingPageId, {
			revertingToVersionId: args.versionId,
		});

		// Call revert action
		await ctx.scheduler.runAfter(
			0,
			internal.collections.sandboxes.actions.revertToVersionTool,
			{
				sandboxId: session.sandboxId,
				versionId: args.versionId,
			},
		);

		return { success: true };
	},
});
