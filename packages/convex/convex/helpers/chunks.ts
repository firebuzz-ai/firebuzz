"use node";

import { CSVReader } from "@llamaindex/readers/csv";
import { DocxReader } from "@llamaindex/readers/docx";
import { HTMLReader } from "@llamaindex/readers/html";
import { MarkdownReader } from "@llamaindex/readers/markdown";
import { PDFReader } from "@llamaindex/readers/pdf";
import { TextFileReader } from "@llamaindex/readers/text";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";
import { documentsSchema } from "../collections/storage/documents/schema";
import { r2 } from "./r2";

export const createFileChunks = internalAction({
  args: {
    key: v.string(),
    type: documentsSchema.fields.type,
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    documentId: v.id("documents"),
  },
  handler: async (ctx, { key, type, workspaceId, projectId, documentId }) => {
    let documents: string[];

    // Get URL
    const url = await r2.getUrl(key);

    // Get Array Buffer
    const arrayBuffer = await fetch(url)
      .then((res) => res.arrayBuffer())
      .catch((err) => {
        console.error(err);
        return null;
      });

    if (!arrayBuffer) {
      throw new Error("Failed to get array buffer");
    }

    const uint8Array = new Uint8Array(arrayBuffer);

    // Chunk File
    switch (type) {
      case "md":
        documents = await new MarkdownReader()
          .loadDataAsContent(uint8Array)
          .then((documents) => documents.map((document) => document.text));
        break;
      case "mdx":
        documents = await new MarkdownReader()
          .loadDataAsContent(uint8Array)
          .then((documents) => documents.map((document) => document.text));
        break;
      case "html":
        documents = await new HTMLReader()
          .loadDataAsContent(uint8Array)
          .then((documents) => documents.map((document) => document.text));
        break;
      case "txt":
        documents = await new TextFileReader()
          .loadDataAsContent(uint8Array)
          .then((documents) => documents.map((document) => document.text));
        break;
      case "pdf":
        documents = await new PDFReader()
          .loadDataAsContent(uint8Array)
          .then((documents) => documents.map((document) => document.text));
        break;
      case "csv":
        documents = await new CSVReader()
          .loadDataAsContent(uint8Array)
          .then((documents) => documents.map((document) => document.text));
        break;
      case "docx":
        documents = await new DocxReader()
          .loadDataAsContent(uint8Array)
          .then((documents) => documents.map((document) => document.text));
        break;
      default:
        throw new Error(`Unsupported content type: ${type}`);
    }

    // Build Chunks
    const chunksToInsert = documents.map((document) => ({
      workspaceId,
      projectId,
      documentId,
      content: document,
    }));

    // Insert File Chunks
    const fileChunkPromises = chunksToInsert.map(async (chunk) => {
      const chunkId: Id<"documentChunks"> = await ctx.runMutation(
        internal.collections.storage.documentChunks.mutations.create,
        {
          workspaceId,
          projectId,
          documentId,
          content: chunk.content,
        }
      );
      return chunkId;
    });

    const createdChunks = await Promise.all(fileChunkPromises);

    return chunksToInsert.map((chunk, index) => ({
      id: createdChunks[index],
      ...chunk,
    }));
  },
});
