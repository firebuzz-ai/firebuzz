import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { query } from "../../../_generated/server";
import { ERRORS } from "../../../utils/errors";
import { getCurrentUserWithWorkspace } from "../../users/utils";

export const getPaginatedByFormId = query({
	args: {
		formId: v.id("forms"),
		paginationOpts: paginationOptsValidator,
		sortOrder: v.union(v.literal("asc"), v.literal("desc")),
		campaignEnvironment: v.optional(
			v.union(v.literal("preview"), v.literal("production")),
		),
	},
	handler: async (
		ctx,
		{ formId, paginationOpts, sortOrder, campaignEnvironment },
	) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		// First verify the form exists and user has access
		const form = await ctx.db.get(formId);
		if (!form) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (form.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		const query = ctx.db
			.query("formSubmissions")
			.withIndex("by_form_id", (q) => q.eq("formId", formId))
			.filter((q) => q.eq(q.field("workspaceId"), user.currentWorkspaceId))
			.filter((q) =>
				campaignEnvironment !== undefined
					? q.eq(q.field("campaignEnvironment"), campaignEnvironment)
					: true,
			)
			.order(sortOrder)
			.paginate(paginationOpts);

		return await query;
	},
});

export const getPaginatedByCampaignId = query({
	args: {
		campaignId: v.id("campaigns"),
		paginationOpts: paginationOptsValidator,
		sortOrder: v.union(v.literal("asc"), v.literal("desc")),
		campaignEnvironment: v.optional(
			v.union(v.literal("preview"), v.literal("production")),
		),
	},
	handler: async (
		ctx,
		{ campaignId, paginationOpts, sortOrder, campaignEnvironment },
	) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		const query = ctx.db
			.query("formSubmissions")
			.withIndex("by_campaign_id", (q) => q.eq("campaignId", campaignId))
			.filter((q) => q.eq(q.field("workspaceId"), user.currentWorkspaceId))
			.filter((q) =>
				campaignEnvironment !== undefined
					? q.eq(q.field("campaignEnvironment"), campaignEnvironment)
					: true,
			)
			.order(sortOrder)
			.paginate(paginationOpts);

		return await query;
	},
});
