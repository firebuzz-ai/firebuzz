"use node";
import { hashString, sleep } from "@firebuzz/utils";
import { generateObject } from "ai";
import Cloudflare from "cloudflare";
import { ConvexError, v } from "convex/values";
import { z } from "zod";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { r2 } from "../components/r2";
import { ragWebsiteAnalysis } from "../components/rag";
import { rateLimiter } from "../components/ratelimits";
import { ERRORS } from "../utils/errors";
import { engineAPIClient } from "./engine";
import { openRouter } from "./openRouter";

const engineServiceToken = process.env.ENGINE_SERVICE_TOKEN;

const apiKey = process.env.CLOUDFLARE_API_KEY;
const apiEmail = process.env.CLOUDFLARE_EMAIL;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

if (!apiKey || !apiEmail) throw new Error(ERRORS.ENVS_NOT_INITIALIZED);

export const cloudflare = new Cloudflare({
	apiKey,
	apiEmail,
});

// Browser Rendering requires API Token (not API Key/Email)
if (!apiToken) {
	throw new Error("CLOUDFLARE_API_TOKEN not configured");
}

export const cloudflareBrowserRendering = new Cloudflare({
	apiToken,
});

/**
 * Take a snapshot of a URL using Cloudflare Browser Rendering
 * Captures HTML content and screenshot of the rendered page
 */
export const takeURLSnapshot = internalAction({
	args: {
		url: v.string(),
		sessionId: v.id("agentSessions"),
		waitUntil: v.optional(
			v.union(
				v.literal("load"),
				v.literal("domcontentloaded"),
				v.literal("networkidle0"),
				v.literal("networkidle2"),
			),
		),
		fullPage: v.optional(v.boolean()),
		timeout: v.optional(v.number()),
	},
	handler: async (
		ctx,
		{ url, sessionId, waitUntil = "load", fullPage = true, timeout },
	): Promise<
		| {
				success: true;
				html: string;
				screenshotUrl: string;
				mediaId: string;
				url: string;
				error: null;
		  }
		| {
				success: false;
				html: null;
				screenshotUrl: null;
				mediaId: null;
				url: null;
				error: { message: string };
		  }
	> => {
		try {
			// Check rate limit
			const { ok } = await rateLimiter.limit(ctx, "takeURLSnapshot", {
				key: sessionId,
				throws: false,
			});

			if (!ok) {
				return {
					success: false,
					html: null,
					screenshotUrl: null,
					mediaId: null,
					url: null,
					error: {
						message:
							"Rate limit exceeded. Please wait before taking another snapshot.",
					},
				};
			}

			if (!accountId) {
				throw new ConvexError("CLOUDFLARE_ACCOUNT_ID not configured");
			}

			// Get session to extract workspace and project IDs
			const session = await ctx.runQuery(
				internal.collections.agentSessions.queries.getByIdInternal,
				{ id: sessionId },
			);

			if (!session) {
				throw new ConvexError("Session not found");
			}

			// Generate cache key
			const cacheKey = `url-snapshot-${hashString(
				JSON.stringify({
					url,
					waitUntil: waitUntil ?? "load",
					fullPage: fullPage ?? true,
				}),
			)}`;

			// Try to get from cache first
			let snapshotData: { html: string; screenshot: string };

			try {
				const kvResponse = await engineAPIClient.kv.cache.$get(
					{
						query: {
							key: cacheKey,
							type: "json",
							withMetadata: false,
						},
					},
					{
						headers: {
							Authorization: `Bearer ${engineServiceToken}`,
						},
					},
				);

				const kvData = await kvResponse.json();

				if (kvData?.success) {
					console.log("[takeURLSnapshot] Cache hit for:", url);
					snapshotData = kvData.data.value as {
						html: string;
						screenshot: string;
					};
				} else {
					throw new Error("Cache miss");
				}
			} catch (_error) {
				// Cache miss or error - fetch from Cloudflare
				console.log("[takeURLSnapshot] Cache miss for:", url);

				// Use Cloudflare SDK to create snapshot
				const snapshot =
					await cloudflareBrowserRendering.browserRendering.snapshot.create({
						account_id: accountId,
						url,
						gotoOptions: {
							waitUntil,
							...(timeout && { timeout }),
						},
						screenshotOptions: {
							fullPage,
						},
					});

				snapshotData = {
					html: snapshot.content,
					screenshot: snapshot.screenshot,
				};

				// Store in cache for future requests
				try {
					await engineAPIClient.kv.cache.$post({
						json: {
							key: cacheKey,
							value: JSON.stringify(snapshotData),
							options: {
								metadata: {
									url,
								},
								expirationTtl: 1000 * 60 * 60 * 24 * 7, // 7 days
							},
						},
					});
					console.log("[takeURLSnapshot] Cached snapshot for:", url);
				} catch (cacheError) {
					console.error("[takeURLSnapshot] Failed to cache:", cacheError);
					// Don't fail the request if caching fails
				}
			}

			// Decode base64 screenshot and store in R2
			const screenshotBuffer = Buffer.from(snapshotData.screenshot, "base64");
			const screenshotBlob = new Blob([screenshotBuffer], {
				type: "image/png",
			});

			// Generate R2 key
			const key = `${session.workspaceId}/${session.projectId}/url-snapshots/${crypto.randomUUID()}.png`;

			// Store in R2
			await r2.store(ctx, screenshotBlob, { key, type: "image/png" });

			// Generate filename from URL
			const urlObj = new URL(url);
			const fileName = `${urlObj.hostname}-snapshot.png`;

			// Create media record
			const mediaId = await ctx.runMutation(
				internal.collections.storage.media.mutations.createInternal,
				{
					key,
					name: fileName,
					contentType: "image/png",
					size: screenshotBuffer.byteLength,
					type: "image",
					source: "url-snapshot",
					workspaceId: session.workspaceId,
					projectId: session.projectId,
					createdBy: session.createdBy,
				},
			);

			// Get signed URL for the screenshot
			const screenshotUrl = await r2.getUrl(key);

			return {
				success: true,
				html: snapshotData.html,
				screenshotUrl,
				mediaId,
				url,
				error: null,
			};
		} catch (error) {
			console.error("[takeURLSnapshot] Error:", error);

			return {
				success: false,
				html: null,
				screenshotUrl: null,
				mediaId: null,
				url: null,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});

/**
 * Capture a screenshot of a published landing page
 * Stores screenshot in R2 and updates landing page thumbnailUrl
 * This is a scheduled action that runs after publishing (non-blocking)
 */
export const captureLandingPageScreenshot = internalAction({
	args: {
		landingPageId: v.id("landingPages"),
		url: v.string(),
	},
	handler: async (
		ctx,
		{ landingPageId, url },
	): Promise<
		| {
				success: true;
				screenshotUrl: string;
				error: null;
		  }
		| {
				success: false;
				screenshotUrl: null;
				error: { message: string };
		  }
	> => {
		try {
			// Check rate limit (shares the same limit as takeURLSnapshot)
			const { ok } = await rateLimiter.limit(ctx, "takeURLSnapshot", {
				key: landingPageId,
				throws: false,
			});

			if (!ok) {
				console.warn(
					`[captureLandingPageScreenshot] Rate limit exceeded for landing page ${landingPageId}`,
				);
				return {
					success: false,
					screenshotUrl: null,
					error: {
						message:
							"Rate limit exceeded. Screenshot will be captured on next publish.",
					},
				};
			}

			if (!accountId) {
				throw new ConvexError("CLOUDFLARE_ACCOUNT_ID not configured");
			}

			console.log(
				`[captureLandingPageScreenshot] Capturing screenshot for ${url}`,
			);

			// Add a small delay to ensure preview is fully accessible
			await sleep(2000); // 2 seconds

			// Use Cloudflare SDK to capture screenshot
			const snapshot =
				await cloudflareBrowserRendering.browserRendering.snapshot.create({
					account_id: accountId,
					url,
					gotoOptions: {
						waitUntil: "networkidle0", // Wait for network to be idle
						timeout: 30000, // 30 second timeout
					},
					screenshotOptions: {
						fullPage: false, // Above-the-fold capture
					},
				});

			// Decode base64 screenshot
			const screenshotBuffer = Buffer.from(snapshot.screenshot, "base64");
			const screenshotBlob = new Blob([screenshotBuffer], {
				type: "image/png",
			});

			// Generate R2 key in screenshots directory
			const key = `screenshots/${landingPageId}/${crypto.randomUUID()}.png`;

			console.log(
				`[captureLandingPageScreenshot] Storing screenshot at ${key}`,
			);

			// Store in R2
			await r2.store(ctx, screenshotBlob, { key, type: "image/png" });

			// Build public URL using R2_PUBLIC_URL
			const r2PublicUrl = process.env.R2_PUBLIC_URL;
			if (!r2PublicUrl) {
				throw new ConvexError("R2_PUBLIC_URL not configured");
			}

			const screenshotUrl = `${r2PublicUrl}/${key}`;

			// Update landing page with thumbnail URL
			await ctx.runMutation(
				internal.collections.landingPages.mutations.updateInternal,
				{
					id: landingPageId,
					thumbnailUrl: screenshotUrl,
				},
			);

			console.log(
				`[captureLandingPageScreenshot] Successfully captured screenshot for landing page ${landingPageId}`,
			);

			return {
				success: true,
				screenshotUrl,
				error: null,
			};
		} catch (error) {
			console.error(
				`[captureLandingPageScreenshot] Error capturing screenshot for landing page ${landingPageId}:`,
				error,
			);

			// Don't throw - this shouldn't block the publish flow
			return {
				success: false,
				screenshotUrl: null,
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

/**
 * Schema for website analysis result
 */
const websiteAnalysisSchema = z.object({
	sections: z
		.array(
			z.object({
				section: z
					.string()
					.describe("Section name (e.g., 'hero', 'nav', 'footer')"),
				content: z.string().describe("HTML content of the section"),
				images: z
					.array(z.string())
					.default([])
					.describe("Image URLs found in the section"),
			}),
		)
		.describe(
			"Array of main sections found on the page. Must include at least one section.",
		),
	summary: z
		.string()
		.describe(
			"Brief 1-2 sentence summary of the website's purpose and content",
		),
	fonts: z
		.array(z.string())
		.default(["sans-serif"])
		.describe(
			"Font families detected on the page. Include actual font names like 'Inter', 'Roboto', etc.",
		),
	colors: z
		.array(z.string())
		.default(["#000000"])
		.describe(
			"Primary colors used in hex format (e.g., #3B82F6). Extract 3-5 most prominent colors.",
		),
});

/**
 * Take a snapshot of a website and analyze its structure with AI
 * Stores analysis in RAG for later querying
 */
export const takeWebsiteSnapshot = internalAction({
	args: {
		url: v.string(),
		sessionId: v.id("agentSessions"),
		waitUntil: v.optional(
			v.union(
				v.literal("load"),
				v.literal("domcontentloaded"),
				v.literal("networkidle0"),
				v.literal("networkidle2"),
			),
		),
		fullPage: v.optional(v.boolean()),
		timeout: v.optional(v.number()),
	},
	handler: async (
		ctx,
		{ url, sessionId, waitUntil = "load", fullPage = true, timeout },
	): Promise<
		| {
				success: true;
				html: string;
				screenshotUrl: string;
				mediaId: string;
				url: string;
				analysis: z.infer<typeof websiteAnalysisSchema>;
				error: null;
		  }
		| {
				success: false;
				html: null;
				screenshotUrl: null;
				mediaId: null;
				url: null;
				analysis: null;
				error: { message: string };
		  }
	> => {
		try {
			// Check rate limit
			const { ok, retryAfter } = await ctx.runQuery(
				internal.components.ratelimits.checkLimit,
				{
					name: "takeURLSnapshot",
				},
			);

			if (!ok) {
				await sleep(retryAfter);
			}

			if (!accountId) {
				throw new ConvexError("CLOUDFLARE_ACCOUNT_ID not configured");
			}

			// Get session to extract workspace and project IDs
			const session = await ctx.runQuery(
				internal.collections.agentSessions.queries.getByIdInternal,
				{ id: sessionId },
			);

			if (!session) {
				throw new ConvexError("Session not found");
			}

			// Generate cache key for complete analysis result
			const cacheKey = `website-analysis-v2-${hashString(
				JSON.stringify({
					url,
					waitUntil: waitUntil ?? "load",
					fullPage: fullPage ?? true,
				}),
			)}`;

			// Try to get complete cached result first
			try {
				const kvResponse = await engineAPIClient.kv.cache.$get(
					{
						query: {
							key: cacheKey,
							type: "json",
							withMetadata: false,
						},
					},
					{
						headers: {
							Authorization: `Bearer ${engineServiceToken}`,
						},
					},
				);

				const kvData = await kvResponse.json();

				if (kvData?.success && kvData.data?.value) {
					console.log("[takeWebsiteSnapshot] Complete cache hit for:", url);
					const cachedResult = kvData.data.value as {
						html: string;
						screenshotUrl: string;
						mediaId: string;
						url: string;
						analysis: z.infer<typeof websiteAnalysisSchema>;
					};

					// RAG is already populated from previous run, just return cached data
					return {
						success: true,
						...cachedResult,
						error: null,
					};
				}
			} catch (_cacheError) {
				console.log(
					"[takeWebsiteSnapshot] Cache miss, will generate fresh:",
					url,
				);
			}

			// Cache miss - proceed with full snapshot and analysis
			let snapshotData: { html: string; screenshot: string };

			try {
				// Check if we have raw snapshot cached (for backwards compatibility)
				const rawCacheKey = `website-snapshot-${hashString(
					JSON.stringify({
						url,
						waitUntil: waitUntil ?? "load",
						fullPage: fullPage ?? true,
					}),
				)}`;

				const rawKvResponse = await engineAPIClient.kv.cache.$get(
					{
						query: {
							key: rawCacheKey,
							type: "json",
							withMetadata: false,
						},
					},
					{
						headers: {
							Authorization: `Bearer ${engineServiceToken}`,
						},
					},
				);

				const rawKvData = await rawKvResponse.json();

				if (rawKvData?.success) {
					console.log("[takeWebsiteSnapshot] Raw snapshot cache hit for:", url);
					snapshotData = rawKvData.data.value as {
						html: string;
						screenshot: string;
					};
				} else {
					throw new Error("Raw cache miss");
				}
			} catch (_error) {
				// No cached snapshot - fetch from Cloudflare
				console.log("[takeWebsiteSnapshot] Fetching from Cloudflare:", url);

				// Use Cloudflare SDK to create snapshot
				const snapshot =
					await cloudflareBrowserRendering.browserRendering.snapshot.create({
						account_id: accountId,
						url,
						gotoOptions: {
							waitUntil,
							...(timeout && { timeout }),
						},
						screenshotOptions: {
							fullPage,
						},
					});

				snapshotData = {
					html: snapshot.content,
					screenshot: snapshot.screenshot,
				};
			}

			// Analyze HTML with AI
			console.log("[takeWebsiteSnapshot] Analyzing HTML with AI");
			const { object: analysis } = await generateObject({
				model: openRouter.chat("google/gemini-2.5-flash"),
				schema: websiteAnalysisSchema,
				messages: [
					{
						role: "user",
						content: [
							{
								type: "text",
								text: `You are analyzing a website to extract its structure and design information.

HTML Content (first 50000 chars):
${snapshotData.html.substring(0, 50000)}

Your task is to analyze both the HTML and the screenshot (provided below) and return a JSON object with:

1. **sections** (required, array): Identify the main sections of the page. Common sections include:
   - navigation/header (nav, header elements)
   - hero (main banner/heading section)
   - features (product features, benefits)
   - about (company/product info)
   - pricing (pricing tables, plans)
   - testimonials (customer reviews, quotes)
   - cta (call-to-action sections)
   - footer (bottom section with links)

   For each section, provide:
   - section: A descriptive name (lowercase, e.g., "hero", "nav", "features")
   - content: The HTML markup for that section (extract actual HTML tags)
   - images: Array of image URLs found in that section (src attributes from img tags, can be empty array)

2. **summary** (required, string): Write a 1-2 sentence summary describing what this website is about and its purpose.

3. **fonts** (array): List the font families you can detect from:
   - CSS font-family declarations in the HTML
   - Common fonts visible in the screenshot (e.g., Inter, Roboto, Open Sans, Montserrat, Poppins)
   - If you cannot detect specific fonts, return an empty array or ["sans-serif"]

4. **colors** (array): Extract 3-5 primary colors used in the design by analyzing the screenshot:
   - Look at headers, buttons, backgrounds, and prominent UI elements
   - Return colors in hex format (e.g., #3B82F6, #10B981)
   - Focus on brand colors, not just black/white/gray
   - If colors are hard to determine, return an empty array or ["#000000"]

IMPORTANT: You MUST provide at least one section and a summary. These fields are required.`,
							},
							{
								type: "image",
								image: snapshotData.screenshot,
							},
						],
					},
				],
			});

			console.log("[takeWebsiteSnapshot] Analysis complete:", analysis);

			// Store analysis in RAG
			const normalizedUrl = normalizeUrl(url);
			const namespace = `website-${hashString(normalizedUrl)}`;

			console.log("[takeWebsiteSnapshot] Storing in RAG namespace:", namespace);

			// Store each section as a separate document
			for (const section of analysis.sections) {
				await ragWebsiteAnalysis.add(ctx, {
					namespace,
					text: `Section: ${section.section}\n\nContent:\n${section.content}\n\nImages:\n${section.images.join("\n")}`,
				});
			}

			// Store summary and metadata
			await ragWebsiteAnalysis.add(ctx, {
				namespace,
				text: `Website Summary: ${analysis.summary}\n\nFonts: ${analysis.fonts.join(", ")}\n\nColors: ${analysis.colors.join(", ")}`,
			});

			console.log("[takeWebsiteSnapshot] Stored in RAG successfully");

			// Decode base64 screenshot and store in R2
			const screenshotBuffer = Buffer.from(snapshotData.screenshot, "base64");
			const screenshotImageData = new Uint8Array(screenshotBuffer);

			// Generate R2 key
			const key = `${session.workspaceId}/${session.projectId}/website-snapshots/${crypto.randomUUID()}.png`;

			// Store in R2
			await r2.store(ctx, screenshotImageData, { key, type: "image/png" });

			// Generate filename from URL
			const urlObj = new URL(url);
			const fileName = `${urlObj.hostname}-snapshot.png`;

			// Create media record
			const mediaId = await ctx.runMutation(
				internal.collections.storage.media.mutations.createInternal,
				{
					key,
					name: fileName,
					contentType: "image/png",
					size: screenshotBuffer.byteLength,
					type: "image",
					source: "url-snapshot",
					workspaceId: session.workspaceId,
					projectId: session.projectId,
					createdBy: session.createdBy,
				},
			);

			// Get signed URL for the screenshot
			const screenshotUrl = await r2.getUrl(key);

			// Prepare result
			const result = {
				html: snapshotData.html,
				screenshotUrl,
				mediaId,
				url,
				analysis,
			};

			// Cache complete result for future requests (7 days)
			try {
				await engineAPIClient.kv.cache.$post(
					{
						json: {
							key: cacheKey,
							value: JSON.stringify(result),
							options: {
								metadata: {
									url,
									cachedAt: new Date().toISOString(),
								},
								expirationTtl: 1000 * 60 * 60 * 24 * 7, // 7 days
							},
						},
					},
					{
						headers: {
							Authorization: `Bearer ${engineServiceToken}`,
						},
					},
				);
				console.log("[takeWebsiteSnapshot] Cached complete result for:", url);
			} catch (cacheError) {
				console.error(
					"[takeWebsiteSnapshot] Failed to cache result:",
					cacheError,
				);
				// Don't fail the request if caching fails
			}

			return {
				success: true,
				...result,
				error: null,
			};
		} catch (error) {
			console.error("[takeWebsiteSnapshot] Error:", error);

			return {
				success: false,
				html: null,
				screenshotUrl: null,
				mediaId: null,
				url: null,
				analysis: null,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});
