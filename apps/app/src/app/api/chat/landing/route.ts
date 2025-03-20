import { WORK_DIR, getSystemPrompt } from "@/lib/chat/prompt";
import { auth } from "@clerk/nextjs/server";
import {
  type Message,
  appendResponseMessages,
  smoothStream,
  streamText,
} from "ai";

import { openAI } from "@/lib/ai/openai";
import { api, fetchMutation } from "@firebuzz/convex/nextjs";
import { stripIndents } from "@firebuzz/utils";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { messages, projectId, currentFileTree, currentImportantFiles } =
    await request.json();

  const token = await (await auth()).getToken({ template: "convex" });

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const totalMessages = messages.length;
  const lastMessageIndex = totalMessages - 1;
  const messagesToProcess = totalMessages > 10 ? messages.slice(-10) : messages;
  const messagesToSend = messagesToProcess.map(
    (message: Message, index: number) => {
      if (index === lastMessageIndex && message.role === "user") {
        return {
          ...message,
          content: stripIndents(`
            ${message.content}
            -----------------
            Current files: ${currentFileTree}
            Current important files:
            ${currentImportantFiles}
            `),
        };
      }
      return message;
    }
  );

  const response = streamText({
    model: openAI("o3-mini"),
    system: getSystemPrompt(`${WORK_DIR}/workspace/${projectId}`),
    messages: messagesToSend,

    providerOptions: {
      openai: { reasoningEffort: "low" },
    },
    experimental_transform: smoothStream({
      delayInMs: 10, // optional: defaults to 10ms
      chunking: "word", // optional: defaults to 'word'
    }),
    onFinish: async ({ response }) => {
      const appendedMessages = appendResponseMessages({
        messages,
        responseMessages: response.messages,
      });

      // Save the messages to the database
      await fetchMutation(
        api.collections.landingPageMessages.mutations.createLandingPageMessages,
        {
          landingPageId: projectId,
          messages: appendedMessages.map((message) => ({
            id: message.id,
            message: message.content,
            role: message.role as "user" | "assistant",
          })),
        },
        { token }
      );
    },
  });

  return response.toDataStreamResponse();
}
