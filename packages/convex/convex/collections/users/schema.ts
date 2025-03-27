import { type Infer, v } from "convex/values";

export const userSchema = v.object({
	externalId: v.string(),
	email: v.string(),
	firstName: v.optional(v.string()),
	lastName: v.optional(v.string()),
	fullName: v.optional(v.string()),
	imageUrl: v.optional(v.string()),
	currentProject: v.optional(v.id("projects")),
});

export type User = Infer<typeof userSchema>;
