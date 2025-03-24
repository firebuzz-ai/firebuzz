import { ConvexError, v } from "convex/values";
import { internalQuery, query } from "../../_generated/server";
import { r2 } from "../../helpers/r2";
import { getCurrentUser } from "../users/utils";

export const getLandingPageVersionById = query({
  args: {
    id: v.id("landingPageVersions"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const landingPageVersion = await ctx.db.get(args.id);

    console.log("landingPageVersion", landingPageVersion);

    if (!landingPageVersion || !landingPageVersion.key) {
      throw new ConvexError("Landing page version not found");
    }

    if (landingPageVersion.workspaceId !== user.currentWorkspaceId) {
      throw new ConvexError("Unauthorized");
    }

    const signedUrl = await r2.getUrl(landingPageVersion.key);

    return {
      ...landingPageVersion,
      signedUrl,
    };
  },
});

export const getLandingPageVersionByMessageId = query({
  args: {
    landingPageId: v.id("landingPages"),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("args", args);

    const landingPageVersion = await ctx.db
      .query("landingPageVersions")
      .withIndex("by_landing_page_id", (q) =>
        q.eq("landingPageId", args.landingPageId)
      )
      .filter((q) => q.eq(q.field("messageId"), args.messageId))
      .first();

    if (!landingPageVersion) {
      throw new ConvexError("Landing page version not found");
    }

    return landingPageVersion;
  },
});

export const getLandingPageCurrentVersion = query({
  args: {
    landingPageId: v.id("landingPages"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const landingPage = await ctx.db.get(args.landingPageId);

    if (!landingPage || !landingPage.landingPageVersionId) {
      throw new ConvexError("Landing page version not found");
    }

    if (landingPage.workspaceId !== user.currentWorkspaceId) {
      throw new ConvexError("Unauthorized");
    }

    // Get the landing page version
    const landingPageVersion = await ctx.db.get(
      landingPage.landingPageVersionId
    );

    if (!landingPageVersion || !landingPageVersion.key) {
      throw new ConvexError("Landing page version not found");
    }

    const signedUrl = await r2.getUrl(landingPageVersion.key);

    return {
      _id: landingPageVersion._id,
      number: landingPageVersion.number,
      signedUrl,
    };
  },
});

export const getFilesInternal = internalQuery({
  args: {
    templateId: v.id("landingPageTemplates"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);

    if (!template) {
      throw new ConvexError("Template not found");
    }

    return template.files;
  },
});
