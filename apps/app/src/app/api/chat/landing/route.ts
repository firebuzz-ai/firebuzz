import { getSystemPrompt } from "@/lib/chat/prompt";

import { auth } from "@clerk/nextjs/server";
import {
  type Message,
  type StreamTextOnFinishCallback,
  type ToolSet,
  appendResponseMessages,
  smoothStream,
  streamText,
} from "ai";

import { searchStockImage } from "@/lib/ai/tools/search-stock-image";
import { anthropic } from "@ai-sdk/anthropic";
import { api, fetchMutation } from "@firebuzz/convex/nextjs";
import { stripIndents } from "@firebuzz/utils";
import { nanoid } from "nanoid";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { messages, projectId, currentFileTree, currentImportantFiles } =
    await request.json();

  const token = await (await auth()).getToken({ template: "convex" });

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const totalMessages = messages.length;
  const messagesToProcess =
    totalMessages > 10
      ? messages
          //@ts-ignore
          .filter((message: Message) => message?.metadata?.isSystem !== true)
          .slice(-20)
      : messages.filter(
          //@ts-ignore
          (message: Message) => message?.metadata?.isSystem !== true
        );

  const onFinish: StreamTextOnFinishCallback<ToolSet> = async ({
    response,
  }) => {
    const appendedMessages = appendResponseMessages({
      messages,
      responseMessages: response.messages,
    });

    const groupId = nanoid(6);

    // Find the user message to extract attachments
    const userMessage = appendedMessages
      .slice(-2)
      .find((msg) => msg.role === "user");
    const userAttachments = userMessage?.experimental_attachments || [];

    // Save the messages to the database
    await fetchMutation(
      api.collections.landingPages.messages.mutations.create,
      {
        landingPageId: projectId,
        messages: appendedMessages.slice(-2).map((message) => {
          // Prepare base message data
          const messageData = {
            id: `${projectId}-${message.id}`,
            groupId,
            message: message.content,
            role: message.role as "user" | "assistant",
            createdAt:
              typeof message.createdAt === "string"
                ? message.createdAt
                : message.createdAt instanceof Date
                  ? message.createdAt.toISOString()
                  : new Date().toISOString(),
          };

          // Add attachments if this is a user message and has attachments
          if (message.role === "user" && userAttachments.length > 0) {
            return {
              ...messageData,
              attachments: userAttachments.map(
                (attachment: {
                  name?: string;
                  url: string;
                  contentType?: string;
                  size?: number;
                }) => ({
                  name: attachment.name || "attachment",
                  url: attachment.url,
                  contentType: attachment.contentType || "image/jpeg",
                  size: attachment.size || 0,
                })
              ),
            };
          }

          // Add reasoning if this is an assistant message
          if (message.role === "assistant") {
            return {
              ...messageData,
              reasoning: message.parts
                ?.filter((part) => part.type === "reasoning")
                .map((part) => part.reasoning)
                .join("\n"),
            };
          }

          return messageData;
        }),
      },
      { token }
    );
  };

  const messageToSendDeveloper = messagesToProcess.map((message: Message) => {
    if (
      message.role === "user" &&
      message.experimental_attachments?.length &&
      message.experimental_attachments.length > 0
    ) {
      return {
        ...message,
        content: stripIndents(`
        ${message.content}
        // Attachment URLs
        ${message.experimental_attachments
          .map((attachment) => {
            return `[${attachment.name}][${attachment.contentType}](${attachment.url})`;
          })
          .join("\n")}
      `),
      };
    }

    return {
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    };
  });

  try {
    const response = streamText({
      model: anthropic("claude-3-7-sonnet-20250219"),
      system: stripIndents(`
        ${getSystemPrompt(`./${projectId}`)}
        -----------------
        // CURRENT STATUS OF THE PROJECT
        Current file tree: ${currentFileTree}
        Current important files and their content:
        ${currentImportantFiles}
      `),
      providerOptions: {
        anthropic: {
          thinking: { type: "enabled", budgetTokens: 3000 },
        },
      },
      messages: messageToSendDeveloper,
      maxSteps: 5,
      experimental_continueSteps: true,
      experimental_transform: smoothStream({
        delayInMs: 10, // optional: defaults to 10ms
        chunking: "word", // optional: defaults to 'word'
      }),
      onFinish,
      tools: {
        searchStockImage,
      },
    });

    return response.toDataStreamResponse({
      sendReasoning: true,
      sendUsage: true,
    });
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
