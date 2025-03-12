import { ConvexError, v } from "convex/values";
import { query } from "../../_generated/server";
import { getCurrentUser } from "../users/utils";

export const getLandingPageVersionById = query({
  args: {
    id: v.id("landingPageVersions"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const landingPageVersion = await ctx.db.get(args.id);

    if (!landingPageVersion) {
      throw new ConvexError("Landing page version not found");
    }

    if (landingPageVersion.workspaceId !== user.currentWorkspaceId) {
      throw new ConvexError("Unauthorized");
    }

    return landingPageVersion;
  },
});
