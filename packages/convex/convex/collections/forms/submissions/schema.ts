import { defineTable } from "convex/server";
import { v } from "convex/values";

export const formSubmissionSchema = defineTable(
	v.object({
		// Relations
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
		campaignId: v.id("campaigns"),
		formId: v.id("forms"),

		// Data
		data: v.record(v.string(), v.any()),
		// Flags
		campaignEnvironment: v.union(v.literal("production"), v.literal("preview")),
	}),
)
	.index("by_workspace_id", ["workspaceId"])
	.index("by_project_id", ["projectId"])
	.index("by_campaign_id", ["campaignId"])
	.index("by_form_id", ["formId"]);
