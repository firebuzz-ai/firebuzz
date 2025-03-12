import { slugify } from "@firebuzz/utils";
import { ConvexError } from "convex/values";
import { mutation } from "../../_generated/server";
import { getCurrentUser } from "../users/utils";
import { projectSchema } from "./schema";
import { checkSlug } from "./utils";

export const create = mutation({
  args: {
    title: projectSchema.fields.title,
    color: projectSchema.fields.color,
    icon: projectSchema.fields.icon,
    slug: projectSchema.fields.slug,
  },
  handler: async (ctx, { title, color, icon, slug }) => {
    const user = await getCurrentUser(ctx);

    if (!user || !user.currentWorkspaceId) {
      throw new ConvexError("User or current workspace not found.");
    }

    const isSlugAvailable = await checkSlug(ctx, slug);

    if (!isSlugAvailable) {
      throw new ConvexError(
        "Slug already taken. Please try again with a different slug."
      );
    }

    // Create the project
    const newProjectId = await ctx.db.insert("projects", {
      title,
      color,
      icon,
      slug: slugify(slug),
      workspaceId: user.currentWorkspaceId,
      createdBy: user._id,
    });

    // Change user's current project
    await ctx.db.patch(user._id, {
      currentProject: newProjectId,
    });
  },
});
