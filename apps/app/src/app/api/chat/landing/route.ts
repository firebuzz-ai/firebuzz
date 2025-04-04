import { getSystemPrompt } from "@/lib/chat/prompt";
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

const routerPrompt = stripIndents(`
Task: Route the user’s request to the appropriate agent (Senior Developer or Junior Developer) and provide an enhanced prompt based on the request and any attachments.

1) Agents
Senior Developer: 
- More experienced, deep project knowledge, expensive.
- Assign tasks requiring creativity or complexity, such as:
  - Complete re-designs.
  - New feature implementations.

Junior Developer: 
- Less experienced, cheaper.
- Assign simpler tasks, such as:
  - Code reviews.
  - Refactoring.
  - Fixing small to medium bugs.
  - Adding small features (low creativity).
  - Content changes.

2) Handling Attachments
Definition: An attachment means the user uploaded file(s). (You can find the attachement in the last user message as experimental_attachments)

Action: If an attachment(s) exists, determine its intent:
MEDIA SOURCE: Media (image, video, audio) to be used in the landing page (e.g., background image, hero video, audio).

MEDIA EXPLANATION: Image to explain the request (e.g., screenshot, mockup). Not used in the landing page.

DOCUMENT SOURCE: Document (PDF, DOC, etc.) to be used in the landing page (e.g., terms, policy).

DOCUMENT EXPLANATION: Document to explain the request (e.g., resume, portfolio). Not used in the landing page.

3) Routing Rules
With Attachment:
If intent is MEDIA EXPLANATION or DOCUMENT EXPLANATION:
- Agent: Senior Developer.
- Enhanced Prompt: Include the user’s request and add: “The attached file(s) are for explanation (e.g., screenshot or document). Use them to understand the request.”
- isExperimentalAttachments: TRUE.

If intent is MEDIA SOURCE or DOCUMENT SOURCE:
- Agent: Choose based on task nature:
  - Complex (re-design, new feature) → Senior Developer.
  - Simple (review, bug fix, content) → Junior Developer.
- Enhanced Prompt: Include the user’s request and add: “The attached file(s) are content for the landing page (e.g., image or document). Use this URL: [attachment URL].”
- isExperimentalAttachments: FALSE.

No Attachment:
- Agent: Choose based on task nature:
  - Complex → Senior Developer.
  - Simple → Junior Developer.
- Enhanced Prompt: Restate the user’s request clearly for the agent.
- isExperimentalAttachments: Not applicable (omit or default to FALSE).

Key Notes
attachmentPurpose:
- attachment-explanation means the attachment is for explanation only (not for direct use in the landing page).
- attachment-content means the attachment is content for the landing page.

Prompt Enhancement: Always tailor the prompt to the agent, specifying the task and attachment details (if any).
`);

const routerSchema = z.object({
  agent: z.enum(["senior-developer", "junior-developer"]).describe(
    stripIndents(`
      Select the appropriate developer based on the task's complexity and requirements:

- **Senior Developer**: Highly experienced, deep project knowledge, but expensive. Assign for:
  - Complete re-designs
  - New feature implementations
  - Tasks requiring creativity or extensive project understanding

- **Junior Developer**: Less experienced, more affordable. Assign for:
  - Code reviews
  - Refactoring
  - Fixing small to medium bugs
  - Adding minor features with low creativity
  - Content updates
      `)
  ),
  enhancedPrompt: z.string().describe(
    stripIndents(`
      Provide an enhanced version of the user's request to guide the developer. This refined prompt should:
- Clarify and specify the task details
- Incorporate any relevant context or attachments
- Enable the developer to deliver a more accurate and relevant solution
      `)
  ),
  attachmentPurpose: z
    .enum(["attachment-explanation", "attachment-content"])
    .describe(
      stripIndents(`
      Indicate the purpose of any attachments:
- **attachment-explanation**: Attachments are for explanation only (e.g., screenshots, mockups to clarify the request). They should not be used directly in the landing page.
- **attachment-content**: Attachments are content or sources for the landing page (e.g., images, documents to be incorporated directly). Include their URLs in the enhanced prompt.
      `)
    ),
});

const routerAgent = async (prompt: string) => {
  const response = await generateObject({
    model: azureOpenAI("gpt-4o-mini"),
    schema: routerSchema,
    prompt: prompt,
    system: routerPrompt,
  });

  return response.object;
};

export async function POST(request: NextRequest) {
  const { messages, projectId, currentFileTree, currentImportantFiles } =
    await request.json();

  console.log({
    messages,
  });

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

          return messageData;
        }),
      },
      { token }
    );
  };

  try {
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

    const { enhancedPrompt, agent, attachmentPurpose } = await routerAgent(
      JSON.stringify(messagesToSendRouter)
    );

    console.log({
      enhancedPrompt,
      agent,
      attachmentPurpose,
    });

    // Prepare messages for the developer agent - include both text and images
    const messageToSendDeveloper = messagesToProcess.map(
      (message: Message, index: number) => {
        if (index === lastMessageIndex && message.role === "user") {
          // Create a message with enhanced prompt and attachments if present

          return {
            ...message,
            content: stripIndents(`
              Original user message:
              ${message.content}
              -----------------
              Enhanced user message:
              ${enhancedPrompt}
              -----------------
              Current files: ${currentFileTree}
              Current important files:
              ${currentImportantFiles}
              
            `),
            // Only include attachments for senior developer
            experimental_attachments:
              agent === "senior-developer" &&
              attachmentPurpose === "attachment-explanation"
                ? message.experimental_attachments
                : undefined,
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
      system: getSystemPrompt(`./${projectId}`),
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
