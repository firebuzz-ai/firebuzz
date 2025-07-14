"use node";

import { randomUUID } from "node:crypto";
import { formatUrlWithProtocol, hashString } from "@firebuzz/utils";
import { generateObject, generateText } from "ai";
import { ConvexError, v } from "convex/values";
import { z } from "zod";
import { action, internalAction } from "../../_generated/server";
import { googleai } from "../../lib/googleai";
import { ERRORS } from "../../utils/errors";

import type {
	BatchScrapeStatusResponse,
	ScrapeResponse,
} from "@mendable/firecrawl-js";
import { internal } from "../../_generated/api";
import { r2 } from "../../components/r2";
import { engineAPIClient } from "../../lib/engine";
import type { SelectedLink } from "./utils";
import {
	categorizeContentLinks,
	extractBorderRadius,
	extractColorsFromCSS,
	extractFaviconUrl,
	extractFontsFromCSS,
	extractFooterLinks,
	extractHeadquartersContact,
	extractNavigationLinks,
	extractRelevantCSS,
	extractSiteLogo,
	extractSocialLinks,
	generateThemeFromBrandColors,
	urlToBase64,
} from "./utils";

interface DomainValidationResponse {
	isValid: boolean;
	isReachable: boolean;
	message: string;
}

const USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const createResponse = (
	isValid: boolean,
	isReachable: boolean,
	message: string,
): DomainValidationResponse => ({
	isValid,
	isReachable,
	message,
});

const validateUrlFormat = (
	domain: string,
): { isValid: boolean; url?: URL; message?: string } => {
	// Try to format the URL with protocol if missing
	const formattedUrl = formatUrlWithProtocol(domain);

	if (!formattedUrl) {
		return { isValid: false, message: "Invalid URL format" };
	}

	try {
		const parsedURL = new URL(formattedUrl);

		// Ensure we're using HTTPS for security
		if (parsedURL.protocol === "http:") {
			parsedURL.protocol = "https:";
		}

		return { isValid: true, url: parsedURL };
	} catch {
		return { isValid: false, message: "Invalid URL format" };
	}
};

const checkDomainReachability = async (
	url: URL,
): Promise<{ isReachable: boolean; message: string }> => {
	try {
		const response = await fetch(url.toString(), {
			headers: { "User-Agent": USER_AGENT },
			method: "HEAD",
			redirect: "follow",
			// Add timeout to prevent hanging requests
			signal: AbortSignal.timeout(5000), // 5 second timeout
		});

		if (!response.ok) {
			return {
				isReachable: false,
				message: `Domain returned status code ${response.status}`,
			};
		}

		return {
			isReachable: true,
			message: "Domain is reachable",
		};
	} catch (error) {
		console.error("Domain reachability check failed:", error);
		return {
			isReachable: false,
			message: "Unable to reach domain",
		};
	}
};

export const checkDomain = action({
	args: {
		domain: v.string(),
	},
	handler: async (ctx, args) => {
		const { domain } = args;

		// Early validation for empty domain
		if (!domain.trim()) {
			return createResponse(false, false, "Domain cannot be empty");
		}

		const user = await ctx.auth.getUserIdentity();
		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// 1. Validate URL Format
		const urlValidation = validateUrlFormat(domain);
		if (!urlValidation.isValid || !urlValidation.url) {
			return createResponse(
				false,
				false,
				urlValidation.message || "Invalid URL format",
			);
		}

		const parsedURL = urlValidation.url;

		// 2. Check if domain is reachable
		const reachabilityCheck = await checkDomainReachability(parsedURL);

		return createResponse(
			true,
			reachabilityCheck.isReachable,
			reachabilityCheck.message,
		);
	},
});

/**
 * Zod schema for AI-powered link selection
 * Note: OpenAI supports standard Zod schemas
 */
const linkSelectionSchema = z.object({
	selectedLinks: z
		.array(
			z.object({
				text: z.string().describe("Clean, descriptive title for the link"),
				url: z.string().describe("Full URL of the link"),
				category: z
					.enum(["navigation", "footer", "content"])
					.describe("Link category based on DOM position"),
				relevanceScore: z
					.number()
					.min(1)
					.max(10)
					.describe("Business relevance score for OnboardingData extraction"),
				description: z
					.string()
					.describe(
						"Why this page is valuable for extracting brand, features, audiences, etc.",
					),
				selected: z.boolean().describe("Always true for selected links"),
			}),
		)
		.length(4)
		.describe(
			"Exactly 4 most relevant links for business data extraction (excluding homepage)",
		),
});

export const classifyLinks = internalAction({
	args: {
		domain: v.string(),
	},
	handler: async (_ctx, args): Promise<string[]> => {
		const { domain } = args;
		const key = `firecrawl-${hashString(
			JSON.stringify({
				url: domain,
				formats: ["screenshot@fullPage", "markdown", "links", "rawHtml"],
				onlyMainContent: false,
				waitFor: 3000,
			}),
		)}`;

		// Create homepage link (always first in final selection)
		const homepageLink: SelectedLink = {
			text: "Homepage",
			url: domain,
			selected: true,
			category: "content",
			relevanceScore: 10,
			description:
				"Homepage - primary source of business information and brand overview",
		};

		// Phase 0: Get Scrape Data From KV
		let scrapeData: ScrapeResponse | null;
		try {
			const kvResponse = await engineAPIClient.kv.cache.$get({
				query: {
					key,
					type: "json",
				},
			});

			const kvData = await kvResponse.json();

			if (!kvData?.success) {
				throw new ConvexError("Scrape data is not found in KV.");
			}

			scrapeData = kvData.data.value as unknown as ScrapeResponse;
		} catch (error) {
			console.log(error);
			throw error; // Re-throw Error
		}

		if (!scrapeData) throw new ConvexError("Scrape data is not found.");

		const html = scrapeData.rawHtml ?? scrapeData.html;
		const firecrawlLinks = scrapeData.links ?? [];

		if (!html) throw new ConvexError("HTML is not found in the scrape data.");

		// Phase 1: DOM-based navigation link extraction
		const navLinks = extractNavigationLinks(html, domain);

		// Phase 2: DOM-based footer link extraction
		const footerLinks = extractFooterLinks(html, domain);

		// Phase 3: Content link categorization from Firecrawl
		const contentLinks = categorizeContentLinks(
			firecrawlLinks ?? [],
			domain,
			navLinks,
			footerLinks,
		);

		// Combine all categorized links for AI analysis
		const allCategorizedLinks = [...navLinks, ...footerLinks, ...contentLinks];

		// Early return if no links found
		if (allCategorizedLinks.length === 0) {
			return [homepageLink].map((link) => link.url);
		}

		// Phase 4: AI-powered link selection with OpenAI GPT-4
		// Limit links for AI analysis to prevent token overflow
		const linksToAnalyze = allCategorizedLinks.slice(0, 100);

		try {
			const result = await generateObject({
				model: googleai("gemini-2.5-flash-preview-05-20"),
				schema: linkSelectionSchema,
				prompt: `
          You are an AI assistant specialized in selecting the most valuable pages for comprehensive business data extraction.
          
          Your goal is to select 4 pages that will provide the most complete information for filling this business data structure:
          
          BUSINESS DATA TO EXTRACT:
          - Brand: name, description, website, phone, email, address
          - Audiences: demographics, goals, motivations, frustrations, terminology
          - Features: name, description, benefits, proof/testimonials
          - Socials: platform profiles and handles
          - Testimonials: customer reviews and feedback
          
          ANALYZE THESE CATEGORIZED LINKS FROM ${domain}:
          ${linksToAnalyze
						.map(
							(link, index) =>
								`${index + 1}. [${link.category.toUpperCase()}] ${link.url}
               Title: ${link.text}`,
						)
						.join("\n")}
          
          SELECTION STRATEGY (prioritize in this order):
          1. **Contact/About Pages** (Score 9-10) - Essential for brand info, contact details, company story
          2. **Services/Products Pages** (Score 8-9) - Core business offerings, features, benefits
          3. **Testimonials/Reviews Pages** (Score 8-9) - Social proof, customer feedback
          4. **Team/Company Pages** (Score 7-8) - Business background, company culture
          5. **Pricing/Plans Pages** (Score 7-8) - Revenue model, service tiers
          
          CATEGORY BALANCE REQUIREMENTS:
          - Include at least 1-2 navigation links (often have key business pages)
          - Include at least 1 footer link (often contact/about info)
          - Balance with 1-2 content links (detailed information)
          
          SCORING CRITERIA (1-10):
          - 10: Critical for business understanding (About, Contact, Main Services)
          - 8-9: High value for data extraction (Testimonials, Products, Team)
          - 6-7: Valuable supporting information (Features, FAQ, Pricing)
          - 4-5: Less critical but useful (Blog, News, Secondary pages)
          - 1-3: Low value for business data (Legal, Privacy, Technical docs)
          
          INSTRUCTIONS:
          - Select exactly 4 links that together provide comprehensive business understanding
          - Ensure good category distribution (nav + footer + content)
          - Prioritize pages likely to contain contact information, customer testimonials, and service descriptions
          - Avoid generic pages (privacy policies, terms, cookie policies)
          - Generate descriptive titles based on URL analysis
          - Provide clear reasoning for why each page is valuable for business data extraction
          - Mark all selected links as selected: true
        `,
			});

			const { object } = result;

			// Sort selected links by relevance score (highest first)
			const sortedSelectedLinks = object.selectedLinks.sort(
				(a, b) => b.relevanceScore - a.relevanceScore,
			);

			// Return homepage first, followed by up to 4 AI-selected links
			const finalLinks = [homepageLink, ...sortedSelectedLinks];

			return finalLinks.map((link) => link.url);
		} catch {
			console.error("❌ AI selection failed, using fallback strategy");

			// Fallback: Select top categorized links by category priority
			const fallbackSelected = allCategorizedLinks
				.sort((a, b) => {
					// Prioritize navigation > footer > content
					const categoryPriority: Record<string, number> = {
						navigation: 3,
						footer: 2,
						content: 1,
						cta: 1,
					};
					return categoryPriority[b.category] - categoryPriority[a.category];
				})
				.slice(0, 4)
				.map((link) => ({ ...link, selected: true, relevanceScore: 6 }));

			return [homepageLink, ...fallbackSelected].map((link) => link.url);
		}
	},
});

export const generateBrandData = internalAction({
	args: {
		domain: v.string(),
		urls: v.array(v.string()),
	},
	handler: async (ctx, { domain, urls }) => {
		// 1) Get Homepage Scrape Data
		const homepage: ScrapeResponse | string = await ctx.runAction(
			internal.lib.firecrawl.scrapeUrl,
			{
				url: domain,
				formats: ["screenshot@fullPage", "markdown", "links", "rawHtml"],
				onlyMainContent: false,
				waitFor: 3000,
				returnType: "full",
			},
		);

		// 2) Get Pages Scrape Data
		const pages: BatchScrapeStatusResponse | string = await ctx.runAction(
			internal.lib.firecrawl.batchScrapeUrls,
			{
				urls,
				formats: ["markdown"],
				onlyMainContent: true,
				waitFor: 1000,
			},
		);

		if (typeof pages === "string" || typeof homepage === "string") {
			throw new ConvexError("Failed to scrape data");
		}

		const allPagesWithMarkdown: {
			url: string;
			markdown: string;
			metadata?: Record<string, unknown>;
		}[] = [
			{
				url: domain,
				markdown: homepage.markdown ?? "",
				metadata: homepage.metadata ?? {},
			},
			...pages.data
				.filter((item) => Boolean(item.url) && Boolean(item.markdown))
				.map((item) => ({
					url: item.url ?? "",
					markdown: item.markdown ?? "",
				})),
		];

		try {
			const brandData = await generateObject({
				model: googleai("gemini-2.5-flash-preview-05-20"),
				schema: z.object({
					brandName: z.string().describe("The name of the brand"),
					brandDescription: z
						.string()
						.describe(
							"The description of the brand. It should be a short description of the brand and its purpose.",
						),
					brandPersona: z
						.string()
						.describe(
							"The persona of the brand to understand how it speaks, its tone, and its voice, values, mission etc.",
						),
				}),
				prompt: `
        You are a brand expert. You are given a list of URLs and it's content that are related to a brand.
        You need to generate a brand data based on the content of the URLs.
        <urls>
        ${allPagesWithMarkdown.map((item) => {
					return `
          <url>
          ${item.url}
          </url>
          <content>
          ${item.markdown}
          </content>
          <metadata>
          ${JSON.stringify(item.metadata)}
          </metadata>
          `;
				})}
        </urls>
        `,
			});

			return brandData.object;
		} catch (error) {
			console.error(error);
			throw new ConvexError("Failed to generate brand data");
		}
	},
});

export const generateBrandTheme = internalAction({
	args: {
		domain: v.string(),
	},
	handler: async (ctx, args) => {
		const { domain } = args;

		// 1) Get Homepage Scrape Data
		const homepage: ScrapeResponse | string = await ctx.runAction(
			internal.lib.firecrawl.scrapeUrl,
			{
				url: domain,
				formats: ["screenshot@fullPage", "markdown", "links", "rawHtml"],
				onlyMainContent: false,
				waitFor: 3000,
				returnType: "full",
			},
		);

		if (typeof homepage === "string") {
			throw new ConvexError("Failed to scrape data");
		}

		const html = homepage.rawHtml ?? homepage.html;
		const screenshotUrl = homepage.screenshot;

		if (!html) {
			throw new ConvexError("HTML is not found in the scrape data.");
		}

		try {
			// Step 1: Extract and preprocess CSS
			const extractedCSS = extractRelevantCSS(html);

			// Step 2: Analyze screenshot with enhanced guidance (if provided)
			let screenshotAnalysis = "";
			if (screenshotUrl) {
				try {
					// Handle screenshot format (URL vs base64)
					let processedScreenshot = screenshotUrl;
					if (screenshotUrl.startsWith("http")) {
						const base64Data = await urlToBase64(screenshotUrl);
						if (!base64Data) {
							throw new Error("Failed to convert screenshot URL to base64");
						}
						processedScreenshot = base64Data;
					}

					// Remove data URL prefix if present
					if (processedScreenshot.startsWith("data:image")) {
						processedScreenshot = processedScreenshot.split(",")[1];
					}

					const visualAnalysis = await generateText({
						model: googleai("gemini-2.5-flash-preview-05-20"),
						messages: [
							{
								role: "user",
								content: [
									{
										type: "text",
										text: `Analyze this website homepage screenshot to extract precise design elements:

**COLOR EXTRACTION STRATEGY:**
1. **Primary Color**: Look for the most prominent brand color used in:
   - Buttons (especially CTAs like "Sign Up", "Get Started", "Buy Now")
   - Navigation active states and hover effects
   - Brand logos and headers
   - Links and interactive elements
   - Progress bars, badges, or accent elements

2. **Secondary Color**: Identify supporting colors used in:
   - Secondary buttons or elements
   - Backgrounds or cards
   - Supporting UI elements

3. **Accent Color**: Find accent colors used for:
   - Highlights, badges, or notifications
   - Special elements or callouts
   - Complementary design elements

4. **Text Color**: Identify the main text color by examining:
   - Body paragraphs and content text
   - Navigation menu items
   - Article text and descriptions
   - Avoid colored headings - focus on readable body text

5. **Background Color**: Determine the dominant background by looking at:
   - Main page/content area background
   - Header/navigation background
   - Card or section backgrounds
   - Avoid footer or sidebar colors

**FONT IDENTIFICATION:**
- Examine text carefully to identify font families
- Look for distinctive characteristics (rounded vs sharp, condensed vs wide)
- Common web fonts: Inter, Roboto, Open Sans, Lato, Montserrat, Poppins
- Note different fonts for headings vs body text
- Identify Sans-serif, Serif, and Monospace fonts separately

**DESIGN PATTERNS:**
- Border radius: Sharp corners (0-2px), moderate (4-8px), or rounded (12px+)
- Look at buttons, cards, input fields, and images
- Overall aesthetic: Modern/minimal, traditional, playful, professional

Be specific about hex color values you can observe and exact font names.`,
									},
									{
										type: "image",
										image: `data:image/png;base64,${processedScreenshot}`,
									},
								],
							},
						],
					});

					screenshotAnalysis = visualAnalysis.text;
				} catch (error) {
					console.error("❌ Screenshot analysis failed:", error);
					screenshotAnalysis =
						"Screenshot analysis failed - using CSS analysis only.";
				}
			} else {
				screenshotAnalysis =
					"No screenshot provided - using CSS analysis only.";
			}

			// Step 3: Generate theme using AI analysis
			const aiThemeSchema = z.object({
				colors: z.object({
					primary: z.string().describe("Primary brand color in hex format"),
					secondary: z.string().describe("Secondary color in hex format"),
					accent: z.string().describe("Accent color in hex format"),
				}),
				radius: z
					.string()
					.describe("Border radius in rem (e.g., '0.5rem', '0.75rem', '1rem')"),
				fonts: z
					.array(
						z.object({
							family: z
								.enum(["sans", "serif", "mono"])
								.describe("Font family type"),
							name: z
								.string()
								.describe(
									"Font name (e.g., 'Inter', 'Georgia', 'JetBrains Mono')",
								),
							type: z
								.enum(["google", "system", "custom"])
								.describe("Font type"),
						}),
					)
					.length(3)
					.describe(
						"Exactly 3 fonts: one for each family type (sans, serif, mono)",
					),
			});

			let aiGeneratedTheme: z.infer<typeof aiThemeSchema>;

			try {
				const themeResult = await generateObject({
					model: googleai("gemini-2.5-flash-preview-05-20"),
					schema: aiThemeSchema,
					prompt: `You are an expert UI/UX designer. Create a brand theme by analyzing the visual screenshot and extracted CSS data.

**PRIORITY: Visual Screenshot Analysis**
${screenshotAnalysis}

**Supporting CSS Data (Extracted from HTML):**
${extractedCSS.cssText}

**Brand Context:**
Brand Domain: ${domain}

**Theme Generation Guidelines:**

1. **Colors** (all in hex format #RRGGBB):
   - **primary**: Use the most prominent brand color from visual analysis (buttons, links, CTAs)
   - **secondary**: Supporting color, often a muted or complementary color
   - **accent**: Highlight color for special elements, badges, or notifications
   - All colors must be distinct and work well together

2. **Radius** (CSS rem value):
   - Based on visual button/card corner styles
   - Use values like "0.25rem" (sharp), "0.5rem" (moderate), "0.75rem" (rounded), "1rem" (very rounded)

3. **Fonts** (exactly 3 fonts, one for each family):
   - **sans**: Modern sans-serif font for body text (e.g., Inter, Roboto, Open Sans)
   - **serif**: Elegant serif font for headings (e.g., Georgia, Playfair Display, Merriweather)  
   - **mono**: Monospace font for code (e.g., JetBrains Mono, Fira Code, Source Code Pro)
   
   For each font:
   - **family**: Must be exactly "sans", "serif", or "mono"
   - **name**: Clean font name without fallbacks
   - **type**: "google" for Google Fonts, "system" for system fonts, "custom" for others

**Font Selection Strategy:**
- Prioritize Google Fonts for better web compatibility
- Use fonts identified in visual analysis or CSS
- Ensure good readability and brand alignment
- Popular choices: Inter/Roboto (sans), Georgia/Merriweather (serif), JetBrains Mono/Fira Code (mono)

Extract accurate values prioritizing the visual analysis over CSS data when available.`,
				});

				aiGeneratedTheme = themeResult.object;
			} catch (error) {
				console.error(
					"❌ AI theme generation failed, using enhanced fallback:",
					error,
				);

				// Enhanced fallback using improved extraction
				const extractedColors = extractColorsFromCSS(extractedCSS);
				const extractedFonts = extractFontsFromCSS(extractedCSS);
				const extractedRadius = extractBorderRadius(extractedCSS);

				aiGeneratedTheme = {
					colors: {
						primary: extractedColors.primaryColor,
						secondary: extractedColors.secondaryColor,
						accent: extractedColors.accentColor,
					},
					radius: extractedRadius,
					fonts: [
						{
							family: "sans" as const,
							name: extractedFonts.sansFont,
							type: "google" as const,
						},
						{
							family: "serif" as const,
							name: extractedFonts.serifFont,
							type: "google" as const,
						},
						{
							family: "mono" as const,
							name: extractedFonts.monoFont,
							type: "google" as const,
						},
					],
				};
			}

			// Step 4: Generate complete theme objects from all brand colors
			const lightTheme = generateThemeFromBrandColors(
				aiGeneratedTheme.colors.primary,
				aiGeneratedTheme.colors.secondary,
				aiGeneratedTheme.colors.accent,
				true,
			);
			const darkTheme = generateThemeFromBrandColors(
				aiGeneratedTheme.colors.primary,
				aiGeneratedTheme.colors.secondary,
				aiGeneratedTheme.colors.accent,
				false,
			);

			// Create complete theme object matching the schema
			const completeTheme = {
				lightTheme: {
					...lightTheme,
					radius: aiGeneratedTheme.radius,
				},
				darkTheme,
				fonts: aiGeneratedTheme.fonts,
			};

			return completeTheme;
		} catch (error) {
			console.error("❌ Brand theme generation error:", error);

			// Ultimate fallback theme with complete theme objects
			const fallbackPrimary = "#3B82F6";
			const fallbackSecondary = "#64748B";
			const fallbackAccent = "#F59E0B";
			const fallbackLightTheme = generateThemeFromBrandColors(
				fallbackPrimary,
				fallbackSecondary,
				fallbackAccent,
				true,
			);
			const fallbackDarkTheme = generateThemeFromBrandColors(
				fallbackPrimary,
				fallbackSecondary,
				fallbackAccent,
				false,
			);

			const fallbackTheme = {
				lightTheme: {
					...fallbackLightTheme,
					radius: "0.5rem",
				},
				darkTheme: fallbackDarkTheme,
				fonts: [
					{
						family: "sans" as const,
						name: "Inter",
						type: "google" as const,
					},
					{
						family: "serif" as const,
						name: "Georgia",
						type: "system" as const,
					},
					{
						family: "mono" as const,
						name: "JetBrains Mono",
						type: "google" as const,
					},
				],
			};

			return fallbackTheme;
		}
	},
});

export const findAndUploadSiteLogo = internalAction({
	args: {
		domain: v.string(),
		projectId: v.id("projects"),
		workspaceId: v.id("workspaces"),
		createdBy: v.id("users"),
	},
	handler: async (
		ctx,
		{ domain, projectId, workspaceId, createdBy },
	): Promise<string | null> => {
		// 1) Get Homepage Scrape Data (Returns from KV)
		const homepage: ScrapeResponse | string = await ctx.runAction(
			internal.lib.firecrawl.scrapeUrl,
			{
				url: domain,
				formats: ["screenshot@fullPage", "markdown", "links", "rawHtml"],
				onlyMainContent: false,
				waitFor: 3000,
				returnType: "full",
			},
		);

		if (typeof homepage === "string") {
			throw new ConvexError("Failed to scrape data");
		}

		const html = homepage.rawHtml ?? homepage.html;

		if (!html) {
			throw new ConvexError("HTML is not found in the scrape data.");
		}

		const logoUrl = extractSiteLogo(html, domain);

		if (!logoUrl) {
			return null;
		}

		const key = `${workspaceId}/${projectId}/${randomUUID()}`;

		try {
			// Check if the URL is a data URL (like data:image/svg+xml;base64,...)
			if (logoUrl.startsWith("data:")) {
				// Handle data URLs directly
				const [mimeInfo, base64Data] = logoUrl.split(",");

				if (!base64Data) {
					throw new ConvexError("Invalid data URL format");
				}

				// Extract MIME type from data URL
				const mimeTypeMatch = mimeInfo.match(/data:([^;]+)/);
				const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/svg+xml";

				// Convert base64 to buffer
				const buffer = Buffer.from(base64Data, "base64");
				const blob = new Blob([buffer], { type: mimeType });

				await r2.store(ctx, blob, { key, type: mimeType });
				return key;
			}

			// Handle regular URLs
			const response = await fetch(logoUrl);

			if (!response.ok) {
				throw new ConvexError(`Failed to fetch logo: ${response.status}`);
			}

			const imageBuffer = await response.arrayBuffer();
			const contentType = response.headers.get("content-type") || "image/png";
			const extension = contentType.split("/")[1];
			const fileName = `logo.${extension}`;
			const imageBlob = new Blob([imageBuffer], { type: contentType });

			await r2.store(ctx, imageBlob, { key, type: contentType });

			// Create Media
			await ctx.runMutation(
				internal.collections.storage.media.mutations.createInternal,
				{
					key,
					name: fileName,
					contentType,
					size: imageBuffer.byteLength,
					type: "image",
					workspaceId,
					projectId,
					createdBy,
					source: "uploaded",
				},
			);

			return key;
		} catch (error) {
			console.error("Failed to upload logo:", error);
			return null;
		}
	},
});

export const findAndUploadFavicon = internalAction({
	args: {
		domain: v.string(),
		projectId: v.id("projects"),
		workspaceId: v.id("workspaces"),
		createdBy: v.id("users"),
	},
	handler: async (
		ctx,
		{ domain, projectId, workspaceId, createdBy },
	): Promise<string | null> => {
		// 1) Get Homepage Scrape Data (Returns from KV)
		const homepage: ScrapeResponse | string = await ctx.runAction(
			internal.lib.firecrawl.scrapeUrl,
			{
				url: domain,
				formats: ["screenshot@fullPage", "markdown", "links", "rawHtml"],
				onlyMainContent: false,
				waitFor: 3000,
				returnType: "full",
			},
		);

		if (typeof homepage === "string") {
			throw new ConvexError("Failed to scrape data");
		}

		const html = homepage.rawHtml ?? homepage.html;

		if (!html) {
			throw new ConvexError("HTML is not found in the scrape data.");
		}

		const faviconUrl = extractFaviconUrl(html, domain);

		if (!faviconUrl) {
			return null;
		}

		const key = `${workspaceId}/${projectId}/${randomUUID()}`;

		try {
			// Check if the URL is a data URL (like data:image/svg+xml;base64,...)
			if (faviconUrl.startsWith("data:")) {
				// Handle data URLs directly
				const [mimeInfo, base64Data] = faviconUrl.split(",");

				if (!base64Data) {
					throw new ConvexError("Invalid data URL format");
				}

				// Extract MIME type from data URL
				const mimeTypeMatch = mimeInfo.match(/data:([^;]+)/);
				const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/svg+xml";

				// Convert base64 to buffer
				const buffer = Buffer.from(base64Data, "base64");
				const blob = new Blob([buffer], { type: mimeType });

				await r2.store(ctx, blob, { key, type: mimeType });
				return key;
			}

			// Handle regular URLs
			const response = await fetch(faviconUrl);

			if (!response.ok) {
				throw new ConvexError(`Failed to fetch logo: ${response.status}`);
			}

			const imageBuffer = await response.arrayBuffer();
			const contentType = response.headers.get("content-type") || "image/png";
			const extension = contentType.split("/")[1];
			const fileName = `favicon.${extension}`;
			const imageBlob = new Blob([imageBuffer], { type: contentType });

			await r2.store(ctx, imageBlob, { key, type: contentType });

			// Create Media
			await ctx.runMutation(
				internal.collections.storage.media.mutations.createInternal,
				{
					key,
					name: fileName,
					contentType,
					size: imageBuffer.byteLength,
					type: "image",
					workspaceId,
					projectId,
					createdBy,
					source: "uploaded",
				},
			);

			return key;
		} catch (error) {
			console.error("Failed to upload logo:", error);
			return null;
		}
	},
});

const audienceSchema = z.object({
	name: z
		.string()
		.describe(
			"Audience segment name (be specific, e.g., 'Small Business Owners', 'Tech Startups')",
		),
	description: z
		.string()
		.describe(
			"Detailed description of this audience including demographics, psychographics, and business context",
		),
	avatar: z
		.union([
			z.literal("old-female-1"),
			z.literal("old-male-1"),
			z.literal("old-female-2"),
			z.literal("old-male-2"),
			z.literal("mid-female-1"),
			z.literal("mid-male-1"),
			z.literal("mid-female-2"),
			z.literal("mid-male-2"),
			z.literal("mid-female-3"),
			z.literal("mid-male-3"),
			z.literal("young-female-1"),
			z.literal("young-male-1"),
			z.literal("young-female-2"),
			z.literal("young-male-2"),
			z.literal("young-female-3"),
			z.literal("young-male-3"),
		])
		.describe(
			"The key of the avatar image. Use age and gender to determine key. If currently used same key, use different key.",
		)
		.default("old-female-1"),
	age: z
		.enum(["18-24", "25-34", "35-44", "45-54", "55-64", "65+"])
		.describe("Primary age range based on typical users"),
	gender: z
		.enum(["male", "female"])
		.describe("Primary gender (choose most likely based on industry/content)"),
	goals: z
		.string()
		.describe(
			"Specific business or personal goals this audience wants to achieve",
		),
	motivations: z
		.string()
		.describe(
			"Key motivations, desires, and drivers that influence their decisions",
		),
	frustrations: z
		.string()
		.describe("Main pain points, challenges, and obstacles they face"),
	terminologies: z
		.array(z.string())
		.describe(
			"Industry terms, keywords, and language they commonly use (5-8 terms)",
		),
});

const featureSchema = z.object({
	name: z.string().describe("Feature, product, or service name"),
	description: z
		.string()
		.describe("Clear, detailed description of what this feature/service does"),
	benefits: z
		.string()
		.describe(
			"Specific value proposition and benefits for customers - focus on outcomes and results",
		),
	proof: z
		.string()
		.describe(
			"Evidence, social proof, testimonials, case studies, or validation that supports the benefits",
		),
});

const socialSchema = z.object({
	platform: z
		.enum([
			"facebook",
			"instagram",
			"twitter",
			"linkedin",
			"youtube",
			"tiktok",
			"pinterest",
			"snapchat",
			"reddit",
			"discord",
			"twitch",
			"dribbble",
			"github",
			"gitlab",
			"medium",
			"devto",
			"hashnode",
			"stackoverflow",
		])
		.describe("Social media platform"),
	handle: z.string().describe("Username or handle without @ symbol"),
	url: z.string().describe("Full URL to the profile"),
});

const testimonialSchema = z.object({
	name: z.string().describe("Customer name or company name"),
	content: z.string().describe("Full testimonial content or review text"),
	title: z.string().describe("Customer title, role, or company"),
	rating: z.number().describe("Rating score if available (1-5)"),
});

const seoSchema = z.object({
	metaTitleDivider: z
		.union([z.literal("|"), z.literal("-"), z.literal("•"), z.literal(":")])
		.describe("The divider between the brand name and the page title"),
	metaTitle: z.string().describe("Fallback meta title of brand"),
	metaDescription: z.string().describe("Fallback meta description of brand"),
	opengraph: z.object({
		title: z.string().describe("The title of the page"),
		description: z.string().describe("The description of the page"),
	}),
	twitterCard: z.object({
		title: z.string().describe("The title of the page"),
		description: z.string().describe("The description of the page"),
	}),
});

const generationSchema = z.object({
	// Brand Information
	brandEmail: z.string().optional().describe("The email of the brand"),
	brandPhone: z.string().optional().describe("The phone of the brand"),
	brandAddress: z.string().optional().describe("The address of the brand"),

	// Target Audiences
	audiences: z
		.array(audienceSchema)
		.describe("The target audiences of the brand"),

	// Value-Focused Features & Services
	features: z
		.array(featureSchema)
		.describe("The features and services of the brand"),

	// Social Media Profiles
	socials: z
		.array(socialSchema)
		.describe("The social media profiles of the brand"),

	// Customer Testimonials
	testimonials: z
		.array(testimonialSchema)
		.describe("The testimonials of the brand"),

	// SEO
	seo: seoSchema,
});

export const generateMarketingData = internalAction({
	args: {
		brandName: v.string(),
		brandDescription: v.string(),
		brandPersona: v.string(),
		domain: v.string(),
		urls: v.array(v.string()),
	},
	handler: async (
		ctx,
		{ domain, urls, brandName, brandDescription, brandPersona },
	): Promise<z.infer<typeof generationSchema>> => {
		// 1) Get Homepage Scrape Data
		const homepage: ScrapeResponse | string = await ctx.runAction(
			internal.lib.firecrawl.scrapeUrl,
			{
				url: domain,
				formats: ["screenshot@fullPage", "markdown", "links", "rawHtml"],
				onlyMainContent: false,
				waitFor: 3000,
				returnType: "full",
			},
		);

		// 2) Get Pages Scrape Data
		const pages: BatchScrapeStatusResponse | string = await ctx.runAction(
			internal.lib.firecrawl.batchScrapeUrls,
			{
				urls,
				formats: ["markdown"],
				onlyMainContent: true,
				waitFor: 1000,
				returnType: "full",
			},
		);

		if (typeof pages === "string" || typeof homepage === "string") {
			throw new ConvexError("Failed to scrape data");
		}

		// Combine all content for analysis
		const combinedContent = [
			`=== HOMEPAGE (${domain}) ===`,
			`TITLE: ${homepage.metadata?.title || domain}`,
			`DESCRIPTION: ${homepage.metadata?.description || "No description"}`,
			"CONTENT:",
			homepage.markdown,
			"METADATA:",
			JSON.stringify(homepage.metadata),
			"\n\n",
			"=== ADDITIONAL PAGES ===",
			...pages.data.map(
				(page) => `
=== PAGE: ${page.url} ===
TITLE: ${page.title}
CONTENT:
${page.markdown}
METADATA:
${JSON.stringify(page.metadata)}
`,
			),
		].join("\n\n");

		const extractedContact = extractHeadquartersContact(combinedContent, [
			{
				url: domain,
				markdown: homepage.markdown ?? "",
				title: homepage.metadata?.title || domain,
				success: true,
			},
			...pages.data.map((page) => ({
				url: page.url ?? "",
				markdown: page.markdown ?? "",
				title: page.title ?? "",
				success: true,
			})),
		]);

		// Extract social media links

		const extractedSocials = extractSocialLinks(combinedContent);

		// 3) Generate Marketing Data
		const result = await generateObject({
			model: googleai("gemini-2.5-flash-preview-05-20"),
			schema: generationSchema,
			prompt: `You are an expert business analyst specializing in comprehensive business intelligence extraction. Analyze the following website content and extract detailed business information for marketing automation and CRM integration.

**PRIMARY LANGUAGE**: Extract all content in English

**WEBSITE CONTEXT**:
Domain: ${domain}
Homepage Title: ${homepage.metadata?.title || "N/A"}
Pages Analyzed: ${pages.data.length + 1} (homepage + ${pages.data.length} additional pages)
Total Content: ${Math.round(combinedContent.length / 1024)}KB

**BRAND INFORMATION**:
Brand Name: ${brandName}
Brand Description: ${brandDescription}
Brand Persona: ${brandPersona}

**HEADQUARTERS CONTACT DETECTED**:
${extractedContact.phone ? `Phone: ${extractedContact.phone}` : "Phone: Not found"}
${extractedContact.email ? `Email: ${extractedContact.email}` : "Email: Not found"}
${extractedContact.address ? `Address: ${extractedContact.address}` : "Address: Not found"}

**SOCIAL MEDIA LINKS DETECTED**:
${extractedSocials.length > 0 ? extractedSocials.map((s) => `${s.platform}: @${s.handle}`).join(", ") : "None found in navigation"}

**DETAILED EXTRACTION REQUIREMENTS**:

1. **CONTACT INFORMATION**:
   - Extract the contact information from the website
   - DO NOT MAKE UP CONTACT INFORMATION

2. **DETAILED TARGET AUDIENCES** (Extract 2-4 specific segments):
   - Create realistic, detailed personas based on the content analysis
   - Be specific with audience names (e.g., "SaaS Startup Founders", "E-commerce Store Owners")
   - Include detailed demographic and psychographic profiles
   - Extract specific goals that align with the business offerings
   - Identify precise motivations and pain points mentioned in the content
   - Include 5-8 industry-specific terms/keywords each audience would use
   - Base age/gender on typical users for this type of business

3. **VALUE-FOCUSED FEATURES & SERVICES** (Extract key offerings):
   - Extract actual products, services, or features mentioned in the content
   - Focus on customer outcomes and measurable benefits (ROI, time savings, efficiency gains)
   - Include specific value propositions and competitive advantages
   - Extract social proof, testimonials, case studies, or validation mentioned
   - Emphasize results and transformations, not just features

4. **SOCIAL MEDIA PROFILES** (Use detected links + content analysis):
   - Include the social links already detected: ${extractedSocials.map((s) => `${s.platform}:${s.url}`).join(", ")}
   - Extract additional social profiles mentioned in content
   - Ensure handles are accurate (without @ symbol)
   - Verify platform names match the enum options

5. **CUSTOMER TESTIMONIALS & SOCIAL PROOF** (EXACT EXTRACTION):
   - Extract actual customer testimonials, reviews, or case studies EXACTLY as they appear on the website
   - **PRESERVE EXACT CONTENT**: Copy testimonials word-for-word, maintaining original punctuation, quotes, and formatting
   - Include customer names, companies, and titles exactly as written
   - Create SEO-optimized versions highlighting key benefits mentioned in the original testimonial
   - Include ratings or scores if mentioned
   - Focus on specific results and outcomes mentioned in the original text
   - Do NOT paraphrase or modify testimonial content - extract it verbatim

6. **SEO**:
   - Extract the SEO information from the website
   - DO NOT MAKE UP SEO INFORMATION
   - Use mostly the homepage data to generate the SEO information

**CONTENT TO ANALYZE**:
${combinedContent.substring(0, 45000)}${combinedContent.length > 45000 ? "\n\n[Content truncated for prompt length...]" : ""}

**QUALITY GUIDELINES**:
- Prioritize information from "About Us", "Contact", "Services", "Products", "Team" pages
- Create detailed, realistic business personas (not generic ones)
- Extract actual value propositions and benefits mentioned
- Use professional, business-appropriate language
- Base all information on actual content analysis
- If specific details aren't available, make reasonable business inferences based on industry and context
- Ensure all extracted social links are valid and properly formatted
- Focus on headquarters/main business contact info, not location-specific details`,
		});

		return result.object;
	},
});

const lightGenerationSchema = z.object({
	// Target Audiences
	audiences: z
		.array(audienceSchema)
		.describe("The target audiences of the brand"),

	// Value-Focused Features & Services
	features: z
		.array(featureSchema)
		.describe("The features and services of the brand"),

	// SEO
	seo: seoSchema,
});

export const generateMarketingDataLight = internalAction({
	args: {
		brandName: v.string(),
		brandDescription: v.string(),
		brandPersona: v.string(),
	},
	handler: async (
		_ctx,
		{ brandName, brandDescription, brandPersona },
	): Promise<z.infer<typeof lightGenerationSchema>> => {
		// Generate Marketing Data based only on brand information
		const result = await generateObject({
			model: googleai("gemini-2.5-flash-preview-05-20"),
			schema: lightGenerationSchema,
			prompt: `You are an expert business analyst specializing in creating comprehensive business intelligence based on brand information. Generate detailed business information for marketing automation and CRM integration.

**PRIMARY LANGUAGE**: Generate all content in English

**BRAND INFORMATION**:
Brand Name: ${brandName}
Brand Description: ${brandDescription}
Brand Persona: ${brandPersona}

**GENERATION REQUIREMENTS**:

1. **DETAILED TARGET AUDIENCES** (Generate 2-4 specific segments):
   - Create realistic, detailed personas based on the brand information
   - Be specific with audience names (e.g., "SaaS Startup Founders", "E-commerce Store Owners")
   - Include detailed demographic and psychographic profiles
   - Generate specific goals that align with the brand's likely offerings
   - Identify precise motivations and pain points that would match this brand
   - Include 5-8 industry-specific terms/keywords each audience would use
   - Base age/gender on typical users for this type of business based on brand description

2. **VALUE-FOCUSED FEATURES & SERVICES** (Generate key offerings):
   - Create realistic products, services, or features based on the brand description
   - Focus on customer outcomes and measurable benefits (ROI, time savings, efficiency gains)
   - Include specific value propositions and competitive advantages
   - Generate realistic social proof concepts that would support these features
   - Emphasize results and transformations, not just features
   - Make features align with the brand persona and description

3. **SEO OPTIMIZATION**:
   - Generate SEO-optimized meta titles and descriptions based on brand information
   - Create compelling meta titles that include the brand name and key value proposition
   - Write meta descriptions that highlight main benefits and include call-to-action
   - Use the brand persona to determine appropriate tone and messaging
   - Ensure all SEO content aligns with the brand description and target market

**QUALITY GUIDELINES**:
- Create detailed, realistic business personas that match the brand description
- Generate actual value propositions and benefits that align with the brand persona
- Use professional, business-appropriate language that matches the brand voice
- Base all information on logical business inferences from the brand information provided
- Ensure generated content is specific and actionable, not generic
- Make all features and audiences cohesive with the overall brand story
- Focus on creating a complete, believable business profile from the brand foundation`,
		});

		return result.object;
	},
});

export const fillDefaultKnowledgeBase = internalAction({
	args: {
		domain: v.string(),
		urls: v.array(v.string()),
		knowledgeBaseId: v.id("knowledgeBases"),
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
		createdBy: v.id("users"),
	},
	handler: async (
		ctx,
		{ domain, urls, knowledgeBaseId, workspaceId, projectId, createdBy },
	): Promise<void> => {
		// 1) Get Homepage Scrape Data
		const homepage: ScrapeResponse | string = await ctx.runAction(
			internal.lib.firecrawl.scrapeUrl,
			{
				url: domain,
				formats: ["screenshot@fullPage", "markdown", "links", "rawHtml"],
				onlyMainContent: false,
				waitFor: 3000,
				returnType: "full",
			},
		);

		// 2) Get Pages Scrape Data
		const pages: BatchScrapeStatusResponse | string = await ctx.runAction(
			internal.lib.firecrawl.batchScrapeUrls,
			{
				urls,
				formats: ["markdown"],
				onlyMainContent: true,
				waitFor: 1000,
				returnType: "full",
			},
		);

		if (typeof pages === "string" || typeof homepage === "string") {
			throw new ConvexError("Failed to scrape data");
		}

		// 3) Prepare all pages with markdown content
		const allPagesWithMarkdown: {
			url: string;
			markdown: string;
			title: string;
		}[] = [
			{
				url: domain,
				markdown: homepage.markdown ?? "",
				title: homepage.metadata?.title || "Homepage",
			},
			...pages.data
				.filter((item) => Boolean(item.url) && Boolean(item.markdown))
				.map((item) => ({
					url: item.url ?? "",
					markdown: item.markdown ?? "",
					title: item.title || item.url?.split("/").pop() || "Untitled Page",
				})),
		];

		// 4) Create knowledge base items for each page
		for (const page of allPagesWithMarkdown) {
			if (!page.markdown.trim()) {
				console.log(`Skipping empty page: ${page.url}`);
				continue;
			}

			try {
				// Generate a clean filename from the page title/URL
				const cleanTitle = page.title
					.replace(/[^a-zA-Z0-9\s-]/g, "")
					.replace(/\s+/g, "-")
					.toLowerCase()
					.substring(0, 50);

				const fileName = `${cleanTitle}.md`;
				const key = `${workspaceId}/${projectId}/knowledge/${fileName}`;

				// Create markdown file content with metadata
				const fileContent = `# ${page.title}

**Source URL:** ${page.url}
**Generated:** ${new Date().toISOString()}

---

${page.markdown}`;

				// Store file in R2
				const blob = new Blob([fileContent], { type: "text/markdown" });
				await r2.store(ctx, blob, { key, type: "text/markdown" });

				// Create memory item in database
				await ctx.runMutation(
					internal.collections.storage.documents.mutations
						.createMemoryItemInternal,
					{
						key,
						name: fileName,
						content: fileContent,
						contentType: "text/markdown",
						type: "md",
						size: new TextEncoder().encode(fileContent).length,
						knowledgeBase: knowledgeBaseId,
						workspaceId,
						projectId,
						createdBy,
					},
				);

				console.log(
					`Created knowledge base item for: ${page.title} (${page.url})`,
				);
			} catch (error) {
				console.error(
					`Failed to create knowledge base item for ${page.url}:`,
					error,
				);
				// Continue with other pages even if one fails
			}
		}

		console.log(
			`Successfully processed ${allPagesWithMarkdown.length} pages for knowledge base`,
		);
	},
});

export const createCheckoutSession = action({
	args: {
		onboardingId: v.id("onboarding"),
		stripeLineItems: v.array(
			v.object({
				price: v.string(),
				quantity: v.number(),
				adjustable_quantity: v.optional(
					v.object({
						enabled: v.boolean(),
						minimum: v.number(),
						maximum: v.number(),
					}),
				),
			}),
		),
		baseUrl: v.string(),
		isTrialActive: v.boolean(),
	},
	handler: async (ctx, args): Promise<string | null> => {
		const user = await ctx.auth.getUserIdentity();

		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// Get onboarding data
		const onboarding = await ctx.runQuery(
			internal.collections.onboarding.queries.getByIdInternal,
			{
				onboardingId: args.onboardingId,
			},
		);

		if (!onboarding) {
			throw new ConvexError("Onboarding not found");
		}

		// Get workspace to get customer ID
		const workspace = await ctx.runQuery(
			internal.collections.workspaces.queries.getByIdInternal,
			{
				id: onboarding.workspaceId,
			},
		);

		if (!workspace) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (!workspace.customerId) {
			throw new ConvexError("Stripe customer not found for workspace");
		}

		// Create checkout session
		const sessionUrl = await ctx.runAction(
			internal.lib.stripe.createCheckoutSession,
			{
				stripeCustomerId: workspace.customerId,
				stripeLineItems: args.stripeLineItems,
				successUrl: `${args.baseUrl}/new/workspace`,
				cancelUrl: `${args.baseUrl}/new/workspace`,
				isTrialActive: args.isTrialActive ?? false,
			},
		);

		// Return the checkout URL
		return sessionUrl;
	},
});
