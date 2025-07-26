import { defineTable } from "convex/server";
import { v } from "convex/values";

export const formSchema = defineTable(
	v.object({
		schema: v.array(
			v.object({
				id: v.string(),
				title: v.string(),
				placeholder: v.optional(v.string()),
				description: v.optional(v.string()),
				type: v.union(
					v.literal("string"),
					v.literal("number"),
					v.literal("boolean"),
				),
				inputType: v.union(
					v.literal("text"),
					v.literal("number"),
					v.literal("checkbox"),
					v.literal("radio"),
					v.literal("select"),
					v.literal("textarea"),
					v.literal("date"),
					v.literal("time"),
					v.literal("email"),
					v.literal("url"),
					v.literal("tel"),
					v.literal("password"),
				),
				// Flags
				required: v.boolean(),
				unique: v.boolean(),
				visible: v.optional(v.boolean()),
				default: v.optional(v.union(v.string(), v.number(), v.boolean())),
				options: v.optional(
					v.array(
						v.object({
							label: v.string(),
							value: v.string(),
						}),
					),
				),
			}),
		),
		submitButtonText: v.optional(v.string()),
		successMessage: v.optional(v.string()),
		successRedirectUrl: v.optional(v.string()),
		// Relations
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
		campaignId: v.id("campaigns"),
		createdBy: v.id("users"),
		// Timestamps
		updatedAt: v.string(),
	}),
)
	.index("by_workspace_id", ["workspaceId"])
	.index("by_project_id", ["projectId"])
	.index("by_campaign_id", ["campaignId"]);
