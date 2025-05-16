import type { ImagesResponse } from "openai/resources/images.mjs";
import { z } from "zod";

// Standard API error structure expected from the backend
interface ApiErrorResponse {
	success: false;
	error: string;
	details?: unknown;
}

// Union type for the client methods' return value
type ImageGenResponse =
	| (ImagesResponse & {
			_request_id?: string | null;
			success: true;
	  })
	// Use the standardized API error structure for client-facing errors
	| ApiErrorResponse;

// Custom zod type for Files
const fileSchema = z.custom<File>((val) => val instanceof File, {
	message: "Expected a File object",
});

// Base parameters schema
const baseImageParamsSchema = z.object({
	user: z.string().optional(),
});

// Generate image parameters schema
const generateImageParamsSchema = baseImageParamsSchema.extend({
	prompt: z.string().max(32000),
	model: z.literal("gpt-image-1").default("gpt-image-1"),
	n: z.number().int().min(1).max(10).optional().default(1),
	size: z
		.enum(["1024x1024", "1536x1024", "1024x1536", "auto"])
		.optional()
		.default("auto"),
	quality: z.enum(["auto", "high", "medium", "low"]).optional().default("auto"),
	background: z
		.enum(["auto", "transparent", "opaque"])
		.optional()
		.default("auto"),
	output_format: z.enum(["png", "jpeg", "webp"]).optional().default("png"),
	output_compression: z.number().int().min(0).max(100).optional().default(100),
	moderation: z.enum(["auto", "low"]).optional().default("auto"),
});

// Edit image parameters schema
export const editImageParamsSchema = baseImageParamsSchema.extend({
	imageKeys: z.union([z.string(), z.array(z.string())]),
	prompt: z.string().max(32000),
	mask: fileSchema.optional(),
	model: z.literal("gpt-image-1").default("gpt-image-1"),
	n: z.number().int().min(1).max(10).optional().default(1),
	size: z
		.enum(["1024x1024", "1536x1024", "1024x1536", "auto"])
		.optional()
		.default("auto"),
	quality: z.enum(["auto", "high", "medium", "low"]).optional().default("auto"),
});

// Types derived from schemas
export type GenerateImageParams = z.infer<typeof generateImageParamsSchema>;
export type EditImageParams = z.infer<typeof editImageParamsSchema>;

/**
 * Client for interacting with image generation API using gpt-image-1 model
 */
export class ImageGenClient {
	private baseEndpoint: string;

	constructor(baseEndpoint?: string) {
		this.baseEndpoint = baseEndpoint ?? "/api/image-gen";
	}

	/**
	 * Generate images from a text prompt
	 */
	async generate(params: GenerateImageParams): Promise<ImageGenResponse> {
		// Validate parameters
		const validatedParams = generateImageParamsSchema.parse(params);

		const response = await fetch(this.baseEndpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(validatedParams),
		});

		if (!response.ok) {
			// Attempt to parse the standardized error response
			const errorBody = (await response
				.json()
				.catch(() => ({}))) as Partial<ApiErrorResponse>;
			const errorMessage =
				errorBody.error || response.statusText || "Failed to generate image";
			// Throw an error with the message from the API if available
			throw new Error(errorMessage);
		}

		return response.json();
	}

	/**
	 * Edit an existing image based on a text prompt
	 */
	async edit(params: EditImageParams): Promise<ImageGenResponse> {
		// Validate parameters
		const validatedParams = editImageParamsSchema.parse(params);

		// For edits, we need to handle file uploads with FormData
		const formData = new FormData();

		// Add mask if provided
		if (validatedParams.mask) {
			formData.append("mask", validatedParams.mask);
		}

		// Add other params as JSON string
		const { mask, ...otherParams } = validatedParams;
		formData.append("params", JSON.stringify(otherParams));

		const response = await fetch(`${this.baseEndpoint}/edit`, {
			method: "POST",
			body: formData,
		});

		if (!response.ok) {
			// Attempt to parse the standardized error response
			const errorBody = (await response
				.json()
				.catch(() => ({}))) as Partial<ApiErrorResponse>;
			const errorMessage =
				errorBody.error || response.statusText || "Failed to edit image";
			// Throw an error with the message from the API if available
			throw new Error(errorMessage);
		}

		return response.json();
	}
}

export default ImageGenClient;
