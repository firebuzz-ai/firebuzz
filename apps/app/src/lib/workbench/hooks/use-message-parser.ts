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
      console.log("onArtifactClose", data);

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
      console.log("onActionOpen", data);
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
    /*   if (data.action.isInitial) {
        return;
      }

      try {
        if (data.action.type === "file") {
          const isServerRunning = workbenchStore.get(isDevServerRunningAtom);

          if (!isServerRunning) {
            console.log("Server is not running - skipping action close");
            return;
          }

          const projectId = workbenchStore.get(projectIdAtom);
          const filePath = data.action.filePath;
          const content = data.action.content;
          const extension = filePath.split(".").pop() || "";

          if (!projectId) {
            throw new Error("Project ID or action not found");
          }

          // Write file to webcontainer
          await webcontainerInstance.fs.writeFile(
            `/workspace/${projectId}/${filePath}`,
            content
          );

          // Update parsed files
          workbenchStore.set(parsedFilesAtom, (prev) => {
            return new Map(prev).set(filePath, {
              path: filePath,
              content: content,
              extension: extension,
            });
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        workbenchStore.set(actionsAtom, (prev) => {
          return prev.map((action) => {
            if (action.id === data.actionId) {
              return {
                ...action,
                status: "success",
                content: data.action.content,
              };
            }
            return action;
          });
        });
      } */
  },
});

type MessageWithMetadata = Message & {
  metadata?: {
    initial?: boolean;
    versionId?: string;
  };
};

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
    (messages: MessageWithMetadata[]) => {
      const newParsedMessages: Record<number, string> = { ...parsedMessages };
      let hasChanges = false;

      for (const [index, message] of messages.entries()) {
        if (message.role === "assistant") {
          const newParsedContent = parser.parse(
            message.id,
            message.content,
            message.metadata?.initial ?? false,
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
