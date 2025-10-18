import { RAG } from "@convex-dev/rag";
import { hashString } from "@firebuzz/utils";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { openai } from "../lib/openai";
import { openRouter } from "../lib/openRouter";

// Initialize RAG instance for website analysis
export const ragWebsiteAnalysis = new RAG(components.rag, {
	textEmbeddingModel: openai.embedding("text-embedding-3-small"),
	embeddingDimension: 1536,
});

/**
 * Ask a question about a previously snapshotted website using RAG
 */
export const askToWebsite = internalAction({
	args: {
		url: v.string(),
		query: v.string(),
		sessionId: v.id("agentSessions"),
	},
	handler: async (
		ctx,
		{ url, query },
	): Promise<
		| {
				success: true;
				answer: string;
				context: string[];
				error: null;
		  }
		| {
				success: false;
				answer: null;
				context: null;
				error: { message: string };
		  }
	> => {
		try {
			// Generate namespace from URL
			const normalizedUrl = normalizeUrl(url);
			const namespace = `website-${hashString(normalizedUrl)}`;

			console.log("[askToWebsite] Querying RAG namespace:", namespace);

			// Query RAG
			const { text, context } = await ragWebsiteAnalysis.generateText(ctx, {
				search: {
					namespace,
					limit: 10,
				},
				prompt: query,
				model: openRouter.chat("google/gemini-2.5-flash"),
			});

			// Extract text content from context
			const contextTexts = context.results.flatMap((c) =>
				c.content.map((c) => c.text),
			);

			return {
				success: true,
				answer: text,
				context: contextTexts,
				error: null,
			};
		} catch (error) {
			console.error("[askToWebsite] Error:", error);

			return {
				success: false,
				answer: null,
				context: null,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});

/**
 * Normalize URL for consistent hashing
 * @param url - URL to normalize
 * @returns Normalized URL string
 */
function normalizeUrl(url: string): string {
	try {
		const urlObj = new URL(url);
		// Lowercase, remove www prefix, remove trailing slash
		const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, "");
		const pathname = urlObj.pathname.replace(/\/$/, "");
		return `${hostname}${pathname}`;
	} catch {
		// Fallback to basic normalization
		return url
			.toLowerCase()
			.replace(/^https?:\/\/(www\.)?/, "")
			.replace(/\/$/, "");
	}
}
