import { type Infer, v } from "convex/values";

export const projectSchema = v.object({
	title: v.string(),
	color: v.string(),
	icon: v.string(),
	slug: v.string(),
	// Relations
	workspaceId: v.id("workspaces"),
	createdBy: v.id("users"),
});

export type Project = Infer<typeof projectSchema>;
