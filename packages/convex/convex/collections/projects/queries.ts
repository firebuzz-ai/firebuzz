import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getCurrentUserWithWorkspace } from "../users/utils";

export const getAllByWorkspace = query({
  handler: async (ctx) => {
    const user = await getCurrentUserWithWorkspace(ctx);
    const currentWorkspace = await ctx.db.get(user.currentWorkspaceId);

    if (!currentWorkspace) {
      return [];
    }

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_workspace_id", (q) =>
        q.eq("workspaceId", currentWorkspace._id)
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
    await getCurrentUserWithWorkspace(ctx);
    // Get the project
    const project = await ctx.db.get(id);
    return project;
  },
});
