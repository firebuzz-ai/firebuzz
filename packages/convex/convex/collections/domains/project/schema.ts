import { defineTable } from "convex/server";
import { v } from "convex/values";

export const projectDomainsSchema = defineTable({
	subdomain: v.string(),
	domain: v.string(),

	// Relations
	workspaceId: v.id("workspaces"),
	projectId: v.id("projects"),
	updatedAt: v.optional(v.string()),
	updatedBy: v.optional(v.id("users")),

	// Soft delete and archiving
	isArchived: v.optional(v.boolean()),
	deletedAt: v.optional(v.string()),
})
	.index("by_project_id", ["projectId"])
	.index("by_subdomain", ["subdomain"]);
