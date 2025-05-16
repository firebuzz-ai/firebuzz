import { openAIRaw } from "@/lib/ai/openai";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Parameter schema for the image generation API
const generateParamsSchema = z.object({
	prompt: z.string().max(32000),
	model: z.literal("gpt-image-1").default("gpt-image-1"),
	n: z.number().int().min(1).max(10).optional(),
	size: z.enum(["1024x1024", "1536x1024", "1024x1536", "auto"]).optional(),
	quality: z.enum(["auto", "high", "medium", "low"]).optional(),
	background: z.enum(["auto", "transparent", "opaque"]).optional(),
	output_format: z.enum(["png", "jpeg", "webp"]).optional(),
	output_compression: z.number().int().min(0).max(100).optional(),
	moderation: z.enum(["auto", "low"]).optional().default("low"),
	user: z.string().optional(),
});

// Standard error response structure
interface ApiErrorResponse {
	success: false;
	error: string;
	details?: unknown; // For Zod validation errors
}

export async function POST(request: NextRequest) {
	try {
		const requestData = await request.json();
		// Validate request data
		const validatedData = generateParamsSchema.parse(requestData);

		// Ensure model is gpt-image-1
		validatedData.model = "gpt-image-1";

		const response = await openAIRaw.images.generate(validatedData);

		if (!response.data) {
			// Consistent error structure
			const errorResponse: ApiErrorResponse = {
				success: false,
				error: "No image data received from the generation service.",
			};
			return NextResponse.json(errorResponse, { status: 500 });
		}

		return NextResponse.json({ ...response, success: true });
	} catch (error) {
		console.error("Image generation API error:", error);

		// Handle Zod validation errors specifically
		if (error instanceof z.ZodError) {
			const errorResponse: ApiErrorResponse = {
				success: false,
				error: "Invalid request parameters.",
				details: error.errors,
			};
			return NextResponse.json(errorResponse, { status: 400 });
		}

		// Generic error response
		const errorResponse: ApiErrorResponse = {
			success: false,
			error:
				error instanceof Error ? error.message : "Failed to generate image.",
		};
		return NextResponse.json(errorResponse, { status: 500 });
	}
}
