import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import { type MutationCtx, internalMutation } from "../../../_generated/server";
import { retrier } from "../../../components/actionRetrier";
import { aggregateLandingPageVersions } from "../../../components/aggregates";
import {
	batchDeleteStoragePool,
	cascadePool,
} from "../../../components/workpools";

export const createInternal = async (
	ctx: MutationCtx,
	{
		userId,
		workspaceId,
		projectId,
		campaignId,
		landingPageId,
		filesString,
		messageId,
	}: {
		userId: Id<"users">;
		landingPageId: Id<"landingPages">;
		workspaceId: Id<"workspaces">;
		projectId: Id<"projects">;
		campaignId: Id<"campaigns">;
		filesString: string;
		messageId: string | undefined;
	},
) => {
	// Check last count of landing page versions
	const lastCount = await aggregateLandingPageVersions.count(ctx, {
		namespace: landingPageId,
		// @ts-ignore
		bounds: {},
	});

	const key = `landing-page-versions/${landingPageId}/${crypto.randomUUID()}.txt`;

	// Create the landing page version
	const landingPageVersion = await ctx.db.insert("landingPageVersions", {
		number: lastCount + 1,
		createdBy: userId,
		workspaceId: workspaceId,
		projectId: projectId,
		campaignId: campaignId,
		landingPageId: landingPageId,
		messageId: messageId,
		key: key,
	});

	// Store the files in R2
	await retrier.run(
		ctx,
		internal.collections.landingPages.versions.actions.store,
		{
			key,
			filesString: filesString,
		},
	);

	// Update the landing page version
	await ctx.db.patch(landingPageId, {
		landingPageVersionId: landingPageVersion,
	});

	return {
		landingPageVersionId: landingPageVersion,
		number: lastCount + 1,
	};
};

export const batchDelete = internalMutation({
	args: {
		cursor: v.optional(v.string()),
		landingPageId: v.id("landingPages"),
		numItems: v.number(),
	},
	handler: async (ctx, { landingPageId, cursor, numItems }) => {
		const { page, continueCursor } = await ctx.db
			.query("landingPageVersions")
			.withIndex("by_landing_page_id", (q) =>
				q.eq("landingPageId", landingPageId),
			)
			.paginate({ numItems, cursor: cursor ?? null });

		// Delete the landing page versions
		await asyncMap(page, (document) => ctx.db.delete(document._id));

		// Delete files from R2
		const filesWithKeys = page.filter((document) => document.key);
		await asyncMap(filesWithKeys, (document) =>
			batchDeleteStoragePool.enqueueMutation(
				ctx,
				internal.components.r2.deletePermanent,
				{
					key: document.key,
				},
			),
		);

		// Continue deleting landing page versions if there are more
		if (
			continueCursor &&
			continueCursor !== cursor &&
			page.length === numItems
		) {
			await cascadePool.enqueueMutation(
				ctx,
				internal.collections.landingPages.versions.utils.batchDelete,
				{
					landingPageId,
					cursor: continueCursor,
					numItems,
				},
			);
		}
	},
});
