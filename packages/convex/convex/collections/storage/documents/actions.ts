"use node";
import { MDocument } from "@mastra/rag";
import { generateObject } from "ai";
import { ConvexError, v } from "convex/values";
import { z } from "zod";
import { api, internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import {
  CSVReader,
  type Document,
  DocxReader,
  HTMLReader,
  MarkdownReader,
  PDFReader,
  TextFileReader,
} from "../../../lib/documentReaders";

import { stripIndents } from "@firebuzz/utils";
import { action } from "../../../_generated/server";
import { r2 } from "../../../helpers/r2";
import { openai } from "../../../lib/openai";
import { vectorizationPool } from "../../../workpools";
import { documentsSchema } from "./schema";

// Define the type for chunks being inserted
interface ChunkToInsert {
  workspaceId: Id<"workspaces">;
  projectId: Id<"projects">;
  documentId: Id<"documents">;
  content: string;
  index: number;
}

export const createDocumentWithChunks = action({
  args: {
    key: v.string(),
    name: v.string(),
    contentType: v.string(),
    size: v.number(),
    knowledgeBases: v.optional(v.array(v.id("knowledgeBases"))),
    type: documentsSchema.fields.type,
  },
  handler: async (
    ctx,
    { name, contentType, size, knowledgeBases, type, key }
  ) => {
    // 1. Get Current User
    const user = await ctx.runQuery(api.collections.users.queries.getCurrent);
    const workspaceId = user.currentWorkspaceId;
    const projectId = user.currentProject;

    if (!workspaceId || !projectId) {
      throw new ConvexError("Not authorized");
    }

    // 2. Download File
    const url = await r2.getUrl(key);

    const arrayBuffer = await fetch(url)
      .then((res) => res.arrayBuffer())
      .catch((err) => {
        console.error(`Failed to fetch file from R2: ${key}`, err);
        return null;
      });

    if (!arrayBuffer) {
      throw new ConvexError(`Failed to get array buffer for file: ${key}`);
    }

    const uint8Array = new Uint8Array(arrayBuffer);

    // 3. Load File Content using appropriate reader
    let loadedDocs: Document[] = [];

    try {
      switch (type) {
        case "md":
          loadedDocs = await new MarkdownReader().loadDataAsContent(uint8Array);
          break;
        case "html":
          loadedDocs = await new HTMLReader().loadDataAsContent(uint8Array);
          break;
        case "txt":
          loadedDocs = await new TextFileReader().loadDataAsContent(uint8Array);
          break;
        case "pdf":
          loadedDocs = await new PDFReader().loadDataAsContent(uint8Array);
          break;
        case "csv":
          loadedDocs = await new CSVReader().loadDataAsContent(uint8Array);
          break;
        case "docx":
          loadedDocs = await new DocxReader().loadDataAsContent(uint8Array);
          break;
        default:
          console.warn(`Unsupported content type encountered: ${type}`);
          throw new Error(`Unsupported content type encountered: ${type}`);
      }
    } catch (err) {
      console.error(`Failed to load data for type ${type}, key ${key}:`, err);
      throw new ConvexError(`Failed to process file content for type ${type}`);
    }

    // Combine loaded document content into a single string
    const contents = loadedDocs.map((doc) => doc.text);

    const maxLength = 500000;

    // If no content after loading, return early
    if (!contents.length) {
      console.warn(`No content extracted from file: ${key}`);
      throw new ConvexError(`No content extracted from file: ${key}`);
    }

    // If the content is too long, return early
    if (contents.join("\n").length > maxLength) {
      console.warn(`Content is too long: ${key}`);
      throw new ConvexError("Content is too long");
    }

    // 4. Summarise with AI
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: z.object({
        summary: z.string(),
      }),
      prompt: stripIndents`
        Summarise the following file:
        File type: ${type}
        File name: ${name}
        File size: ${size}
        File content: ${contents.join("\n")}
        Make sure to include all the information from the document and the maximum length is 500 characters.
      `,
    });

    // 6. Create MDocument instance based on type
    const mDoc = contents.map((content) => MDocument.fromText(content));

    // 7. Chunk the document using Mastra
    const mastraChunks = await Promise.all(
      mDoc.flatMap(
        async (doc) =>
          await doc.chunk({
            strategy: "recursive",
            size: 2048,
            overlap: 256,
          })
      )
    ).then((chunks) => chunks.flat());

    // 8. Create Document
    const documentId: Id<"documents"> = await ctx.runMutation(
      internal.collections.storage.documents.mutations.create,
      {
        name,
        contentType,
        size,
        knowledgeBases,
        type,
        workspaceId,
        projectId,
        createdBy: user._id,
        key,
        summary: object.summary,
        isLongDocument: contents.length > 5000,
      }
    );

    // 9. Build Chunks for Convex Insertion
    const chunksToInsert: ChunkToInsert[] = mastraChunks.map(
      (chunk, index: number) => ({
        // Use Mastra chunk format { text: string }
        workspaceId,
        projectId,
        documentId,
        content: chunk.text,
        index,
      })
    );

    // 10. Insert File Chunks into Convex
    const fileChunkPromises = chunksToInsert.map(
      async (chunk: ChunkToInsert) => {
        const chunkId: Id<"documentChunks"> = await ctx.runMutation(
          internal.collections.storage.documents.chunks.mutations.create,
          {
            workspaceId: chunk.workspaceId,
            projectId: chunk.projectId,
            documentId: chunk.documentId,
            content: chunk.content,
            index: chunk.index,
          }
        );
        return chunkId;
      }
    );

    await Promise.all(fileChunkPromises);

    // 11. Vectorize Chunks if There are KnowledgeBases
    if (knowledgeBases && knowledgeBases.length > 0) {
      await vectorizationPool.enqueueAction(
        ctx,
        internal.collections.storage.documents.vectors.actions.vectorize,
        {
          documentId,
          knowledgeBases,
          workspaceId,
          projectId,
        }
      );
    }

    return {
      documentId,
      summary: object.summary,
      isLong: contents.length > 5000,
    };
  },
});
