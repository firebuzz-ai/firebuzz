import { defineSchema, defineTable } from "convex/server";
import { projectSchema } from "./collections/projects";
import { userSchema } from "./collections/users";
import { workspaceSchema } from "./collections/workspace";

export default defineSchema({
	users: defineTable(userSchema).index("by_external_id", ["externalId"]),
	workspaces: defineTable(workspaceSchema)
		.index("by_external_id", ["externalId"])
		.index("by_slug", ["slug"])
		.index("by_owner", ["ownerId"]),

	projects: defineTable(projectSchema)
		.index("by_workspace_id", ["workspaceId"])
		.index("by_title", ["title"]),
});
