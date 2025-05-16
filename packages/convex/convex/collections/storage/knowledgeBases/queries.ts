import { query } from "../../../_generated/server";
import { getCurrentUser } from "../../users/utils";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const projectId = user?.currentProject;

    if (!user || !projectId) {
      throw new Error("Unauthorized");
    }

    const knowledgeBases = await ctx.db
      .query("knowledgeBases")
      .withIndex("by_project_id", (q) => q.eq("projectId", projectId))
      .take(10);

    return knowledgeBases;
  },
});
