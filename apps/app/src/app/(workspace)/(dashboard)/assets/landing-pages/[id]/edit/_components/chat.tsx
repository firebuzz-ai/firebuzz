"use client";

import { ChatHeader } from "@/components/chat/header";
import { ChatInput } from "@/components/chat/input/chat-input";
import { ChatMessages } from "@/components/chat/messages/messages";
import {
  currentFilesTreeAtom,
  currentImportantFilesAtom,
  currentVersionAtom,
  isIframeLoadedAtom,
  workbenchStore,
} from "@/lib/workbench/atoms";
import { useMessageParser } from "@/lib/workbench/hooks/use-message-parser";
import { useMessageQueue } from "@/lib/workbench/hooks/use-message-queue";
import { useChat } from "@ai-sdk/react";
import type { Id } from "@firebuzz/convex";
import {
  api,
  useRichQuery,
  useStableReversedPaginatedMessagesQuery,
} from "@firebuzz/convex";
import type { ChatRequestOptions, CreateMessage, Message } from "ai";
import { useAtomValue, useSetAtom } from "jotai";
import { nanoid } from "nanoid";
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
  const isServerReady = useAtomValue(isIframeLoadedAtom);

  const {
    results: landingPageMessages,
    status: messagesStatus,
    loadMore,
  } = useStableReversedPaginatedMessagesQuery(
    api.collections.landingPages.messages.queries.getPaginated,
    isServerReady ? { landingPageId: id as Id<"landingPages"> } : "skip",
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
      (message, index, array): Message => ({
        id: message.messageId,
        content: "",
        parts: message.parts,
        role: message.role,
        experimental_attachments: message.attachments,
        // @ts-expect-error
        metadata: {
          initial: !(
            index === array.length - 1 && !message.landingPageVersionId
          ),
          versionId: message.landingPageVersionId,
          versionNumber: message.landingPageVersionNumber,
          createdAt: message.createdAt,
        },
      })
    );
  }, [landingPageMessages]);

  const { messages, setMessages, status, append, addToolResult } = useChat({
    api: "/api/chat/landing",
    initialMessages: formattedMessages,
    sendExtraMessageFields: true,
    experimental_prepareRequestBody: (options) => {
      const currentFileTree = workbenchStore.get(currentFilesTreeAtom);
      const currentImportantFiles = Object.entries(
        workbenchStore.get(currentImportantFilesAtom)
      )
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");

      return {
        ...options,
        requestBody: {
          ...options.requestBody,
          projectId: id,
          currentFileTree,
          currentImportantFiles,
        },
      };
    },
    generateId: () => {
      return `${id}-${nanoid(8)}`;
    },
    experimental_throttle: 50,
  });

  const memoizedAppend = useCallback(
    (
      message: Message | CreateMessage,
      chatRequestOptions?: ChatRequestOptions
    ) => {
      append(message, chatRequestOptions);
    },
    [append]
  );

  // Handle message queue
  useMessageQueue();

  const { parsedMessages, parseMessages } = useMessageParser();

  const memoizedMessages = useMemo(() => {
    return messages.map((message) => {
      if (message.role === "user") {
        return message as Message;
      }

      const parts = message.parts?.map((part, index) => {
        if (part.type !== "text") return part;

        return {
          ...part,
          text: parsedMessages[`${message.id}-${index}`] ?? "",
        };
      });

      return {
        ...message,
        content: parsedMessages[message.id] ?? "",
        parts,
      } as Message;
    });
  }, [messages, parsedMessages]);

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
    <div className="flex flex-col w-full h-full max-h-screen overflow-hidden">
      <ChatHeader
        landingPageId={id as Id<"landingPages">}
        type="landing-page"
        showLoadMore={false}
      />
      {isServerReady ? (
        <ChatMessages
          chatId={id}
          messages={memoizedMessages}
          overviewComponent={<EmptyState />}
          addToolResult={addToolResult}
          setMessages={setMessages as Dispatch<SetStateAction<Message[]>>}
          reload={() => {}}
          chatStatus={status}
          messagesStatus={messagesStatus}
          loadMore={loadMore}
          onLoadMoreClick={handleLoadMore}
        />
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full max-w-4xl max-h-full min-w-0 py-4 mx-auto overflow-x-hidden overflow-y-scroll">
          Waiting for server to load...
        </div>
      )}
      {/* biome-ignore lint/suspicious/noExplicitAny: <explanation> */}
      <ChatInput append={memoizedAppend as unknown as any} />
    </div>
  );
};
