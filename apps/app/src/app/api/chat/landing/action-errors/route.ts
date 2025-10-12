import { auth } from "@clerk/nextjs/server";
import { generateObject } from "ai";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { openAI } from "@/lib/ai/openai";

const actionErrorSchema = z.object({
	actionType: z
		.string()
		.describe("The type of action that failed (file, quick-edit, shell)"),
	errorMessage: z.string().describe("The error message that was thrown"),
	filePath: z
		.string()
		.optional()
		.describe("The file path where the error occurred"),
	from: z
		.string()
		.optional()
		.describe(
			"The original content that was supposed to be replaced (for quick-edit actions)",
		),
	to: z
		.string()
		.optional()
		.describe(
			"The new content that was supposed to replace the original (for quick-edit actions)",
		),
	suggestion: z.string().describe("A suggestion to fix the error"),
});

export async function POST(request: NextRequest) {
	const { prompt } = await request.json();

	const user = await auth();

	if (!user.userId) {
		return new Response("Unauthorized", { status: 401 });
	}

	const response = await generateObject({
		model: openAI("gpt-4o-mini"),
		prompt: `
		You are a helpful assistant that can help me fix action errors in my code.
		Read all the action errors provided and return detailed error analysis with suggestions.
		For each error, provide:
		- actionType: The type of action that failed
		- errorMessage: The error message that was thrown
		- filePath: The file path where the error occurred (if applicable)
		- from: The original content that was supposed to be replaced (for quick-edit actions)
		- to: The new content that was supposed to replace the original (for quick-edit actions)
		- suggestion: A detailed suggestion to fix the error
		
		Here are the action errors:
		${prompt}
		`,
		output: "array",
		schema: actionErrorSchema,
	});

	return NextResponse.json(response.object);
}
