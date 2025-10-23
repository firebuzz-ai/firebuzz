import { R2 } from "@convex-dev/r2";
import { ConvexError, v } from "convex/values";
import { components, internal } from "../_generated/api";
import {
	internalAction,
	internalMutation,
	mutation,
	query,
} from "../_generated/server";
import { getCurrentUserWithWorkspace } from "../collections/users/utils";

export const r2 = new R2(components.r2);

export const { syncMetadata } = r2.clientApi();

export const generateUploadUrl = mutation({
	args: {},
	handler: async (ctx) => {
		const user = await getCurrentUserWithWorkspace(ctx);
		const key = `${user.currentWorkspaceId}/${user.currentProjectId}/${crypto.randomUUID()}`;
		return r2.generateUploadUrl(key);
	},
});

export const getImageUrl = query({
	args: {
		key: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new ConvexError("Unauthorized");
		}

		return r2.getUrl(args.key);
	},
});

export const deletePermanent = internalMutation({
	args: {
		key: v.string(),
	},
	handler: async (ctx, args) => {
		return r2.deleteObject(ctx, args.key);
	},
});

export const uploadFromURL = internalAction({
	args: {
		url: v.string(),
		projectId: v.id("projects"),
		workspaceId: v.id("workspaces"),
	},
	handler: async (ctx, args) => {
		const image = await fetch(args.url);
		const imageBuffer = await image.arrayBuffer();
		const imageData = new Uint8Array(imageBuffer);
		const key = `${args.workspaceId}/${args.projectId}/${crypto.randomUUID()}`;

		await r2.store(ctx, imageData, {
			key,
			type: image.headers.get("content-type") || "image/png",
		});

		return key;
	},
});

export const uploadUserAvatarFromURL = internalAction({
	args: {
		url: v.string(),
		userExternalId: v.string(),
	},
	handler: async (ctx, args) => {
		const image = await fetch(args.url);
		const imageBuffer = await image.arrayBuffer();
		const imageData = new Uint8Array(imageBuffer);
		const key = `users/${args.userExternalId}/avatar-${crypto.randomUUID()}`;

		await r2.store(ctx, imageData, {
			key,
			type: image.headers.get("content-type") || "image/png",
		});

		await ctx.runMutation(
			internal.collections.users.mutations.updateAvatarInternal,
			{
				imageKey: key,
				userExternalId: args.userExternalId,
			},
		);
	},
});

export const getObject = internalAction({
	args: {
		key: v.string(),
	},
	handler: async (_ctx, args) => {
		// Get signed URL for the object
		const url = await r2.getUrl(args.key);

		// Fetch the object content
		const response = await fetch(url);
		if (!response.ok) {
			throw new ConvexError(
				`Failed to fetch object from R2: ${response.statusText}`,
			);
		}

		// Return as array buffer
		const arrayBuffer = await response.arrayBuffer();
		return new Uint8Array(arrayBuffer);
	},
});

export const uploadImageToCDN = internalAction({
	args: {
		url: v.string(),
		filename: v.optional(v.string()),
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
		userId: v.id("users"),
	},
	handler: async (
		ctx,
		{ url, filename, workspaceId, projectId, userId },
	): Promise<
		| {
				success: true;
				cdnUrl: string;
				key: string;
				mediaId: string;
				error: null;
		  }
		| {
				success: false;
				cdnUrl: null;
				key: null;
				mediaId: null;
				error: { message: string };
		  }
	> => {
		try {
			// Fetch image from URL
			const response = await fetch(url);

			if (!response.ok) {
				throw new ConvexError(
					`Failed to fetch image from URL: ${response.statusText}`,
				);
			}

			// Get content type and generate filename
			const contentType = response.headers.get("content-type") || "image/png";

			// Validate it's an image
			if (!contentType.startsWith("image/")) {
				throw new ConvexError(
					`URL does not point to an image. Content-Type: ${contentType}`,
				);
			}

			const extension = contentType.split("/")[1] || "png";
			const name =
				filename || `agent-upload-${Date.now()}.${extension.split("+")[0]}`;

			// Store in R2
			const imageBuffer = await response.arrayBuffer();
			const imageData = new Uint8Array(imageBuffer);
			const key = `${workspaceId}/${projectId}/${crypto.randomUUID()}.${extension.split("+")[0]}`;

			await r2.store(ctx, imageData, { key, type: contentType });

			// Create media record
			const mediaId = await ctx.runMutation(
				internal.collections.storage.media.mutations.createInternal,
				{
					key,
					name,
					contentType,
					size: imageBuffer.byteLength,
					type: "image",
					source: "uploaded",
					workspaceId,
					projectId,
					createdBy: userId,
				},
			);

			// Generate CDN URL
			const r2PublicUrl = process.env.R2_PUBLIC_URL;
			if (!r2PublicUrl) {
				throw new ConvexError("R2_PUBLIC_URL not configured");
			}
			const cdnUrl = `${r2PublicUrl}/${key}`;

			return {
				success: true,
				cdnUrl,
				key,
				mediaId,
				error: null,
			};
		} catch (error) {
			console.error("[uploadImageToCDN] Error:", error);

			return {
				success: false,
				cdnUrl: null,
				key: null,
				mediaId: null,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});

// Upload AI-generated image to CDN with metadata
export const uploadAIGeneratedImageToCDN = internalAction({
	args: {
		url: v.string(),
		filename: v.optional(v.string()),
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
		userId: v.id("users"),
		aiMetadata: v.object({
			prompt: v.string(),
			size: v.string(),
			quality: v.string(),
		}),
	},
	handler: async (
		ctx,
		{ url, filename, workspaceId, projectId, userId, aiMetadata },
	): Promise<
		| {
				success: true;
				cdnUrl: string;
				key: string;
				mediaId: string;
				error: null;
		  }
		| {
				success: false;
				cdnUrl: null;
				key: null;
				mediaId: null;
				error: { message: string };
		  }
	> => {
		try {
			// Fetch image from URL
			const response = await fetch(url);

			if (!response.ok) {
				throw new ConvexError(
					`Failed to fetch image from URL: ${response.statusText}`,
				);
			}

			// Get content type and generate filename
			const contentType = response.headers.get("content-type") || "image/png";

			// Validate it's an image
			if (!contentType.startsWith("image/")) {
				throw new ConvexError(
					`URL does not point to an image. Content-Type: ${contentType}`,
				);
			}

			const extension = contentType.split("/")[1] || "png";
			const name =
				filename || `ai-generated-${Date.now()}.${extension.split("+")[0]}`;

			// Store in R2
			const imageBuffer = await response.arrayBuffer();
			const imageData = new Uint8Array(imageBuffer);
			const key = `${workspaceId}/${projectId}/${crypto.randomUUID()}.${extension.split("+")[0]}`;

			await r2.store(ctx, imageData, { key, type: contentType });

			// Create media record with AI metadata
			const mediaId = await ctx.runMutation(
				internal.collections.storage.media.mutations.createInternal,
				{
					key,
					name,
					contentType,
					size: imageBuffer.byteLength,
					type: "image",
					source: "ai-generated",
					workspaceId,
					projectId,
					createdBy: userId,
					aiMetadata,
				},
			);

			// Generate CDN URL
			const r2PublicUrl = process.env.R2_PUBLIC_URL;
			if (!r2PublicUrl) {
				throw new ConvexError("R2_PUBLIC_URL not configured");
			}
			const cdnUrl = `${r2PublicUrl}/${key}`;

			return {
				success: true,
				cdnUrl,
				key,
				mediaId,
				error: null,
			};
		} catch (error) {
			console.error("[uploadAIGeneratedImageToCDN] Error:", error);

			return {
				success: false,
				cdnUrl: null,
				key: null,
				mediaId: null,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});
