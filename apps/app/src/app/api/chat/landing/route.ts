import { WORK_DIR, getSystemPrompt } from "@/lib/chat/prompt";
import { auth } from "@clerk/nextjs/server";
import { type Message, smoothStream, streamText } from "ai";

import { openAI } from "@/lib/ai/openai";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { messages, projectId } = await request.json();

  const user = await auth();

  if (!user.userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const response = streamText({
    model: openAI("o3-mini"),
    system: getSystemPrompt(`${WORK_DIR}/workspace/${projectId}`),
    messages: messages
      .map((message: Message, index: number) => {
        if (index !== messages.length - 1 && message.role === "user") {
          return {
            ...message,
            content: message.content.split("Current files:")[0].trim(),
          };
        }
        return message;
      })
      .slice(-10), // Get last 10 messages
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
