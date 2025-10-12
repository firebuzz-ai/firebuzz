import { ConvexError, v } from "convex/values";
import { asyncMap } from "convex-helpers";
import type { Doc } from "../../../_generated/dataModel";
import { internalMutation, mutation } from "../../../_generated/server";
import { getCurrentUserWithWorkspace } from "../../users/utils";

export const create = mutation({
	args: {
		name: v.string(),
		description: v.string(),
		benefits: v.string(),
		proof: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		const projectId = user?.currentProjectId;
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

		const feature = await ctx.db.insert("features", {
			name: args.name,
			description: args.description,
			benefits: args.benefits,
			proof: args.proof,
			workspaceId,
			projectId,
			brandId: brand._id,
			createdBy: user._id,
		});

		return feature;
	},
});

export const createManyInternal = internalMutation({
	args: {
		features: v.array(
			v.object({
				name: v.string(),
				description: v.string(),
				benefits: v.string(),
				proof: v.string(),
				brandId: v.id("brands"),
				workspaceId: v.id("workspaces"),
				projectId: v.id("projects"),
				createdBy: v.id("users"),
			}),
		),
	},
	handler: async (ctx, args) => {
		const features = await asyncMap(args.features, async (feature) => {
			return await ctx.db.insert("features", feature);
		});

		return features;
	},
});

export const update = mutation({
	args: {
		id: v.id("features"),
		name: v.optional(v.string()),
		description: v.optional(v.string()),
		benefits: v.optional(v.string()),
		proof: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		const projectId = user?.currentProjectId;
		const workspaceId = user?.currentWorkspaceId;

		if (!user || !workspaceId || !projectId) {
			throw new ConvexError("Unauthorized");
		}

		const audience = await ctx.db.get(args.id);

		if (!audience) {
			throw new ConvexError("Audience not found");
		}

		if (audience.projectId !== projectId) {
			throw new ConvexError("Unauthorized");
		}

		const updateObject: Partial<Doc<"features">> = {
			updatedBy: user._id,
			updatedAt: new Date().toISOString(),
		};

		if (args.name) {
			updateObject.name = args.name;
		}

		if (args.description) {
			updateObject.description = args.description;
		}

		if (args.benefits) {
			updateObject.benefits = args.benefits;
		}

		if (args.proof) {
			updateObject.proof = args.proof;
		}

		const updatedAudience = await ctx.db.patch(args.id, updateObject);

		return updatedAudience;
	},
});

export const duplicate = mutation({
	args: {
		id: v.id("features"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		const projectId = user?.currentProjectId;
		const workspaceId = user?.currentWorkspaceId;

		if (!user || !workspaceId || !projectId) {
			throw new ConvexError("Unauthorized");
		}

		const feature = await ctx.db.get(args.id);

		if (!feature) {
			throw new ConvexError("Feature not found");
		}

		const duplicateFeature = await ctx.db.insert("features", {
			name: `${feature.name} (Copy)`,
			description: feature.description,
			benefits: feature.benefits,
			proof: feature.proof,
			workspaceId,
			projectId,
			brandId: feature.brandId,
			createdBy: user._id,
		});

		return duplicateFeature;
	},
});

export const duplicateMany = mutation({
	args: {
		ids: v.array(v.id("features")),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		const projectId = user?.currentProjectId;
		const workspaceId = user?.currentWorkspaceId;

		if (!user || !workspaceId || !projectId) {
			throw new ConvexError("Unauthorized");
		}

		const features = await asyncMap(args.ids, async (id) => {
			const feature = await ctx.db.get(id);
			if (!feature) {
				throw new ConvexError("Feature not found");
			}
			return feature;
		});

		if (features.some((feature) => feature.projectId !== projectId)) {
			throw new ConvexError("Unauthorized");
		}

		await asyncMap(features, async (feature) => {
			await ctx.db.insert("features", {
				name: `${feature.name} (Copy)`,
				description: feature.description,
				benefits: feature.benefits,
				proof: feature.proof,
				workspaceId,
				projectId,
				brandId: feature.brandId,
				createdBy: user._id,
			});
		});

		return { success: true };
	},
});

export const deletePermanent = mutation({
	args: {
		id: v.id("features"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		const projectId = user?.currentProjectId;
		const workspaceId = user?.currentWorkspaceId;

		if (!user || !workspaceId || !projectId) {
			throw new ConvexError("Unauthorized");
		}

		const feature = await ctx.db.get(args.id);

		if (!feature) {
			throw new ConvexError("Feature not found");
		}

		if (feature.projectId !== projectId) {
			throw new ConvexError("Unauthorized");
		}

		await ctx.db.delete(args.id);

		return { success: true };
	},
});

export const deletePermanentMany = mutation({
	args: {
		ids: v.array(v.id("features")),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		const projectId = user?.currentProjectId;
		const workspaceId = user?.currentWorkspaceId;

		if (!user || !workspaceId || !projectId) {
			throw new ConvexError("Unauthorized");
		}

		const features = await asyncMap(args.ids, async (id) => {
			const feature = await ctx.db.get(id);
			if (!feature) {
				throw new ConvexError("Feature not found");
			}
			return feature;
		});

		if (features.some((feature) => feature.projectId !== projectId)) {
			throw new ConvexError("Unauthorized");
		}

		await asyncMap(features, async (feature) => {
			await ctx.db.delete(feature._id);
		});

		return { success: true };
	},
});
