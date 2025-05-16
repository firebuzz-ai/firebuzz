"use node";
import type { Document } from "@llamaindex/core/schema";
import { CSVReader } from "@llamaindex/readers/csv";
import { DocxReader } from "@llamaindex/readers/docx";
import { HTMLReader } from "@llamaindex/readers/html";
import { MarkdownReader } from "@llamaindex/readers/markdown";
import { PDFReader } from "@llamaindex/readers/pdf";
import { TextFileReader } from "@llamaindex/readers/text";
import { MDocument } from "@mastra/rag";
import { generateObject } from "ai";
import { ConvexError, v } from "convex/values";
import { z } from "zod";
import { api, internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";

import { stripIndents } from "@firebuzz/utils";
import { asyncMap } from "convex-helpers";
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

// Map of file types to their corresponding reader classes
const DOCUMENT_READERS = {
  md: MarkdownReader,
  html: HTMLReader,
  txt: TextFileReader,
  pdf: PDFReader,
  csv: CSVReader,
  docx: DocxReader,
} as const;

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
      const ReaderClass =
        DOCUMENT_READERS[type as keyof typeof DOCUMENT_READERS];

      if (!ReaderClass) {
        throw new ConvexError(`Unsupported document type: ${type}`);
      }

      loadedDocs = await new ReaderClass().loadDataAsContent(uint8Array);
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
    const mastraChunks = await asyncMap(
      mDoc,
      async (doc) =>
        await doc.chunk({
          strategy: "recursive",
          size: 2048,
          overlap: 256,
        })
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
    const chunksToInsert: ChunkToInsert[] = mastraChunks.flatMap(
      (chunk, index: number) => ({
        workspaceId,
        projectId,
        documentId,
        content: chunk.text,
        index,
      })
    );

    // 10. Insert File Chunks into Convex
    await asyncMap(chunksToInsert, async (chunk) => {
      await ctx.runMutation(
        internal.collections.storage.documents.chunks.mutations.create,
        chunk
      );
    });

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
