import { auth } from "@clerk/nextjs/server";
import { generateObject } from "ai";

import { openAI } from "@/lib/ai/openai";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function POST(request: NextRequest) {
  const { prompt } = await request.json();

  const user = await auth();

  if (!user.userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const response = await generateObject({
    model: openAI("gpt-4o-mini"),
    prompt: `
		You are a helpful assistant that can help me fix errors in my code.
		Read all the errors provided and return unique errors with their explanations and hints.
		Here are the errors:
		${prompt}
		`,
    output: "array",
    schema: z.object({
      errorType: z.string().describe("The type of error that is occurring"),
      errorExplanation: z
        .string()
        .describe("A detailed explanation of the error"),
      hint: z.string().describe("A hint to fix the error"),
    }),
  });

  return NextResponse.json(response.object);
}
