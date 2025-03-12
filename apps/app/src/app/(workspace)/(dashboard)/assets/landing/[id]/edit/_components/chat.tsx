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
import { type Id, api, useMutation, usePaginatedQuery } from "@firebuzz/convex";
import { stripIndents } from "@firebuzz/utils";
import { useAtomValue } from "jotai";
import { useEffect } from "react";

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
  const {
    results: messagesFromServer,
    /*  loadMore,
    isLoading, */
  } = usePaginatedQuery(
    api.collections.landingPageMessages.queries.getPaginatedLandingPageMessages,
    {
      landingPageId: id as Id<"landingPages">,
    },
    {
      initialNumItems: 2,
    }
  );

  const { messages, setMessages, append, status } = useChat({
    api: "/api/chat/landing",
    initialMessages:
      messagesFromServer?.map((message) => ({
        id: message._id,
        content: message.message,
        role: message.role,
      })) ?? [],
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
    // Prevent unnecessary parsing if messages haven't changed in a meaningful way
    const assistantMessages = messages.filter(
      (msg) => msg.role === "assistant"
    );
    if (assistantMessages.length > 0) {
      parseMessages(messages, false);
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
            };
          }

          return {
            ...message,
            content: parsedMessages[i] ?? "",
          };
        })}
        isLoading={status === "submitted"}
        overviewComponent={<EmptyState />}
        setMessages={setMessages}
        reload={() => {}}
      />
      <ChatInput
        onSubmit={async (message) => {
          closeRightPanel();
          await append({
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
          await saveMessage({
            landingPageId: id as Id<"landingPages">,
            message: message,
            type: "user",
          });
        }}
      />
    </div>
  );
};
