import type { Message } from "ai";
import { useAtom } from "jotai";
import { useCallback } from "react";
import {
  type Action,
  type Artifact,
  actionsAtom,
  artifactsAtom,
  isDevServerRunningAtom,
  parsedFilesAtom,
  parsedMessagesAtom,
  projectIdAtom,
  workbenchStore,
} from "../atoms";
import { MessageParser } from "../parser/message-parser";
import { webcontainerInstance } from "../webcontainer";

const parser = new MessageParser({
  callbacks: {
    onArtifactOpen: (data) => {
      console.log("onArtifactOpen", data);
      workbenchStore.set(artifactsAtom, (prev) => {
        const artifact: Artifact = {
          id: data.id,
          messageId: data.messageId,
          closed: false,
          snapshot: false,
          title: data.title || "",
        };
        return [...prev, artifact];
      });
    },
    onArtifactClose: (data) => {
      console.log("onArtifactClose", data);
      workbenchStore.set(artifactsAtom, (prev) => {
        return prev.map((artifact) => {
          if (artifact.messageId === data.messageId) {
            return { ...artifact, closed: true };
          }
          return artifact;
        });
      });
    },
    onActionOpen: (data) => {
      console.log("onActionOpen", data);
      workbenchStore.set(actionsAtom, (prev) => {
        // File action
        if (data.action.type === "file") {
          const action: Action = {
            id: data.actionId,
            messageId: data.messageId,
            type: data.action.type,
            content: data.action.content,
            filePath: data.action.filePath,
            isInitial: data.action.isInitial,
            status: data.action.isInitial ? "success" : "pending",
            title: data.action.title,
            artifactId: data.artifactId,
          };
          console.log("onActionOpen", { action, data });
          return [...prev, action];
        }
        // Shell action
        const action: Action = {
          id: data.actionId,
          messageId: data.messageId,
          isInitial: data.action.isInitial,
          status: data.action.isInitial ? "success" : "pending",
          type: data.action.type,
          content: data.action.content,
          title: data.action.title,
          artifactId: data.artifactId,
        };
        console.log("onActionOpen", { action, data });
        return [...prev, action];
      });
    },
    onActionClose: async (data) => {
      if (data.action.isInitial) {
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
      }
    },
  },
});

export function useMessageParser() {
  const [parsedMessages, setParsedMessages] = useAtom(parsedMessagesAtom);

  const parseMessages = useCallback(
    (messages: Message[]) => {
      const newParsedMessages: Record<number, string> = { ...parsedMessages };
      let hasChanges = false;

      console.log("Parsing messages:", {
        incoming: messages,
        existing: parsedMessages,
      });

      for (const [index, message] of messages.entries()) {
        if (message.role === "assistant") {
          const newParsedContent = parser.parse(
            message.id,
            message.content,
            // @ts-ignore
            message.metadata?.initial ?? false
          );

          console.log("Parsed content for message:", {
            messageId: message.id,
            index,
            content: message.content,
            parsed: newParsedContent,
            existing: parsedMessages[index],
          });

          if (newParsedContent) {
            console.log("Updating parsed messages:", {
              index,
              newContent: newParsedContent,
            });
            newParsedMessages[index] =
              (newParsedMessages[index] ?? "") + newParsedContent;
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        console.log("Updating parsed messages:", newParsedMessages);
        setParsedMessages(newParsedMessages);
      }
    },
    [setParsedMessages, parsedMessages]
  );

  return { parsedMessages, parseMessages };
}
