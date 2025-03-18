import { ChatHeader } from "@/components/chat/header";
import { ChatInput } from "@/components/chat/input/chat-input";
import { ChatMessages } from "@/components/chat/messages/messages";
import { useTwoPanelsLayout } from "@/hooks/ui/use-two-panels-layout";
import {
  currentFilesTreeAtom,
  currentImportantFilesAtom,
} from "@/lib/workbench/atoms";
import { useMessageParser } from "@/lib/workbench/hooks/use-message-parser";
import { useChat } from "@ai-sdk/react";
import { type Id, api, useMutation, useRichQuery } from "@firebuzz/convex";
import { stripIndents } from "@firebuzz/utils";
import type { Message } from "ai";
import { useAtomValue } from "jotai";
import { type Dispatch, type SetStateAction, useEffect } from "react";

const EmptyState = () => {
  return (
    <div className="space-y-1">
      <p className="font-bold text-lg">How can I help you?</p>
      <p className="text-sm text-muted-foreground">
        Ask the me to help you create a landing page for your business.
      </p>
    </div>
  );
};

export const Chat = ({ id }: { id: string }) => {
  const currentFileTree = useAtomValue(currentFilesTreeAtom);
  const currentImportantFiles = useAtomValue(currentImportantFilesAtom);

  const { closeRightPanel, openRightPanel } = useTwoPanelsLayout();
  const saveMessage = useMutation(
    api.collections.landingPageMessages.mutations.createLandingPageMessage
  );
  const { data: messagesFromServer } = useRichQuery(
    api.collections.landingPageMessages.queries.getLandingPageMessages,
    {
      landingPageId: id as Id<"landingPages">,
    }
  );

  const { messages, setMessages, append, status } = useChat({
    api: "/api/chat/landing",
    initialMessages:
      messagesFromServer?.map((message) => ({
        id: message._id,
        content: message.message,
        role: message.role,
        metadata: {
          initial: true,
          versionId: message.landingPageVersionId,
        },
      })) ?? [],
    body: {
      projectId: id,
    },
    onFinish: async (message) => {
      await saveMessage({
        landingPageId: id as Id<"landingPages">,
        message: message.content,
        type: "assistant",
      });
      openRightPanel();
    },
  });

  const { parsedMessages, parseMessages } = useMessageParser();

  useEffect(() => {
    const assistantMessages = messages.filter(
      (msg) => msg.role === "assistant"
    );
    if (assistantMessages.length > 0) {
      parseMessages(messages as Message[]);
    }
  }, [messages, parseMessages]);

  return (
    <div className="flex flex-col overflow-hidden w-full h-full">
      <ChatHeader title="My first landing page" type="Landing Page" />
      <ChatMessages
        chatId={"123123"}
        messages={messages.map((message, i) => {
          if (message.role === "user") {
            return {
              ...message,
              content: message.content.split("Current files:")[0].trim(),
            } as Message;
          }

          return {
            ...message,
            content: parsedMessages[i] ?? "",
          } as Message;
        })}
        isLoading={status === "submitted"}
        isStreaming={status === "streaming"}
        overviewComponent={<EmptyState />}
        setMessages={setMessages as Dispatch<SetStateAction<Message[]>>}
        reload={() => {}}
      />
      <ChatInput
        onSubmit={async (message) => {
          closeRightPanel();

          const messageId = await saveMessage({
            landingPageId: id as Id<"landingPages">,
            message: message,
            type: "user",
          });

          await append({
            id: messageId,
            role: "user",
            content: stripIndents(`
            ${message}
            Current files: ${currentFileTree}
            Current important files:
            ${Object.entries(currentImportantFiles)
              .map(([key, value]) => `${key}: ${value}`)
              .join("\n")}
            `),
          });
        }}
      />
    </div>
  );
};
