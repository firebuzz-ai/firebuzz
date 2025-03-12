import { v } from "convex/values";
import { internalMutationWithTrigger } from "../../triggers";
import { templateTags } from "./schema";

export const createLandingPageTemplateInternal = internalMutationWithTrigger({
  args: {
    title: v.string(),
    description: v.string(),
    thumbnail: v.string(),
    slug: v.string(),
    previewUrl: v.string(),
    files: v.string(),
    tags: templateTags,
  },
  handler: async (ctx, args) => {
    const landingPageTemplate = await ctx.db.insert("landingPageTemplates", {
      title: args.title,
      description: args.description,
      slug: args.slug,
      thumbnail: args.thumbnail,
      previewUrl: args.previewUrl,
      tags: args.tags,
      files: args.files,
    });

    return landingPageTemplate;
  },
});

export const deleteLandingPageTemplateInternal = internalMutationWithTrigger({
  args: {
    id: v.id("landingPageTemplates"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
