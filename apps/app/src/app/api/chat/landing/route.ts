import { WORK_DIR, getSystemPrompt } from "@/lib/chat/prompt";
import { auth } from "@clerk/nextjs/server";
import {
  type Message,
  type StreamTextOnFinishCallback,
  type ToolSet,
  appendResponseMessages,
  generateObject,
  smoothStream,
  streamText,
} from "ai";

import { anthropic } from "@/lib/ai/anthropic";
import { azureOpenAI } from "@/lib/ai/azure";
import { openAI } from "@/lib/ai/openai";
import { api, fetchMutation } from "@firebuzz/convex/nextjs";
import { stripIndents } from "@firebuzz/utils";
import { nanoid } from "nanoid";
import type { NextRequest } from "next/server";
import { z } from "zod";

const routerSchema = z.object({
  agent: z
    .enum(["senior-developer", "junior-developer"])
    .describe(
      "The agent to use for this request. Senior developer has more experience and better knowledge of the project but is more expensive. Junior developer is less experienced but cheaper. Tasks we want to assign to the senior developer are: Complete re-design or complete new feature implementation. Tasks need more creativity and deeper knowledge of the project. Tasks we should assign to the junior developer are: Code review, refactoring, fixing small-medium size bugs, adding small features that don't require much creativity and content changes. "
    ),
  enhancedPrompt: z
    .string()
    .describe(
      "The enhanced prompt to use for this request. This prompt will be used to generate the final response. It will be used to enhance the original prompt and make it more specific and detailed. It will be used to make the response more accurate and relevant to the user's request."
    ),
});

const routerAgent = async (prompt: string) => {
  const response = await generateObject({
    model: azureOpenAI("gpt-4o-mini"),
    schema: routerSchema,
    prompt: prompt,
  });

  return response.object;
};

export async function POST(request: NextRequest) {
  const { messages, projectId, currentFileTree, currentImportantFiles } =
    await request.json();

  const token = await (await auth()).getToken({ template: "convex" });

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const totalMessages = messages.length;
  const lastMessageIndex = totalMessages - 1;
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
      api.collections.landingPageMessages.mutations.createLandingPageMessages,
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

          return messageData;
        }),
      },
      { token }
    );
  };

  try {
    console.log("messagesToProcess", messagesToProcess);
    console.log("currentFileTree", currentFileTree);
    console.log("currentImportantFiles", currentImportantFiles);
    // Prepare messages for router agent - keep attachments separate
    const messagesToSendRouter = messagesToProcess.map(
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
            // Keep the original experimental_attachments if present
            experimental_attachments: message.experimental_attachments,
          };
        }
        return message;
      }
    );

    console.log("messagesToSendRouter", messagesToSendRouter);

    const { enhancedPrompt, agent } = await routerAgent(
      JSON.stringify(messagesToSendRouter)
    );

    console.log("enhancedPrompt", enhancedPrompt);
    console.log("agent", agent);

    // Prepare messages for the developer agent - include both text and images
    const messageToSendDeveloper = messagesToProcess.map(
      (message: Message, index: number) => {
        if (index === lastMessageIndex && message.role === "user") {
          // Create a message with enhanced prompt and attachments if present
          return {
            ...message,
            content: stripIndents(`
            ${enhancedPrompt}
            -----------------
            Current files: ${currentFileTree}
            Current important files:
            ${currentImportantFiles}
            `),
            // Only include attachments for senior developer
            ...(agent === "senior-developer" && {
              experimental_attachments: message.experimental_attachments,
            }),
          };
        }

        return {
          id: message.id,
          role: message.role,
          content: message.content,
          createdAt: message.createdAt,
        };
      }
    );

    const response = streamText({
      model:
        agent === "senior-developer"
          ? anthropic("claude-3-7-sonnet-20250219")
          : openAI("o3-mini"),
      system: getSystemPrompt(`${WORK_DIR}/workspace/${projectId}`),
      messages: messageToSendDeveloper,
      providerOptions:
        agent === "senior-developer"
          ? {
              anthropic: {
                thinking: { type: "enabled", budgetTokens: 3000 },
              },
            }
          : {
              openai: { reasoningEffort: "medium" },
            },
      maxSteps: 5,
      experimental_continueSteps: true,
      experimental_transform: smoothStream({
        delayInMs: 10, // optional: defaults to 10ms
        chunking: "word", // optional: defaults to 'word'
      }),
      onFinish,
    });

    return response.toDataStreamResponse();
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
