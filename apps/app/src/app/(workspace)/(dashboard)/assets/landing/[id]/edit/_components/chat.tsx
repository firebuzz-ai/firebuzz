import { ChatHeader } from "@/components/chat/header";
import { ChatInput } from "@/components/chat/input/chat-input";
import { ChatMessages } from "@/components/chat/messages/messages";
import { useTwoPanelsLayout } from "@/hooks/ui/use-two-panels-layout";
import {
  currentFilesTreeAtom,
  currentImportantFilesAtom,
  isElementSelectionEnabledAtom,
  selectedElementAtom,
} from "@/lib/workbench/atoms";
import { useMessageParser } from "@/lib/workbench/hooks/use-message-parser";
import { useChat } from "@ai-sdk/react";
import type { Doc, Id } from "@firebuzz/convex";
import { api, useStableReversedPaginatedMessagesQuery } from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import type { Message } from "ai";
import { useAtomValue, useSetAtom } from "jotai";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
} from "react";

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
  const setIsElementSelectionEnabled = useSetAtom(
    isElementSelectionEnabledAtom
  );
  const setSelectedElement = useSetAtom(selectedElementAtom);

  const {
    results: landingPageMessages,
    status: messagesStatus,
    loadMore,
  } = useStableReversedPaginatedMessagesQuery(
    api.collections.landingPageMessages.queries.getPaginatedLandingPageMessages,
    { landingPageId: id as Id<"landingPages"> },
    { initialNumItems: 2 }
  );

  const handleLoadMore = useCallback(() => {
    if (messagesStatus === "CanLoadMore") {
      loadMore(2);
    }
  }, [messagesStatus, loadMore]);

  const { closeRightPanel, openRightPanel } = useTwoPanelsLayout();

  // Format messages from backend to AI SDK format
  const formattedMessages = useMemo(() => {
    if (!landingPageMessages) return [];

    // landingPageMessages are already sorted chronologically by the backend
    return landingPageMessages.map((message: Doc<"landingPageMessages">) => ({
      id: message.messageId ?? message._id,
      content: message.message,
      role: message.role,
      metadata: {
        initial: true,
        versionId: message.landingPageVersionId,
        createdAt: message.createdAt,
      },
    }));
  }, [landingPageMessages]);

  const { messages, setMessages, append, status } = useChat({
    id,
    api: "/api/chat/landing",
    initialMessages: formattedMessages,
    sendExtraMessageFields: true,
    onFinish: async () => {
      openRightPanel();
    },
  });

  const { parsedMessages, parseMessages } = useMessageParser();

  // Parse messages when assistant responds
  useEffect(() => {
    const assistantMessages = messages.filter(
      (msg) => msg.role === "assistant"
    );
    if (assistantMessages.length > 0) {
      // Always parse all messages to ensure correct order
      parseMessages(messages as Message[]);
    }
  }, [messages, parseMessages]);

  // Cleaner debug logs to assist with troubleshooting
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log({
        messagesCount: messages.length,
        parsedMessagesCount: Object.keys(parsedMessages).length,
        messageIds: messages.map((m) => m.id),
      });
    }
  }, [messages, parsedMessages]);

  if (messagesStatus === "LoadingFirstPage") {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Spinner size="xs" />
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden w-full h-full">
      <ChatHeader title="My first landing page" type="Landing Page" />
      <ChatMessages
        chatId={id}
        messages={messages.map((message) => {
          if (message.role === "user") {
            return message as Message;
          }

          return {
            ...message,
            content: parsedMessages[message.id] ?? "",
          } as Message;
        })}
        isLoading={status === "submitted" || messagesStatus === "LoadingMore"}
        isStreaming={status === "streaming"}
        overviewComponent={<EmptyState />}
        setMessages={setMessages as Dispatch<SetStateAction<Message[]>>}
        reload={() => {}}
        status={messagesStatus}
        loadMore={loadMore}
        onLoadMoreClick={handleLoadMore}
        showLoadMoreButton={true}
      />
      <ChatInput
        onSubmit={async (message) => {
          closeRightPanel();
          setIsElementSelectionEnabled(false);
          setSelectedElement(null);

          // Let the useChat hook handle messages state management
          await append(
            {
              role: "user",
              content: message,
            },
            {
              body: {
                projectId: id,
                currentFileTree,
                currentImportantFiles: Object.entries(currentImportantFiles)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join("\n"),
              },
            }
          ).finally(() => {
            // Update the isSending state in ChatInput after append completes
            const chatInput = document.querySelector("textarea");
            if (chatInput) {
              (chatInput as HTMLTextAreaElement).disabled = false;
            }
          });
        }}
      />
    </div>
  );
};
