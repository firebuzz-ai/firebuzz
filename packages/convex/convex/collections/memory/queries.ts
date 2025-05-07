import { query } from "../../_generated/server";
import { getCurrentUser } from "../users/utils";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const projectId = user?.currentProject;

    if (!user || !projectId) {
      throw new Error("Unauthorized");
    }

    const memories = await ctx.db
      .query("memories")
      .withIndex("by_project_id", (q) => q.eq("projectId", projectId))
      .take(10);

    return memories;
  },
});
