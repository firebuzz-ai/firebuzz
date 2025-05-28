import { ConvexError, v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { mutation } from "../../_generated/server";
import { internalMutationWithTrigger } from "../../triggers";
import { getCurrentUser } from "../users/utils";
import { seoSchema } from "./schema";

export const create = mutation({
	args: {
		name: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);

		if (!user || !user.currentWorkspaceId || !user.currentProject) {
			throw new ConvexError("Unauthorized");
		}

		const brand = await ctx.db.insert("brands", {
			name: args.name,
			createdBy: user._id,
			workspaceId: user.currentWorkspaceId,
			projectId: user.currentProject,
		});

		return brand;
	},
});

export const update = mutation({
	args: {
		id: v.id("brands"),
		name: v.optional(v.string()),
		website: v.optional(v.string()),
		description: v.optional(v.string()),
		persona: v.optional(v.string()),
		logo: v.optional(v.string()),
		logoDark: v.optional(v.string()),
		icon: v.optional(v.string()),
		iconDark: v.optional(v.string()),
		defaultThemeId: v.optional(v.id("themes")),
		seo: v.optional(seoSchema),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);

		if (!user || !user.currentWorkspaceId || !user.currentProject) {
			throw new ConvexError("Unauthorized");
		}

		const brand = await ctx.db.get(args.id);

		if (!brand) {
			throw new ConvexError("Brand not found");
		}

		if (
			brand.workspaceId !== user.currentWorkspaceId ||
			brand.projectId !== user.currentProject
		) {
			throw new ConvexError("Unauthorized");
		}

		const updatedFields: Partial<Doc<"brands">> = {
			updatedBy: user._id,
			updatedAt: new Date().toISOString(),
		};

		if (args.name) {
			updatedFields.name = args.name;
		}
		if (args.website) {
			updatedFields.website = args.website;
		}
		if (args.description) {
			updatedFields.description = args.description;
		}
		if (args.persona) {
			updatedFields.persona = args.persona;
		}
		if (args.logo) {
			updatedFields.logo = args.logo;
		}
		if (args.logoDark) {
			updatedFields.logoDark = args.logoDark;
		}
		if (args.icon) {
			updatedFields.icon = args.icon;
		}
		if (args.iconDark) {
			updatedFields.iconDark = args.iconDark;
		}

		if (args.defaultThemeId) {
			updatedFields.defaultThemeId = args.defaultThemeId;
		}

		if (args.seo) {
			updatedFields.seo = args.seo;
		}

		const updatedBrand = await ctx.db.patch(args.id, updatedFields);

		return updatedBrand;
	},
});

export const deletePermanentByProjectId = internalMutationWithTrigger({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		const brand = await ctx.db
			.query("brands")
			.withIndex("by_project_id", (q) => q.eq("projectId", args.projectId))
			.first();

		if (brand) {
			await ctx.db.delete(brand._id);
		}
	},
});
