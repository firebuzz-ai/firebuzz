"use node";
import { SentenceSplitter } from "@llamaindex/core/node-parser";
import type { Document } from "@llamaindex/core/schema";
import { CSVReader } from "@llamaindex/readers/csv";
import { DocxReader } from "@llamaindex/readers/docx";
import { HTMLReader } from "@llamaindex/readers/html";
import { JSONReader } from "@llamaindex/readers/json";
import { MarkdownReader } from "@llamaindex/readers/markdown";
import { PDFReader } from "@llamaindex/readers/pdf";
import { TextFileReader } from "@llamaindex/readers/text";
import { ConvexError, v } from "convex/values";
import { internal } from "../../../../_generated/api";
import type { Id } from "../../../../_generated/dataModel";

import { asyncMap } from "convex-helpers";
import { internalAction } from "../../../../_generated/server";
import { r2 } from "../../../../helpers/r2";
import { summarizationPool } from "../../../../workpools";
import { documentsSchema } from "../schema";

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
  json: JSONReader,
} as const;

export const chunkDocument = internalAction({
  args: {
    key: v.string(),
    name: v.string(),
    type: documentsSchema.fields.type,
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    documentId: v.id("documents"),
  },
  handler: async (
    ctx,
    { type, key, name, workspaceId, projectId, documentId }
  ) => {
    try {
      // 0. Update Chunking Status
      await ctx.runMutation(
        internal.collections.storage.documents.mutations.update,
        {
          documentId,
          chunkingStatus: "processing",
        }
      );
      // 1. Download File
      const url = await r2.getUrl(key);
      const response = await fetch(url);

      if (!response.ok) {
        throw new ConvexError(`Failed to fetch file from R2: ${key}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // 2. Load File Content using appropriate reader
      let loadedDocs: Document[] = [];
      const ReaderClass =
        DOCUMENT_READERS[type as keyof typeof DOCUMENT_READERS];

      if (!ReaderClass) {
        throw new ConvexError(`Unsupported document type: ${type}`);
      }

      loadedDocs = await new ReaderClass().loadDataAsContent(uint8Array);

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

      // 3. Create a SentenceSplitter for chunking
      const splitter = new SentenceSplitter({
        chunkSize: 2048,
        chunkOverlap: 256,
      });

      // 4. Chunk the documents
      const chunkedTexts = await asyncMap(contents, async (content) => {
        return splitter.splitText(content);
      });

      // 5. Flatten the chunks
      const chunks = chunkedTexts.flat();

      // 6. Build Chunks for Convex Insertion
      const chunksToInsert: ChunkToInsert[] = chunks.map(
        (chunk, index: number) => ({
          workspaceId,
          projectId,
          documentId,
          content: chunk,
          index,
        })
      );

      // 7. Insert File Chunks into Convex
      await asyncMap(chunksToInsert, async (chunk) => {
        await ctx.runMutation(
          internal.collections.storage.documents.chunks.mutations.create,
          chunk
        );
      });

      // 8. Update Chunking Status
      await ctx.runMutation(
        internal.collections.storage.documents.mutations.update,
        {
          documentId,
          isLongDocument: contents.length > 5000,
          chunkingStatus: "chunked",
        }
      );

      // 9. Enqueue Summarization
      await summarizationPool.enqueueAction(
        ctx,
        internal.collections.storage.documents.actions.summarizeDocument,
        {
          documentId,
          name,
          content: contents.join("\n").slice(0, 20000),
          type,
        }
      );
    } catch (error) {
      // Update Chunking Status on error
      await ctx.runMutation(
        internal.collections.storage.documents.mutations.update,
        {
          documentId,
          chunkingStatus: "failed",
        }
      );
      console.error(`Failed to chunk document: ${key}`, error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to chunk document");
    }
  },
});

export const chunkMemoryItem = internalAction({
  args: {
    content: v.string(),
    name: v.string(),
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    documentId: v.id("documents"),
  },
  handler: async (
    ctx,
    { content, name, workspaceId, projectId, documentId }
  ) => {
    try {
      // 0. Update Chunking Status
      await ctx.runMutation(
        internal.collections.storage.documents.mutations.update,
        {
          documentId,
          chunkingStatus: "processing",
        }
      );
      // 1. Create Uint8Array from content
      const arrayBuffer = new TextEncoder().encode(content).buffer;
      const uint8Array = new Uint8Array(arrayBuffer);

      // 2. Load File Content using appropriate reader
      let loadedDocs: Document[] = [];

      loadedDocs = await new MarkdownReader().loadDataAsContent(uint8Array);

      // Combine loaded document content into a single string
      const contents = loadedDocs.map((doc) => doc.text);
      const maxLength = 500000;

      // If the content is too long, return early
      if (contents.join("\n").length > maxLength) {
        throw new ConvexError("Content is too long");
      }

      // 3. Create a SentenceSplitter for chunking
      const splitter = new SentenceSplitter({
        chunkSize: 2048,
        chunkOverlap: 256,
      });

      // 4. Chunk the documents
      const chunkedTexts = await asyncMap(contents, async (content) => {
        return splitter.splitText(content);
      });

      // 5. Flatten the chunks
      const chunks = chunkedTexts.flat();

      // 6. Build Chunks for Convex Insertion
      const chunksToInsert: ChunkToInsert[] = chunks.map(
        (chunk, index: number) => ({
          workspaceId,
          projectId,
          documentId,
          content: chunk,
          index,
        })
      );

      // 7. Insert File Chunks into Convex
      await asyncMap(chunksToInsert, async (chunk) => {
        await ctx.runMutation(
          internal.collections.storage.documents.chunks.mutations.create,
          chunk
        );
      });

      // 8. Update Chunking Status
      await ctx.runMutation(
        internal.collections.storage.documents.mutations.update,
        {
          documentId,
          isLongDocument: contents.length > 5000,
          chunkingStatus: "chunked",
        }
      );

      // 9. Enqueue Summarization
      await summarizationPool.enqueueAction(
        ctx,
        internal.collections.storage.documents.actions.summarizeDocument,
        {
          documentId,
          name,
          content: contents.join("\n").slice(0, 20000),
          type: "md",
        }
      );
    } catch (error) {
      // Update Chunking Status on error
      await ctx.runMutation(
        internal.collections.storage.documents.mutations.update,
        {
          documentId,
          chunkingStatus: "failed",
        }
      );
      console.error(`Failed to chunk document: ${name}`, error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to chunk document");
    }
  },
});
