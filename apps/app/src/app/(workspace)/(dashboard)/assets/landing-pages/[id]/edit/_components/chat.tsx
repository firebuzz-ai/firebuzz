import { ChatHeader } from "@/components/chat/header";
import { ChatInput } from "@/components/chat/input/chat-input";
import { ChatMessages } from "@/components/chat/messages/messages";
import { currentVersionAtom } from "@/lib/workbench/atoms";
import { useMessageParser } from "@/lib/workbench/hooks/use-message-parser";
import { useMessageQueue } from "@/lib/workbench/hooks/use-message-queue";
import { useChat } from "@ai-sdk/react";
import type { Id } from "@firebuzz/convex";
import {
  api,
  useRichQuery,
  useStableReversedPaginatedMessagesQuery,
} from "@firebuzz/convex";
import type { Message } from "ai";
import { useSetAtom } from "jotai";
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
      <p className="text-lg font-bold">How can I help you?</p>
      <p className="text-sm text-muted-foreground">
        Ask the me to help you create a landing page for your business.
      </p>
    </div>
  );
};

interface ChatProps {
  id: string;
}

export const Chat = ({ id }: ChatProps) => {
  const setCurrentVersion = useSetAtom(currentVersionAtom);
  const {
    results: landingPageMessages,
    status: messagesStatus,
    loadMore,
  } = useStableReversedPaginatedMessagesQuery(
    api.collections.landingPages.messages.queries.getPaginated,
    { landingPageId: id as Id<"landingPages"> },
    { initialNumItems: 8 }
  );

  const { data: currentVersion } = useRichQuery(
    api.collections.landingPages.versions.queries.getCurrent,
    {
      landingPageId: id as Id<"landingPages">,
    }
  );

  const handleLoadMore = useCallback(() => {
    if (messagesStatus === "CanLoadMore") {
      loadMore(8);
    }
  }, [messagesStatus, loadMore]);

  // Format messages from backend to AI SDK format
  const formattedMessages = useMemo(() => {
    if (!landingPageMessages) {
      console.log("landingPageMessages is undefined");
      return [];
    }

    // landingPageMessages are already sorted chronologically by the backend
    return landingPageMessages.map(
      (message): Message => ({
        id: message.messageId.replace(`${id}-`, ""),
        content: message.message,
        parts: message.reasoning
          ? [
              {
                type: "reasoning",
                reasoning: message.reasoning,
                details: [{ type: "text", text: message.reasoning }],
              },
            ]
          : undefined,
        role: message.role,
        experimental_attachments: message.attachments,
        // @ts-expect-error
        metadata: {
          initial: true,
          versionId: message.landingPageVersionId,
          versionNumber: message.landingPageVersionNumber,
          createdAt: message.createdAt,
        },
      })
    );
  }, [landingPageMessages, id]);

  const { messages, setMessages, status, append } = useChat({
    api: "/api/chat/landing",
    // @ts-expect-error
    initialMessages: formattedMessages,
    sendExtraMessageFields: true,
  });

  // Handle message queue
  useMessageQueue();

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

  // Set current version
  useEffect(() => {
    if (currentVersion) {
      setCurrentVersion(currentVersion);
    }
  }, [currentVersion, setCurrentVersion]);

  return (
    <div className="flex flex-col w-full h-full max-h-full overflow-hidden">
      <ChatHeader
        landingPageId={id as Id<"landingPages">}
        type="landing-page"
        showLoadMore={false}
      />
      <ChatMessages
        chatId={id}
        messages={messages.map((message) => {
          if (message.role === "user") {
            return message as Message;
          }

          const parts = message.parts;
          const textParts = parts?.filter((part) => part.type === "text");

          return {
            ...message,
            content: parsedMessages[message.id] ?? "",
          } as Message;
        })}
        overviewComponent={<EmptyState />}
        setMessages={setMessages as Dispatch<SetStateAction<Message[]>>}
        reload={() => {}}
        chatStatus={status}
        messagesStatus={messagesStatus}
        loadMore={loadMore}
        onLoadMoreClick={handleLoadMore}
      />
      {/* biome-ignore lint/suspicious/noExplicitAny: <explanation> */}
      <ChatInput append={append as unknown as any} />
    </div>
  );
};
