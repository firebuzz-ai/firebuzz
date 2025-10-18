import { ConvexError, v } from "convex/values";
import { internalQuery, query } from "../../../_generated/server";
import { r2 } from "../../../components/r2";
import { getCurrentUserWithWorkspace } from "../../users/utils";

export const getById = query({
	args: {
		id: v.id("landingPageVersions"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		const landingPageVersion = await ctx.db.get(args.id);

		if (!landingPageVersion || !landingPageVersion.key) {
			throw new ConvexError("Landing page version not found");
		}

		if (landingPageVersion.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError("Unauthorized");
		}

		const signedUrl = await r2.getUrl(landingPageVersion.key);

		return {
			...landingPageVersion,
			signedUrl,
		};
	},
});

export const getByMessageId = query({
	args: {
		landingPageId: v.id("landingPages"),
		messageId: v.string(),
	},
	handler: async (ctx, args) => {
		const landingPageVersion = await ctx.db
			.query("landingPageVersions")
			.withIndex("by_landing_page_id", (q) =>
				q.eq("landingPageId", args.landingPageId),
			)
			.filter((q) => q.eq(q.field("messageId"), args.messageId))
			.first();

		if (!landingPageVersion) {
			throw new ConvexError("Landing page version not found");
		}

		return landingPageVersion;
	},
});

export const getCurrent = query({
	args: {
		landingPageId: v.id("landingPages"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		const landingPage = await ctx.db.get(args.landingPageId);

		if (!landingPage || !landingPage.landingPageVersionId) {
			throw new ConvexError("Landing page version not found");
		}

		if (landingPage.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError("Unauthorized");
		}

		// Get the landing page version
		const landingPageVersion = await ctx.db.get(
			landingPage.landingPageVersionId,
		);

		if (!landingPageVersion || !landingPageVersion.key) {
			throw new ConvexError("Landing page version not found");
		}

		const signedUrl = await r2.getUrl(landingPageVersion.key);

		return {
			_id: landingPageVersion._id,
			number: landingPageVersion.number,
			signedUrl,
		};
	},
});

export const getFilesInternal = internalQuery({
	args: {
		templateId: v.id("landingPageTemplates"),
	},
	handler: async (ctx, args) => {
		const template = await ctx.db.get(args.templateId);

		if (!template) {
			throw new ConvexError("Template not found");
		}

		return template.files;
	},
});

export const getByIdInternal = internalQuery({
	args: {
		id: v.id("landingPageVersions"),
	},
	handler: async (ctx, args) => {
		const landingPageVersion = await ctx.db.get(args.id);

		if (!landingPageVersion) {
			return null;
		}

		return landingPageVersion;
	},
});

export const listByLandingPageIdInternal = internalQuery({
	args: {
		landingPageId: v.id("landingPages"),
	},
	handler: async (ctx, args) => {
		const versions = await ctx.db
			.query("landingPageVersions")
			.withIndex("by_landing_page_id", (q) =>
				q.eq("landingPageId", args.landingPageId),
			)
			.order("desc")
			.collect();

		return versions.map((v) => ({
			_id: v._id,
			number: v.number,
			commitMessage: v.commitMessage,
			_creationTime: v._creationTime,
		}));
	},
});

export const listByLandingPageId = query({
	args: {
		landingPageId: v.id("landingPages"),
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

		// Fetch all versions for this landing page
		const versions = await ctx.db
			.query("landingPageVersions")
			.withIndex("by_landing_page_id", (q) =>
				q.eq("landingPageId", args.landingPageId),
			)
			.order("desc")
			.collect();

		// Enrich with user data
		const enrichedVersions = await Promise.all(
			versions.map(async (version) => {
				const creator = await ctx.db.get(version.createdBy);

				// Get avatar URL if imageKey exists
				let avatarUrl: string | undefined;
				if (creator?.imageKey) {
					avatarUrl = await r2.getUrl(creator.imageKey);
				}

				return {
					_id: version._id,
					number: version.number,
					commitMessage: version.commitMessage,
					_creationTime: version._creationTime,
					messageId: version.messageId,
					createdBy: {
						_id: creator?._id,
						fullName: creator?.fullName || "Unknown",
						avatarUrl,
					},
				};
			}),
		);

		return enrichedVersions;
	},
});
