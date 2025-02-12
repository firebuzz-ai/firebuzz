import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getCurrentUser } from "./users";
import { getWorkspaceById } from "./workspace";

// @schema
export const projectSchema = v.object({
	title: v.string(),
	color: v.string(),
	icon: v.string(),
	workspaceId: v.id("workspaces"),
	createdBy: v.id("users"),
});

// @query
export const getAllByWorkspace = query({
	handler: async (ctx) => {
		const user = await getCurrentUser(ctx);

		const currentWorkspace = await getWorkspaceById(
			ctx,
			user.currentWorkspaceId,
		);

		if (!currentWorkspace) {
			return [];
		}

		const projects = await ctx.db
			.query("projects")
			.withIndex("by_workspace_id", (q) =>
				q.eq("workspaceId", currentWorkspace._id),
			)
			.collect();
		return projects;
	},
});

export const getById = query({
	args: {
		id: v.id("projects"),
	},
	handler: async (ctx, { id }) => {
		// Check if the user is authenticated
		await getCurrentUser(ctx);
		// Get the project
		const project = await ctx.db.get(id);
		return project;
	},
});

// @mutation
export const create = mutation({
	args: {
		title: projectSchema.fields.title,
		color: projectSchema.fields.color,
		icon: projectSchema.fields.icon,
	},
	handler: async (ctx, { title, color, icon }) => {
		const user = await getCurrentUser(ctx);

		if (!user || !user.currentWorkspaceId) {
			throw new ConvexError("User or current workspace not found.");
		}

		await ctx.db.insert("projects", {
			title,
			color,
			icon,
			workspaceId: user.currentWorkspaceId,
			createdBy: user._id,
		});
	},
});
