import { v } from "convex/values";

export const formSubmissionSchema = v.object({
	// Relations
	workspaceId: v.id("workspaces"),
	projectId: v.id("projects"),
	campaignId: v.id("campaigns"),
	formId: v.id("forms"),

	// Data
	data: v.record(v.string(), v.any()),
	isValid: v.boolean(),
	errors: v.record(v.string(), v.string()),
});
