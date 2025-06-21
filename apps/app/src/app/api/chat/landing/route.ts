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

import { askImageConfirmation } from "@/lib/ai/tools/ask-image-confirmation";
import { readDocument } from "@/lib/ai/tools/read-document";
import { readLongDocument } from "@/lib/ai/tools/read-long-document";
import { searchKnowledgeBase } from "@/lib/ai/tools/search-knowledgebase";
import { searchStockImage } from "@/lib/ai/tools/search-stock-image";
import { anthropic } from "@ai-sdk/anthropic";
import { api, fetchMutation } from "@firebuzz/convex/nextjs";
import { envCloudflarePublic } from "@firebuzz/env";
import { stripIndents } from "@firebuzz/utils";
import { nanoid } from "nanoid";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { messages, requestBody } = body;
  const { projectId, currentFileTree, currentImportantFiles } = requestBody;
  const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();

  const token = await (await auth()).getToken({ template: "convex" });

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const totalMessages = messages.length;
  const messagesToProcess =
    totalMessages > 10
      ? messages
          // @ts-expect-error - Message type doesn't include metadata property but it exists at runtime
          .filter((message: Message) => message?.metadata?.isSystem !== true)
          .slice(-20)
      : messages.filter(
          // @ts-expect-error - Message type doesn't include metadata property but it exists at runtime
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
      api.collections.landingPages.messages.mutations.upsert,
      {
        landingPageId: projectId,
        messages: appendedMessages.slice(-2).map((message) => {
          // Prepare base message data
          const messageData = {
            id: `${message.id}`,
            groupId,
            parts: message.parts ?? [],
            role: message.role as "user" | "assistant",
            createdAt:
              typeof message.createdAt === "string"
                ? message.createdAt
                : message.createdAt instanceof Date
                  ? message.createdAt.toISOString()
                  : new Date().toISOString(),
            // @ts-expect-error - revisionId property doesn't exist on Message type but is used at runtime
            isRevision: Boolean(message.revisionId),
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

          return messageData;
        }),
      },
      { token }
    );

    // Save usage to the database
    await fetchMutation(
      api.collections.stripe.transactions.mutations.addUsageIdempotent,
      {
        amount: 1,
        idempotencyKey: `chat-landing-${groupId}`,
        reason: "Chat usage",
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
      const experimentalAttachments = message.experimental_attachments
        ?.filter(
          (attachment) =>
            attachment.contentType?.startsWith("image/png") ||
            attachment.contentType?.startsWith("image/jpeg") ||
            attachment.contentType?.startsWith("image/jpg") ||
            attachment.contentType?.startsWith("image/webp") ||
            attachment.contentType?.startsWith("application/pdf")
        )
        .map((attachment) => ({
          name: attachment.name,
          url: attachment.url,
          contentType: attachment.contentType,
        }));

      return {
        ...message,
        experimental_attachments: experimentalAttachments,
        parts: message.parts?.map((part) => {
          if (part.type === "text") {
            return {
              ...part,
              text: stripIndents(`
        ${message.content}
        // Attachments
        ${message.experimental_attachments
          ?.map((attachment, index) => {
            return stripIndents(`
              <attachment index="${index}">
                name: ${attachment.name}
                contentType: ${attachment.contentType}
                url: ${attachment.url}
                key: ${attachment.url.split(`${NEXT_PUBLIC_R2_PUBLIC_URL}/`)[1]}
              </attachment>
              `);
          })
          .join("\n")}
      `),
            };
          }
        }),
      };
    }

    return {
      id: message.id,
      role: message.role,
      content: message.content,
      parts: message.parts,
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
      maxSteps: 10,
      toolCallStreaming: true,
      experimental_continueSteps: true,
      experimental_transform: smoothStream({
        delayInMs: 10, // optional: defaults to 10ms
        chunking: "word", // optional: defaults to 'word'
      }),
      experimental_generateMessageId: () => {
        return `${projectId}-${nanoid(8)}`;
      },
      onFinish,
      onError: (error) => {
        console.error(error);
      },
      tools: {
        searchStockImage,
        askImageConfirmation,
        readDocument,
        readLongDocument,
        searchKnowledgeBase,
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
