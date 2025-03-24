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
import { api, fetchMutation, fetchQuery } from "@firebuzz/convex/nextjs";
import { sleep, stripIndents } from "@firebuzz/utils";
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
          .slice(-10)
      : messages.filter(
          //@ts-ignore
          (message: Message) => message?.metadata?.isSystem !== true
        );

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
        };
      }
      return message;
    }
  );

  const { enhancedPrompt, agent } = await routerAgent(
    JSON.stringify(messagesToSendRouter)
  );

  const messageToSendDeveloper = messagesToSendRouter.map(
    (message: Message, index: number) => {
      if (index === lastMessageIndex && message.role === "user") {
        return {
          ...message,
          content: stripIndents(`
            ${enhancedPrompt}
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

  const onFinish: StreamTextOnFinishCallback<ToolSet> = async ({
    response,
  }) => {
    const appendedMessages = appendResponseMessages({
      messages,
      responseMessages: response.messages,
    });

    const groupId = nanoid(6);
    await sleep(1000);

    // Get Landing Page Version
    const landingPageVersion = await fetchQuery(
      api.collections.landingPageVersions.queries
        .getLandingPageVersionByMessageId,
      {
        landingPageId: projectId,
        messageId: appendedMessages[appendedMessages.length - 1].id,
      },
      { token }
    );

    // Save the messages to the database
    await fetchMutation(
      api.collections.landingPageMessages.mutations.createLandingPageMessages,
      {
        landingPageId: projectId,
        landingPageVersionId: landingPageVersion._id,
        landingPageVersionNumber: landingPageVersion.number,
        messages: appendedMessages.slice(-2).map((message) => ({
          id: message.id,
          groupId,
          message: message.content,
          role: message.role as "user" | "assistant",
          createdAt:
            typeof message.createdAt === "string"
              ? message.createdAt
              : message.createdAt instanceof Date
                ? message.createdAt.toISOString()
                : new Date().toISOString(),
        })),
      },
      { token }
    );
  };

  console.log({ agent });

  try {
    const response = streamText({
      model:
        agent === "senior-developer"
          ? anthropic("claude-3-5-sonnet-latest")
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
              openai: { reasoningEffort: "low" },
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
