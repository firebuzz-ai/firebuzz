import { defineTable } from "convex/server";
import { v } from "convex/values";

export const userSchema = defineTable(
	v.object({
		externalId: v.string(),
		email: v.string(),
		firstName: v.optional(v.string()),
		lastName: v.optional(v.string()),
		fullName: v.optional(v.string()),
		imageKey: v.optional(v.string()),
		currentProjectId: v.optional(v.id("projects")),
		currentWorkspaceId: v.optional(v.id("workspaces")),
	}),
).index("by_external_id", ["externalId"]);
