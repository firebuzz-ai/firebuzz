import { asyncMap } from "convex-helpers";
import { ConvexError, v } from "convex/values";
import type { Doc } from "../../../_generated/dataModel";
import { mutation } from "../../../_generated/server";
import { getCurrentUser } from "../../users/utils";
import { socialPlatformSchema } from "./schema";

export const create = mutation({
	args: {
		platform: socialPlatformSchema,
		handle: v.string(),
		url: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		const projectId = user?.currentProject;
		const workspaceId = user?.currentWorkspaceId;

		if (!user || !workspaceId || !projectId) {
			throw new ConvexError("Unauthorized");
		}

		// Get Brand
		const brand = await ctx.db
			.query("brands")
			.withIndex("by_project_id", (q) => q.eq("projectId", projectId))
			.first();

		if (!brand) {
			throw new ConvexError("Brand not found");
		}

		const social = await ctx.db.insert("socials", {
			platform: args.platform,
			handle: args.handle,
			url: args.url,
			workspaceId,
			projectId,
			brandId: brand._id,
			createdBy: user._id,
		});

		return social;
	},
});

export const update = mutation({
	args: {
		id: v.id("socials"),
		platform: v.optional(socialPlatformSchema),
		handle: v.optional(v.string()),
		url: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		const projectId = user?.currentProject;
		const workspaceId = user?.currentWorkspaceId;

		if (!user || !workspaceId || !projectId) {
			throw new ConvexError("Unauthorized");
		}

		const social = await ctx.db.get(args.id);

		if (!social) {
			throw new ConvexError("Social not found");
		}

		if (social.projectId !== projectId) {
			throw new ConvexError("Unauthorized");
		}

		const updateObject: Partial<Doc<"socials">> = {
			updatedBy: user._id,
			updatedAt: new Date().toISOString(),
		};

		if (args.platform) {
			updateObject.platform = args.platform;
		}

		if (args.handle) {
			updateObject.handle = args.handle;
		}

		if (args.url) {
			updateObject.url = args.url;
		}

		const updatedSocial = await ctx.db.patch(args.id, updateObject);

		return updatedSocial;
	},
});

export const duplicate = mutation({
	args: {
		id: v.id("socials"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		const projectId = user?.currentProject;
		const workspaceId = user?.currentWorkspaceId;

		if (!user || !workspaceId || !projectId) {
			throw new ConvexError("Unauthorized");
		}

		const social = await ctx.db.get(args.id);

		if (!social) {
			throw new ConvexError("Social not found");
		}

		const duplicateSocial = await ctx.db.insert("socials", {
			platform: social.platform,
			handle: `${social.handle}_copy`,
			url: social.url,
			workspaceId,
			projectId,
			brandId: social.brandId,
			createdBy: user._id,
		});

		return duplicateSocial;
	},
});

export const duplicateMany = mutation({
	args: {
		ids: v.array(v.id("socials")),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		const projectId = user?.currentProject;
		const workspaceId = user?.currentWorkspaceId;

		if (!user || !workspaceId || !projectId) {
			throw new ConvexError("Unauthorized");
		}

		const socials = await asyncMap(args.ids, async (id) => {
			const social = await ctx.db.get(id);
			if (!social) {
				throw new ConvexError("Social not found");
			}
			return social;
		});

		if (socials.some((social) => social.projectId !== projectId)) {
			throw new ConvexError("Unauthorized");
		}

		await asyncMap(socials, async (social) => {
			await ctx.db.insert("socials", {
				platform: social.platform,
				handle: `${social.handle}_copy`,
				url: social.url,
				workspaceId,
				projectId,
				brandId: social.brandId,
				createdBy: user._id,
			});
		});

		return { success: true };
	},
});

export const deletePermanent = mutation({
	args: {
		id: v.id("socials"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		const projectId = user?.currentProject;
		const workspaceId = user?.currentWorkspaceId;

		if (!user || !workspaceId || !projectId) {
			throw new ConvexError("Unauthorized");
		}

		const social = await ctx.db.get(args.id);

		if (!social) {
			throw new ConvexError("Social not found");
		}

		if (social.projectId !== projectId) {
			throw new ConvexError("Unauthorized");
		}

		await ctx.db.delete(args.id);

		return { success: true };
	},
});

export const deletePermanentMany = mutation({
	args: {
		ids: v.array(v.id("socials")),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		const projectId = user?.currentProject;
		const workspaceId = user?.currentWorkspaceId;

		if (!user || !workspaceId || !projectId) {
			throw new ConvexError("Unauthorized");
		}

		const socials = await asyncMap(args.ids, async (id) => {
			const social = await ctx.db.get(id);
			if (!social) {
				throw new ConvexError("Social not found");
			}
			return social;
		});

		if (socials.some((social) => social.projectId !== projectId)) {
			throw new ConvexError("Unauthorized");
		}

		await asyncMap(socials, async (social) => {
			await ctx.db.delete(social._id);
		});

		return { success: true };
	},
});
