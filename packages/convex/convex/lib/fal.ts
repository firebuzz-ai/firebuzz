"use node";
import { fal } from "@fal-ai/client";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action, internalAction } from "../_generated/server";
import { calculateCreditsFromSpend } from "../ai/models/helpers";

const falApiKey = process.env.FAL_AI_API_KEY;

if (!falApiKey) {
	throw new Error("FAL_AI_API_KEY is not set");
}

fal.config({
	credentials: falApiKey,
});

// Model definitions with pricing
const IMAGE_MODELS = {
	"nano-banana": {
		id: "fal-ai/nano-banana",
		name: "Nano Banana",
		cost: 0.0398,
		speed: "fast",
	},
	"imagen4-fast": {
		id: "fal-ai/imagen4/preview/fast",
		name: "Imagen 4 Fast",
		cost: 0.05,
		speed: "medium",
	},
	"imagen4-ultra": {
		id: "fal-ai/imagen4/preview/ultra",
		name: "Imagen 4 Ultra",
		cost: 0.08,
		speed: "slow",
	},
} as const;

type ImageModel = keyof typeof IMAGE_MODELS;

// Text-to-image generation
export const generateImage = internalAction({
	args: {
		prompt: v.string(),
		model: v.optional(
			v.union(
				v.literal("nano-banana"),
				v.literal("imagen4-fast"),
				v.literal("imagen4-ultra"),
			),
		),
		aspectRatio: v.optional(
			v.union(
				v.literal("1:1"),
				v.literal("16:9"),
				v.literal("9:16"),
				v.literal("3:4"),
				v.literal("4:3"),
				v.literal("3:2"),
				v.literal("2:3"),
				v.literal("21:9"),
				v.literal("5:4"),
				v.literal("4:5"),
			),
		),
		resolution: v.optional(v.union(v.literal("1K"), v.literal("2K"))),
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
		userId: v.id("users"),
		sessionId: v.optional(v.id("agentSessions")), // Optional -  agent session tool usage tracking
	},
	handler: async (
		ctx,
		args,
	): Promise<{
		success: boolean;
		cdnUrl: string | null;
		key: string | null;
		mediaId: string | null;
		requestId: string | null;
		model: string | null;
		credits: number | null;
		error: { message: string } | null;
	}> => {
		try {
			// Select model (default to nano-banana)
			const modelKey = (args.model || "nano-banana") as ImageModel;
			const modelConfig = IMAGE_MODELS[modelKey];

			// Build input based on model type
			let input: Record<string, unknown>;

			if (modelKey === "nano-banana") {
				// Nano-banana uses aspect_ratio and output_format
				input = {
					prompt: args.prompt,
					aspect_ratio: args.aspectRatio || "1:1",
					num_images: 1,
					output_format: "png",
				};
			} else {
				// Imagen4 models use aspect_ratio and resolution
				input = {
					prompt: args.prompt,
					aspect_ratio: args.aspectRatio || "1:1",
					resolution: args.resolution || "1K",
					num_images: 1,
				};
			}

			// Generate image with fal.run (synchronous request)
			const { data, requestId } = await fal.run(modelConfig.id, {
				input,
			});

			// Calculate cost
			const cost = modelConfig.cost;
			const credits = calculateCreditsFromSpend(cost);

			// Generate idempotency key
			const timestampMs = Date.now();
			const randomHex = Math.floor(Math.random() * 0xffffff)
				.toString(16)
				.padStart(6, "0");
			const idempotencyKey = `fal-generate-image:${requestId}-${timestampMs}-${randomHex}`;

			// Track usage
			await ctx.runMutation(
				internal.collections.stripe.transactions.mutations
					.addUsageIdempotentSyncWithTinybirdInternal,
				{
					amount: credits,
					idempotencyKey,
					reason: "AI Image Generation with fal.ai",
					workspaceId: args.workspaceId,
					sessionId: args.sessionId,
					userId: args.userId,
					projectId: args.projectId,
				},
			);

			// Upload to R2 and save to media gallery with AI metadata
			const imageUrl = data.images[0].url;
			const uploadResult = await ctx.runAction(
				internal.components.r2.uploadAIGeneratedImageToCDN,
				{
					url: imageUrl,
					workspaceId: args.workspaceId,
					projectId: args.projectId,
					userId: args.userId,
					filename: `generated-${requestId}.png`,
					aiMetadata: {
						prompt: args.prompt,
						size: args.aspectRatio || "1:1",
						quality: args.resolution || "1K",
					},
				},
			);

			return {
				success: uploadResult.success,
				cdnUrl: uploadResult.cdnUrl,
				key: uploadResult.key,
				mediaId: uploadResult.mediaId,
				requestId,
				model: modelConfig.name,
				credits,
				error: uploadResult.error,
			};
		} catch (error) {
			return {
				success: false,
				cdnUrl: null,
				key: null,
				mediaId: null,
				requestId: null,
				model: null,
				credits: null,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});

// Image-to-image editing (supports multiple input images)
export const editImage = internalAction({
	args: {
		prompt: v.string(),
		imageUrl: v.optional(v.string()), // Single image
		imageUrls: v.optional(v.array(v.string())), // Multiple images
		aspectRatio: v.optional(
			v.union(
				v.literal("1:1"),
				v.literal("16:9"),
				v.literal("9:16"),
				v.literal("3:4"),
				v.literal("4:3"),
				v.literal("3:2"),
				v.literal("2:3"),
				v.literal("21:9"),
				v.literal("5:4"),
				v.literal("4:5"),
			),
		),
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
		userId: v.id("users"),
		sessionId: v.optional(v.id("agentSessions")), // Optional -  agent session tool usage tracking
	},
	handler: async (
		ctx,
		args,
	): Promise<{
		success: boolean;
		cdnUrl: string | null;
		key: string | null;
		mediaId: string | null;
		requestId: string | null;
		model: string | null;
		credits: number | null;
		error: { message: string } | null;
	}> => {
		try {
			// Validate input
			if (!args.imageUrl && !args.imageUrls) {
				throw new Error("Either imageUrl or imageUrls must be provided");
			}

			// Build image_urls array (required parameter for nano-banana/edit)
			const imageUrls: string[] =
				args.imageUrls && args.imageUrls.length > 0
					? args.imageUrls
					: args.imageUrl
						? [args.imageUrl]
						: [];

			// Log the URLs being used for debugging
			console.log("[editImage] Using image URLs:", imageUrls);

			if (imageUrls.length === 0) {
				throw new Error("At least one image URL must be provided");
			}

			// Build input for fal.ai nano-banana/edit
			const input: Record<string, unknown> = {
				prompt: args.prompt,
				image_urls: imageUrls,
				num_images: 1,
				output_format: "png",
			};

			// Add aspect_ratio if provided
			if (args.aspectRatio) {
				input.aspect_ratio = args.aspectRatio;
			}

			// Edit image with fal.run (synchronous request)
			const { data, requestId } = await fal.run("fal-ai/nano-banana/edit", {
				input,
			});

			// Calculate cost (nano-banana edit costs $0.0398 per image)
			const modelConfig = IMAGE_MODELS["nano-banana"];
			const cost = modelConfig.cost;
			const credits = calculateCreditsFromSpend(cost);

			// Generate idempotency key
			const timestampMs = Date.now();
			const randomHex = Math.floor(Math.random() * 0xffffff)
				.toString(16)
				.padStart(6, "0");
			const idempotencyKey = `fal-edit-image:${requestId}-${timestampMs}-${randomHex}`;

			// Track usage
			await ctx.runMutation(
				internal.collections.stripe.transactions.mutations
					.addUsageIdempotentSyncWithTinybirdInternal,
				{
					amount: credits,
					idempotencyKey,
					reason: "AI Image Editing with fal.ai",
					workspaceId: args.workspaceId,
					sessionId: args.sessionId,
					userId: args.userId,
					projectId: args.projectId,
				},
			);

			// Upload to R2 and save to media gallery with AI metadata
			const imageUrl = data.images[0].url;
			const uploadResult = await ctx.runAction(
				internal.components.r2.uploadAIGeneratedImageToCDN,
				{
					url: imageUrl,
					workspaceId: args.workspaceId,
					projectId: args.projectId,
					userId: args.userId,
					filename: `edited-${requestId}.png`,
					aiMetadata: {
						prompt: args.prompt,
						size: args.aspectRatio || "auto",
						quality: "1K", // Edit always uses nano-banana which doesn't have resolution param
					},
				},
			);

			return {
				success: uploadResult.success,
				cdnUrl: uploadResult.cdnUrl,
				key: uploadResult.key,
				mediaId: uploadResult.mediaId,
				requestId,
				model: modelConfig.name,
				credits,
				error: uploadResult.error,
			};
		} catch (error) {
			return {
				success: false,
				cdnUrl: null,
				key: null,
				mediaId: null,
				requestId: null,
				model: null,
				credits: null,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});

// Public action for text-to-image generation with auth
export const generateImageWithAuth = action({
	args: {
		prompt: v.string(),
		model: v.optional(
			v.union(
				v.literal("nano-banana"),
				v.literal("imagen4-fast"),
				v.literal("imagen4-ultra"),
			),
		),
		aspectRatio: v.optional(
			v.union(
				v.literal("1:1"),
				v.literal("16:9"),
				v.literal("9:16"),
				v.literal("3:4"),
				v.literal("4:3"),
				v.literal("3:2"),
				v.literal("2:3"),
				v.literal("21:9"),
				v.literal("5:4"),
				v.literal("4:5"),
			),
		),
		resolution: v.optional(v.union(v.literal("1K"), v.literal("2K"))),
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
	},
	handler: async (
		ctx,
		args,
	): Promise<{
		success: boolean;
		cdnUrl: string | null;
		key: string | null;
		mediaId: string | null;
		requestId: string | null;
		model: string | null;
		credits: number | null;
		error: { message: string } | null;
	}> => {
		// Auth check
		const user = await ctx.runQuery(
			internal.collections.users.queries.getCurrentUserInternal,
		);
		if (!user) {
			return {
				success: false,
				cdnUrl: null,
				key: null,
				mediaId: null,
				requestId: null,
				model: null,
				credits: null,
				error: { message: "Unauthorized" },
			};
		}

		try {
			// Select model (default to nano-banana)
			const modelKey = (args.model || "nano-banana") as ImageModel;
			const modelConfig = IMAGE_MODELS[modelKey];

			// Build input based on model type
			let input: Record<string, unknown>;

			if (modelKey === "nano-banana") {
				// Nano-banana uses aspect_ratio and output_format
				input = {
					prompt: args.prompt,
					aspect_ratio: args.aspectRatio || "1:1",
					num_images: 1,
					output_format: "png",
				};
			} else {
				// Imagen4 models use aspect_ratio and resolution
				input = {
					prompt: args.prompt,
					aspect_ratio: args.aspectRatio || "1:1",
					resolution: args.resolution || "1K",
					num_images: 1,
				};
			}

			// Generate image with fal.run (synchronous request)
			const { data, requestId } = await fal.run(modelConfig.id, {
				input,
			});

			// Calculate cost
			const cost = modelConfig.cost;
			const credits = calculateCreditsFromSpend(cost);

			// Generate idempotency key
			const timestampMs = Date.now();
			const randomHex = Math.floor(Math.random() * 0xffffff)
				.toString(16)
				.padStart(6, "0");
			const idempotencyKey = `fal-generate-image:${requestId}-${timestampMs}-${randomHex}`;

			// Track usage
			await ctx.runMutation(
				internal.collections.stripe.transactions.mutations
					.addUsageIdempotentSyncWithTinybirdInternal,
				{
					amount: credits,
					idempotencyKey,
					reason: "AI Image Generation with fal.ai",
					workspaceId: args.workspaceId,
					userId: user._id,
					projectId: args.projectId,
				},
			);

			// Upload to R2 and save to media gallery with AI metadata
			const imageUrl = data.images[0].url;
			const uploadResult = await ctx.runAction(
				internal.components.r2.uploadAIGeneratedImageToCDN,
				{
					url: imageUrl,
					workspaceId: args.workspaceId,
					projectId: args.projectId,
					userId: user._id,
					filename: `generated-${requestId}.png`,
					aiMetadata: {
						prompt: args.prompt,
						size: args.aspectRatio || "1:1",
						quality: modelConfig.speed.toLowerCase(),
					},
				},
			);

			return {
				success: uploadResult.success,
				cdnUrl: uploadResult.cdnUrl,
				key: uploadResult.key,
				mediaId: uploadResult.mediaId,
				requestId,
				model: modelConfig.name,
				credits,
				error: uploadResult.error,
			};
		} catch (error) {
			return {
				success: false,
				cdnUrl: null,
				key: null,
				mediaId: null,
				requestId: null,
				model: null,
				credits: null,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});

// Public action for image-to-image editing with auth
export const editImageWithAuth = action({
	args: {
		prompt: v.string(),
		imageUrl: v.optional(v.string()), // Single image
		imageUrls: v.optional(v.array(v.string())), // Multiple images
		aspectRatio: v.optional(
			v.union(
				v.literal("1:1"),
				v.literal("16:9"),
				v.literal("9:16"),
				v.literal("3:4"),
				v.literal("4:3"),
				v.literal("3:2"),
				v.literal("2:3"),
				v.literal("21:9"),
				v.literal("5:4"),
				v.literal("4:5"),
			),
		),
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
	},
	handler: async (
		ctx,
		args,
	): Promise<{
		success: boolean;
		cdnUrl: string | null;
		key: string | null;
		mediaId: string | null;
		requestId: string | null;
		model: string | null;
		credits: number | null;
		error: { message: string } | null;
	}> => {
		// Auth check
		const user = await ctx.runQuery(
			internal.collections.users.queries.getCurrentUserInternal,
		);
		if (!user) {
			return {
				success: false,
				cdnUrl: null,
				key: null,
				mediaId: null,
				requestId: null,
				model: null,
				credits: null,
				error: { message: "Unauthorized" },
			};
		}

		try {
			// Validate input
			if (!args.imageUrl && !args.imageUrls) {
				throw new Error("Either imageUrl or imageUrls must be provided");
			}

			// Build image_urls array (required parameter for nano-banana/edit)
			const imageUrls: string[] =
				args.imageUrls && args.imageUrls.length > 0
					? args.imageUrls
					: args.imageUrl
						? [args.imageUrl]
						: [];

			if (imageUrls.length === 0) {
				throw new Error("At least one image URL must be provided");
			}

			// Build input for fal.ai nano-banana/edit
			const input: Record<string, unknown> = {
				prompt: args.prompt,
				image_urls: imageUrls,
				num_images: 1,
				output_format: "png",
			};

			// Add aspect_ratio if provided
			if (args.aspectRatio) {
				input.aspect_ratio = args.aspectRatio;
			}

			// Edit image with fal.run (synchronous request)
			const { data, requestId } = await fal.run("fal-ai/nano-banana/edit", {
				input,
			});

			// Calculate cost (nano-banana edit costs $0.0398 per image)
			const modelConfig = IMAGE_MODELS["nano-banana"];
			const cost = modelConfig.cost;
			const credits = calculateCreditsFromSpend(cost);

			// Generate idempotency key
			const timestampMs = Date.now();
			const randomHex = Math.floor(Math.random() * 0xffffff)
				.toString(16)
				.padStart(6, "0");
			const idempotencyKey = `fal-edit-image:${requestId}-${timestampMs}-${randomHex}`;

			// Track usage
			await ctx.runMutation(
				internal.collections.stripe.transactions.mutations
					.addUsageIdempotentSyncWithTinybirdInternal,
				{
					amount: credits,
					idempotencyKey,
					reason: "AI Image Editing with fal.ai",
					workspaceId: args.workspaceId,
					userId: user._id,
					projectId: args.projectId,
				},
			);

			// Upload to R2 and save to media gallery with AI metadata
			const imageUrl = data.images[0].url;
			const uploadResult = await ctx.runAction(
				internal.components.r2.uploadAIGeneratedImageToCDN,
				{
					url: imageUrl,
					workspaceId: args.workspaceId,
					projectId: args.projectId,
					userId: user._id,
					filename: `edited-${requestId}.png`,
					aiMetadata: {
						prompt: args.prompt,
						size: args.aspectRatio || "auto",
						quality: modelConfig.speed.toLowerCase(),
					},
				},
			);

			return {
				success: uploadResult.success,
				cdnUrl: uploadResult.cdnUrl,
				key: uploadResult.key,
				mediaId: uploadResult.mediaId,
				requestId,
				model: modelConfig.name,
				credits,
				error: uploadResult.error,
			};
		} catch (error) {
			return {
				success: false,
				cdnUrl: null,
				key: null,
				mediaId: null,
				requestId: null,
				model: null,
				credits: null,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});
