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
		isTest: v.optional(v.boolean()),
	},
	handler: async (ctx, { formId, paginationOpts, sortOrder, isTest }) => {
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
				isTest !== undefined ? q.eq(q.field("isTest"), isTest) : true,
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
		isTest: v.optional(v.boolean()),
	},
	handler: async (ctx, { campaignId, paginationOpts, sortOrder, isTest }) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		const query = ctx.db
			.query("formSubmissions")
			.withIndex("by_campaign_id", (q) => q.eq("campaignId", campaignId))
			.filter((q) => q.eq(q.field("workspaceId"), user.currentWorkspaceId))
			.filter((q) =>
				isTest !== undefined ? q.eq(q.field("isTest"), isTest) : true,
			)
			.order(sortOrder)
			.paginate(paginationOpts);

		return await query;
	},
});
