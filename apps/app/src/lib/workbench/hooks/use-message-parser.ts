import type { Message } from "ai";
import { useAtom } from "jotai";
import { useCallback, useEffect } from "react";
import {
  type MessageQueueItem,
  messageQueueAtom,
  parsedMessagesAtom,
  workbenchStore,
} from "../atoms";
import { MessageParser } from "../parser/message-parser";
import { useMessageQueue } from "./use-message-queue";

const parser = new MessageParser({
  callbacks: {
    onArtifactOpen: (data) => {
      const messageQueueItem: MessageQueueItem = {
        type: "artifact",
        callbackType: "open",
        isInitial: data.isInitial,
        data,
      };

      // Add to queue
      workbenchStore.set(messageQueueAtom, (prev) => {
        return [...prev, messageQueueItem];
      });
    },
    onArtifactClose: (data) => {
      const messageQueueItem: MessageQueueItem = {
        type: "artifact",
        callbackType: "close",
        isInitial: data.isInitial,
        data,
      };
      // Add to queue
      workbenchStore.set(messageQueueAtom, (prev) => {
        return [...prev, messageQueueItem];
      });
    },
    onActionOpen: (data) => {
      const messageQueueItem: MessageQueueItem = {
        type: "action",
        callbackType: "open",
        isInitial: data.action.isInitial,
        data,
      };
      // Add to queue
      workbenchStore.set(messageQueueAtom, (prev) => {
        return [...prev, messageQueueItem];
      });
    },
    onActionClose: async (data) => {
      const messageQueueItem: MessageQueueItem = {
        type: "action",
        callbackType: "close",
        isInitial: data.action.isInitial,
        data,
      };
      // Add to queue
      workbenchStore.set(messageQueueAtom, (prev) => {
        return [...prev, messageQueueItem];
      });
    },
  },
});

export function useMessageParser() {
  const [parsedMessages, setParsedMessages] = useAtom(parsedMessagesAtom);

  // Handle message queue
  useMessageQueue();

  // Reset parser state when component unmounts
  useEffect(() => {
    return () => {
      parser.reset();
    };
  }, []);

  const parseMessages = useCallback(
    (messages: Message[]) => {
      const newParsedMessages: Record<number, string> = { ...parsedMessages };
      let hasChanges = false;

      for (const [index, message] of messages.entries()) {
        if (message.role === "assistant") {
          const newParsedContent = parser.parse(
            message.id,
            message.content,
            // @ts-ignore (metadata is not always present)
            message.metadata?.initial ?? false,
            // @ts-ignore
            message.metadata?.versionId
          );

          if (newParsedContent) {
            newParsedMessages[index] =
              (newParsedMessages[index] ?? "") + newParsedContent;
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        setParsedMessages(newParsedMessages);
      }
    },
    [setParsedMessages, parsedMessages]
  );

  return { parsedMessages, parseMessages };
}
