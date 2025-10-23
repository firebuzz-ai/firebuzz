import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internalQuery, query } from "../../../_generated/server";
import { ERRORS } from "../../../utils/errors";
import { getCurrentUserWithWorkspace } from "../../users/utils";

export const getPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { paginationOpts }) => {
    // Make sure the user is authenticated
    await getCurrentUserWithWorkspace(ctx);
    const environment = process.env.ENVIRONMENT || "dev";

    // Get all templates with pagination
    const templates = await ctx.db
      .query("landingPageTemplates")
      .paginate(paginationOpts);

      const templateWithThumbnailAndPreviewURL = templates.page.map((template) => {
        const thumbnail = `${process.env.R2_PUBLIC_URL}/templates/screenshots/${template.slug}.png`;
        const previewURL = `https://preview${environment === "dev" ? "-dev" : environment === "preview" ? "-preview" : ""}.frbzz.com/template/${template.slug}`;
        return {
          ...template,
          thumbnail,
          previewURL,
        };
      });

    return {
      ...templates,
      page: templateWithThumbnailAndPreviewURL,
    };
  },
});

export const getById = query({
  args: {
    id: v.id("landingPageTemplates"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id);
    const environment = process.env.ENVIRONMENT || "dev";
    if (!template) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }
    const thumbnail = `${process.env.R2_PUBLIC_URL}/templates/screenshots/${template.slug}.png`;
    const previewURL = `https://preview${environment === "dev" ? "-dev" : environment === "preview" ? "-preview" : ""}.frbzz.com/template/${template.slug}`;
    return {
      ...template,
      thumbnail,
      previewURL,
    };
  },
});

export const getByIdInternal = internalQuery({
  args: {
    id: v.id("landingPageTemplates"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
