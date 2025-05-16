import { v } from "convex/values";

export const memoizedDocumentsSchema = v.object({
  documentId: v.id("documents"),
  knowledgeBaseId: v.id("knowledgeBases"),
});
