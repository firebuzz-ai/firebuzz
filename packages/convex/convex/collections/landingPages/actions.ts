"use node";
import { gunzipSync, gzipSync } from "node:zlib";
import { saveMessage } from "@convex-dev/agent";
import { TarFileSystem } from "@firebuzz/file-system-v2";
import { ConvexError, v } from "convex/values";
import { components, internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import { internalAction } from "../../_generated/server";
import {
	landingPageErrorAnalysisAgent,
	landingPageErrorAnalysisSchema,
} from "../../components/agent";
import { r2 } from "../../components/r2";
import { engineAPIClient } from "../../lib/engine";
import { ERRORS } from "../../utils/errors";
import {
	applyBrandAssetsToTar,
	applyCampaignToTar,
	applySeoToTar,
	applyThemeToTar,
} from "./helpers/initializeTemplate";

// Asset type constants for better maintainability
const ASSET_TYPES = {
	HTML: "html",
	SCRIPT: "script",
	STYLES: "styles",
} as const;

// Key generation helpers
const getPreviewKey = (landingPageId: string, assetType?: string) => {
	const baseKey = `landing:preview:${landingPageId}`;
	return assetType ? `${baseKey}:assets:${assetType}` : baseKey;
};

const getProductionKey = (landingPageId: string, assetType?: string) => {
	const baseKey = `landing:production:${landingPageId}`;
	return assetType ? `${baseKey}:assets:${assetType}` : baseKey;
};

// Helper to fetch asset from KV store
const fetchAsset = async (key: string) => {
	return engineAPIClient.kv.assets.$get({
		query: {
			key,
			type: "text",
			withMetadata: false,
		},
	});
};

// Helper to store asset in KV store
const storeAsset = async (key: string, value: string) => {
	return engineAPIClient.kv.assets.$post(
		{
			json: {
				key,
				value,
				options: {
					metadata: {},
				},
			},
		},
		{
			headers: {
				Authorization: `Bearer ${process.env.ENGINE_SERVICE_TOKEN}`,
			},
		},
	);
};

export const storeInKV = internalAction({
	args: {
		key: v.string(),
		html: v.string(),
		js: v.string(),
		css: v.string(),
	},
	handler: async (_ctx, { key, html, js, css }) => {
		await Promise.all([
			storeAsset(key, html),
			storeAsset(`${key}:assets:script`, js),
			storeAsset(`${key}:assets:styles`, css),
		]);
	},
});

export const storeInKVForProduction = internalAction({
	args: {
		landingPageId: v.id("landingPages"),
	},
	handler: async (ctx, { landingPageId }) => {
		// Validate landing page exists and is published
		const landingPage = await ctx.runQuery(
			internal.collections.landingPages.queries.getByIdInternal,
			{ id: landingPageId },
		);

		if (!landingPage) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (landingPage.status !== "published") {
			throw new ConvexError(
				"Landing page must be published before storing in production",
			);
		}

		try {
			// Fetch all assets from preview environment
			const [htmlResponse, jsResponse, cssResponse] = await Promise.all([
				fetchAsset(getPreviewKey(landingPageId)),
				fetchAsset(getPreviewKey(landingPageId, ASSET_TYPES.SCRIPT)),
				fetchAsset(getPreviewKey(landingPageId, ASSET_TYPES.STYLES)),
			]);

			// Parse responses and extract data
			const htmlData = await htmlResponse.json();
			const jsData = await jsResponse.json();
			const cssData = await cssResponse.json();

			// Check if responses are successful
			if (!htmlData?.success || !jsData?.success || !cssData?.success) {
				throw new ConvexError(
					"Failed to fetch assets from preview environment",
				);
			}

			const html = htmlData.data.value as string;
			const js = jsData.data.value as string;
			const css = cssData.data.value as string;

			// Validate all assets are present
			if (!html || !js || !css) {
				throw new ConvexError("Missing required assets in preview environment");
			}

			// Store all assets in production environment
			await Promise.all([
				storeAsset(getProductionKey(landingPageId), html),
				storeAsset(getProductionKey(landingPageId, ASSET_TYPES.SCRIPT), js),
				storeAsset(getProductionKey(landingPageId, ASSET_TYPES.STYLES), css),
			]);

			return {
				success: true,
				message: "Landing page successfully stored in production environment",
			};
		} catch (error) {
			console.error("Failed to store landing page in production:", error);

			if (error instanceof ConvexError) {
				throw error;
			}

			throw new ConvexError(
				"Failed to store landing page assets in production environment",
			);
		}
	},
});

export const buildAndPublishPreview = internalAction({
	args: {
		userId: v.id("users"),
		landingPageId: v.id("landingPages"),
		sessionId: v.id("agentSessions"),
	},
	handler: async (ctx, { landingPageId, sessionId, userId }) => {
		try {
			// 1. Get landing page
			const landingPage = await ctx.runQuery(
				internal.collections.landingPages.queries.getByIdInternal,
				{ id: landingPageId },
			);

			if (!landingPage || !landingPage.landingPageVersionId) {
				throw new ConvexError(ERRORS.NOT_FOUND);
			}

			// 2. Get session and sandbox
			const session = await ctx.runQuery(
				internal.collections.agentSessions.queries.getByIdInternal,
				{ id: sessionId },
			);

			if (!session || !session.sandboxId) {
				throw new ConvexError("Session or sandbox not found");
			}

			const sandbox = await ctx.runQuery(
				internal.collections.sandboxes.queries.getByIdInternal,
				{ id: session.sandboxId },
			);

			if (!sandbox || sandbox.status !== "running") {
				throw new ConvexError("Sandbox is not running");
			}

			// 3. Build the project
			const buildResult = await ctx.runAction(
				internal.collections.sandboxes.actions.buildLandingPageTool,
				{ sandboxId: sandbox._id },
			);

			// 4. Handle build failure
			if (!buildResult.success) {
				console.error(
					"[buildAndPublishPreview] Build failed:",
					buildResult.error,
				);

				// Clear isPublishing flag immediately
				await ctx.runMutation(
					internal.collections.landingPages.mutations.updateInternal,
					{ id: landingPageId, isPublishing: false },
				);

				// Analyze build error
				const { object: analysisResult } =
					await landingPageErrorAnalysisAgent.generateObject(
						ctx,
						{ userId },
						{
							prompt: `Analyze the following build error: ${buildResult.error}`,
							schema: landingPageErrorAnalysisSchema,
						},
					);

				// Format as special div for UI
				const formattedError = `<div data-error-fix="true" data-error-count="1" data-error-type="build-error">

## Build Failed

${JSON.stringify(analysisResult)}

</div>`;

				// Save the message
				const { messageId } = await saveMessage(ctx, components.agent, {
					threadId: landingPage.threadId || "",
					userId,
					message: {
						role: "user",
						content: formattedError,
					},
					agentName: "landing-page-regular",
				});

				// Send message to agent
				await ctx.runAction(
					internal.components.agent
						.sendMessageToLandingPageRegularAgentActionInternal,
					{
						threadId: landingPage.threadId || "",
						promptMessageId: messageId,
						sessionId,
						sandbox,
						landingPageId,
						model: session.model,
						knowledgeBases: [],
						workspaceId: landingPage.workspaceId,
						projectId: landingPage.projectId,
						campaignId: landingPage.campaignId,
						userId,
					},
				);

				throw new ConvexError("Build failed. Error details sent to agent.");
			}

			// 5. Extract build output
			const extractResult = await ctx.runAction(
				internal.collections.sandboxes.actions.extractBuildOutputTool,
				{ sandboxId: sandbox._id, landingPageId },
			);

			if (!extractResult.success) {
				// Clear isPublishing flag immediately
				await ctx.runMutation(
					internal.collections.landingPages.mutations.updateInternal,
					{ id: landingPageId, isPublishing: false },
				);
				throw new ConvexError(
					`Failed to extract build output: ${extractResult.error}`,
				);
			}

			// 6. Publish to preview using existing mutation
			await ctx.runMutation(
				internal.collections.landingPages.mutations.publishPreviewInternal,
				{
					id: landingPageId,
					html: extractResult.html,
					js: extractResult.js,
					css: extractResult.css,
					landingPageVersionId: landingPage.landingPageVersionId,
				},
			);

			return { success: true };
		} catch (error) {
			// Clear isPublishing flag on error
			await ctx.runMutation(
				internal.collections.landingPages.mutations.updateInternal,
				{ id: landingPageId, isPublishing: false },
			);
			throw error;
		}
	},
});

/**
 * Prepare template for landing page by applying all customizations
 * This is called inline during sandbox creation if version doesn't exist
 */
export const prepareTemplateForLandingPage = internalAction({
	args: {
		landingPageId: v.id("landingPages"),
		userId: v.id("users"),
	},
	handler: async (
		ctx,
		{ landingPageId, userId },
	): Promise<Id<"landingPageVersions">> => {
		// 1. Get landing page
		const landingPage: Doc<"landingPages"> | null = await ctx.runQuery(
			internal.collections.landingPages.queries.getByIdInternal,
			{ id: landingPageId },
		);

		if (!landingPage) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		// 2. Validate required IDs
		if (!landingPage.themeId) {
			throw new ConvexError("Landing page missing themeId");
		}

		// 3. Get all required data
		const [template, theme, campaign, brand] = await Promise.all([
			ctx.runQuery(
				internal.collections.landingPages.templates.queries.getByIdInternal,
				{
					id: landingPage.templateId,
				},
			),
			ctx.runQuery(internal.collections.brands.themes.queries.getByIdInternal, {
				id: landingPage.themeId,
			}),
			ctx.runQuery(internal.collections.campaigns.queries.getByIdInternal, {
				id: landingPage.campaignId,
			}),
			ctx.runQuery(internal.collections.brands.queries.getByProjectIdInternal, {
				projectId: landingPage.projectId,
			}),
		]);

		if (!template || !theme || !campaign || !brand) {
			throw new ConvexError("Required data not found");
		}

		// Get form if campaign is lead-generation
		const form =
			campaign.type === "lead-generation"
				? await ctx.runQuery(
						internal.collections.forms.queries.getByCampaignIdInternal,
						{ campaignId: campaign._id },
					)
				: null;

		// 3. Download template tar from R2
		if (!template.key) {
			throw new ConvexError("Template tar file not found");
		}

		const templateUrl = await r2.getUrl(template.key);
		const templateResponse = await fetch(templateUrl);

		if (!templateResponse.ok) {
			throw new ConvexError("Failed to download template tar");
		}

		const gzippedBuffer = Buffer.from(await templateResponse.arrayBuffer());

		// 4. Decompress gzipped tar and load into TarFileSystem
		const templateBuffer = gunzipSync(gzippedBuffer);
		const fs = await TarFileSystem.fromTar(templateBuffer);

		// 5. Apply all customizations in sequence
		applyThemeToTar(fs, theme);
		applyCampaignToTar(fs, campaign, form);
		applySeoToTar(fs, brand);
		applyBrandAssetsToTar(fs, brand);

		// 6. Pack modified files and compress
		const modifiedTar = await fs.toTar();
		const compressedTar = gzipSync(modifiedTar);

		console.log(
			"[prepareTemplateForLandingPage] Tar size:",
			modifiedTar.length,
			"bytes",
		);
		console.log(
			"[prepareTemplateForLandingPage] Compressed size:",
			compressedTar.length,
			"bytes",
		);

		// Debug: Try to decompress and read it back to verify
		try {
			const testDecompressed = gunzipSync(compressedTar);
			const testFs = await TarFileSystem.fromTar(testDecompressed);
			const testFiles = testFs.listFiles();
			console.log(
				"[prepareTemplateForLandingPage] Verification - can read back tar:",
				testFiles.length,
				"files",
			);
			console.log(
				"[prepareTemplateForLandingPage] Sample files:",
				testFiles.slice(0, 5),
			);
		} catch (err) {
			console.error(
				"[prepareTemplateForLandingPage] ERROR: Cannot read back our own tar!",
				err,
			);
		}

		// 7. Upload compressed tar to R2
		const key = `landing-page-versions/${landingPageId}/${crypto.randomUUID()}.tar.gz`;
		await r2.store(ctx, compressedTar, key);

		// 8. Create version record with commit (file already stored in R2)
		const {
			landingPageVersionId,
		}: { landingPageVersionId: Id<"landingPageVersions">; number: number } =
			await ctx.runMutation(
				internal.collections.landingPages.versions.mutations.createWithCommit,
				{
					landingPageId,
					key,
					commitMessage: "Initial version created from template",
					description: "Landing page initialized with customizations",
					messageId: undefined,
					workspaceId: landingPage.workspaceId,
					projectId: landingPage.projectId,
					campaignId: landingPage.campaignId,
					createdBy: userId,
				},
			);

		return landingPageVersionId;
	},
});
