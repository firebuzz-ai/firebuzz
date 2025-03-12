import { getSystemPrompt } from "@/lib/chat/prompt";
import { openai } from "@ai-sdk/openai";
import { auth } from "@clerk/nextjs/server";
import { type Message, smoothStream, streamText } from "ai";

import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { messages } = await request.json();

  const user = await auth();

  if (!user.userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const response = streamText({
    model: openai("o3-mini"),
    system: getSystemPrompt(),
    messages: messages.map((message: Message, index: number) => {
      if (index !== messages.length - 1 && message.role === "user") {
        return {
          ...message,
          content: message.content.split("Current files:")[0].trim(),
        };
      }
      return message;
    }),
    providerOptions: {
      openai: { reasoningEffort: "low" },
    },
    experimental_transform: smoothStream({
      delayInMs: 10, // optional: defaults to 10ms
      chunking: "word", // optional: defaults to 'word'
    }),
    onFinish: async (response) => {
      console.log(response.usage);
      console.log(response.providerMetadata);
      console.log(response.reasoning);
    },
    onError: (error) => {
      console.error(error);
    },
  });

  return response.toDataStreamResponse();
}
