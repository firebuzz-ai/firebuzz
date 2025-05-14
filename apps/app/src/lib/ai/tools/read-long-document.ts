import { auth } from "@clerk/nextjs/server";
import {
  ConvexError,
  api,
  fetchAction,
  fetchQuery,
} from "@firebuzz/convex/nextjs";
import { stripIndents } from "@firebuzz/utils";
import { tool } from "ai";
import { z } from "zod";

export const readLongDocument = tool({
  description: stripIndents`
    Read the content of a long document. Use this to if readDocument return a long document.
  `,
  parameters: z.object({
    key: z.string(),
    query: z.string(),
  }),
  execute: async ({ key, query }) => {
    try {
      // Get Token
      const token = await (await auth()).getToken({ template: "convex" });

      if (!token) {
        return new Response("Unauthorized", { status: 401 });
      }

      // Get Document ID
      const document = await fetchQuery(
        api.collections.storage.documents.queries.getDocumentIdByKey,
        {
          key,
        },
        {
          token,
        }
      );

      if (!document) {
        return {
          success: false,
          message: "Document not found",
        };
      }

      // Search in Document Chunks
      const results = await fetchAction(
        api.collections.storage.documents.vectors.actions.vectorSearch,
        {
          documentId: document._id,
          query,
        },
        {
          token,
        }
      );

      return {
        success: true,
        results,
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message:
          error instanceof ConvexError
            ? error.message
            : "An error occurred while reading the file",
      };
    }
  },
});
