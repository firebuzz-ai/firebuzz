import { type Infer, v } from "convex/values";

export const templateTags = v.array(
	v.union(
		v.literal("saas"),
		v.literal("ecommerce"),
		v.literal("service"),
		v.literal("events"),
		v.literal("education"),
		v.literal("non-profit"),
		v.literal("other"),
	),
);

export const landingPageTemplatesSchema = v.object({
	title: v.string(),
	description: v.string(),
	slug: v.string(), // Must be unique
	thumbnail: v.string(),
	previewUrl: v.string(),
	tags: templateTags,
	files: v.string(),
});

export type TemplateTag =
	| "saas"
	| "ecommerce"
	| "service"
	| "events"
	| "education"
	| "non-profit"
	| "other";
export type LandingPageTemplate = Infer<typeof landingPageTemplatesSchema>;
