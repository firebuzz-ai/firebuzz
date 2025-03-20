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
import type { Doc } from "@firebuzz/convex/nextjs";
import type { Message } from "ai";
import { useAtomValue, useSetAtom } from "jotai";
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

export const Chat = ({
  id,
  initialMessages,
}: {
  id: string;
  initialMessages: Doc<"landingPageMessages">[];
}) => {
  const currentFileTree = useAtomValue(currentFilesTreeAtom);
  const currentImportantFiles = useAtomValue(currentImportantFilesAtom);
  const setIsElementSelectionEnabled = useSetAtom(
    isElementSelectionEnabledAtom
  );
  const setSelectedElement = useSetAtom(selectedElementAtom);

  const { closeRightPanel, openRightPanel } = useTwoPanelsLayout();

  const { messages, setMessages, append, status } = useChat({
    id,
    api: "/api/chat/landing",
    initialMessages:
      initialMessages?.map((message) => ({
        id: message.messageId ?? message._id,
        content: message.message,
        role: message.role,
        metadata: {
          initial: true,
          versionId: message.landingPageVersionId,
        },
      })) ?? [],
    sendExtraMessageFields: true,
    onFinish: async () => {
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
        chatId={id}
        messages={messages.map((message, i) => {
          if (message.role === "user") {
            return message as Message;
          }

          return {
            ...message,
            content: parsedMessages[i] ?? "",
          } as Message;
        })}
        isLoading={status === "submitted" || status === "streaming"}
        isStreaming={status === "streaming"}
        overviewComponent={<EmptyState />}
        setMessages={setMessages as Dispatch<SetStateAction<Message[]>>}
        reload={() => {}}
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
