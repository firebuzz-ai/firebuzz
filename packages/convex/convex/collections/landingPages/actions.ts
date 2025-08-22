import { ConvexError, v } from "convex/values";
import { internalAction } from "../../_generated/server";

import { internal } from "../../../src";
import { engineAPIClient } from "../../lib/engine";
import { ERRORS } from "../../utils/errors";

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
			withMetadata: false
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
