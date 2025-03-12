import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getCurrentUser } from "../users/utils";
import { getWorkspaceById } from "../workspaces/utils";

export const getAllByWorkspace = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    const currentWorkspace = await getWorkspaceById(
      ctx,
      user.currentWorkspaceId
    );

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
    await getCurrentUser(ctx);
    // Get the project
    const project = await ctx.db.get(id);
    return project;
  },
});
