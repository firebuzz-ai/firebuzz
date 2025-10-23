import { v } from "convex/values";
import { internalMutationWithTrigger } from "../../../triggers";
import { templateTags } from "./schema";

export const createInternal = internalMutationWithTrigger({
	args: {
		title: v.string(),
		description: v.string(),
		thumbnail: v.string(),
		slug: v.string(),
		tags: templateTags,
		key: v.string(),
	},
	handler: async (ctx, args) => {
		const landingPageTemplate = await ctx.db.insert("landingPageTemplates", {
			title: args.title,
			description: args.description,
			slug: args.slug,
			thumbnail: args.thumbnail,
			key: args.key,
			tags: args.tags,
			
		});

		return landingPageTemplate;
	},
});

export const deleteInternal = internalMutationWithTrigger({
	args: {
		id: v.id("landingPageTemplates"),
	},
	handler: async (ctx, args) => {
		await ctx.db.delete(args.id);
	},
});
