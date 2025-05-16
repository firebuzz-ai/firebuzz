import { defineSchema, defineTable } from "convex/server";
import { campaignSchema } from "./collections/campaigns/schema";
import { landingPageMessagesSchema } from "./collections/landingPages/messages/schema";
import { landingPagesSchema } from "./collections/landingPages/schema";
import { landingPageTemplatesSchema } from "./collections/landingPages/templates/schema";
import { landingPageVersionsSchema } from "./collections/landingPages/versions/schema";
import { projectSchema } from "./collections/projects/schema";
import { documentChunksSchema } from "./collections/storage/documents/chunks/schema";
import { documentsSchema } from "./collections/storage/documents/schema";

import { memoizedDocumentsSchema } from "./collections/storage/documents/memoized/schema";
import { documentVectorsSchema } from "./collections/storage/documents/vectors/schema";
import { knowledgeBaseSchema } from "./collections/storage/knowledgeBases/schema";
import { mediaSchema } from "./collections/storage/media/schema";
import { mediaVectorsSchema } from "./collections/storage/media/vectors/schema";
import { userSchema } from "./collections/users/schema";
import { workspaceSchema } from "./collections/workspaces/schema";

export default defineSchema({
	users: defineTable(userSchema).index("by_external_id", ["externalId"]),
	workspaces: defineTable(workspaceSchema)
		.index("by_external_id", ["externalId"])
		.index("by_owner", ["ownerId"]),
	projects: defineTable(projectSchema)
		.index("by_workspace_id", ["workspaceId"])
		.index("by_title", ["title"])
		.index("by_slug", ["slug"]),
	campaigns: defineTable(campaignSchema)
		.index("by_workspace_id", ["workspaceId"])
		.index("by_project_id", ["projectId"])
		.index("by_deleted_at", ["deletedAt"])
		.searchIndex("by_title", { searchField: "title" }),
	landingPageTemplates: defineTable(landingPageTemplatesSchema).index(
		"by_title",
		["title"],
	),
	landingPages: defineTable(landingPagesSchema)
		.index("by_workspace_id", ["workspaceId"])
		.index("by_project_id", ["projectId"])
		.index("by_campaign_id", ["campaignId"])
		.index("by_deleted_at", ["deletedAt"])
		.searchIndex("by_title", { searchField: "title" }),
	landingPageVersions: defineTable(landingPageVersionsSchema)
		.index("by_landing_page_id", ["landingPageId"])
		.index("by_workspace_id", ["workspaceId"])
		.index("by_project_id", ["projectId"])
		.index("by_campaign_id", ["campaignId"])
		.index("by_message_id", ["messageId"]),
	landingPageMessages: defineTable(landingPageMessagesSchema)
		.index("by_landing_page_id", ["landingPageId"])
		.index("by_workspace_id", ["workspaceId"])
		.index("by_project_id", ["projectId"])
		.index("by_campaign_id", ["campaignId"])
		.index("by_created_at", ["createdAt"])
		.index("by_message_id", ["messageId"]),
	media: defineTable(mediaSchema)
		.index("by_workspace_id", ["workspaceId"])
		.index("by_project_id", ["projectId"])
		.index("by_created_by", ["createdBy"])
		.index("by_deleted_at", ["deletedAt"])
		.searchIndex("by_fileName", { searchField: "name" }),
	mediaVectors: defineTable(mediaVectorsSchema)
		.index("by_workspace_id", ["workspaceId"])
		.index("by_project_id", ["projectId"])
		.index("by_media_id", ["mediaId"])
		.vectorIndex("by_emmbedings", {
			vectorField: "embedding",
			dimensions: 1536,
			filterFields: ["projectId"],
		}),
	documents: defineTable(documentsSchema)
		.index("by_workspace_id", ["workspaceId"])
		.index("by_project_id", ["projectId"])
		.index("by_created_by", ["createdBy"])
		.index("by_deleted_at", ["deletedAt"])
		.index("by_key", ["key"])
		.index("by_knowledge_base", ["knowledgeBases"])
		.searchIndex("by_fileName", { searchField: "name" }),
	documentChunks: defineTable(documentChunksSchema)
		.index("by_workspace_id", ["workspaceId"])
		.index("by_project_id", ["projectId"])
		.index("by_document_id", ["documentId"]),
	documentVectors: defineTable(documentVectorsSchema)
		.index("by_workspace_id", ["workspaceId"])
		.index("by_project_id", ["projectId"])
		.index("by_document_id", ["documentId"])
		.index("by_chunk_id", ["chunkId"])
		.vectorIndex("by_emmbedings", {
			vectorField: "embedding",
			dimensions: 1536,
			filterFields: ["projectId", "knowledgeBaseId", "documentId"],
		}),
	knowledgeBases: defineTable(knowledgeBaseSchema)
		.index("by_workspace_id", ["workspaceId"])
		.index("by_project_id", ["projectId"])
		.index("by_created_by", ["createdBy"])
		.index("by_updated_at", ["updatedAt"]),
	// Helper Tables
	memoizedDocuments: defineTable(memoizedDocumentsSchema)
		.index("by_knowledge_base", ["knowledgeBaseId"])
		.index("by_document_id", ["documentId"]),
});
