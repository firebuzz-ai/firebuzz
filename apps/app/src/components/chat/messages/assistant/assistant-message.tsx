import { Icon } from "@firebuzz/ui/components/brand/icon";
import type { Message as MessageType } from "ai";
import { AnimatePresence, motion } from "motion/react";
import type { Dispatch, SetStateAction } from "react";
import { useMemo } from "react";
import { Attachments } from "../attachments";
import { Markdown } from "../markdown";
import { MessageActions } from "../message-actions";
import { Reasoning } from "./reasoning";

interface AssistantMessageProps {
  message: MessageType & {
    metadata?: {
      thinkingTime?: string | number;
    };
  };
  isLoading: boolean;
  chatId: string;
  setMessages: Dispatch<SetStateAction<MessageType[]>>;
  reload: () => void;
}

export const AssistantMessage = ({
  message,
  isLoading,
  chatId,
  setMessages,
}: AssistantMessageProps) => {
  // Extract reasoning content
  const reasoningContent = useMemo(() => {
    if (
      !message.parts ||
      !message.parts.filter((part) => part.type === "reasoning").length
    ) {
      return null;
    }

    return message.parts
      .filter((part) => part.type === "reasoning")
      .map((part) => part.reasoning)
      .join("\n");
  }, [message.parts]);

  return (
    <AnimatePresence>
      <motion.div
        className="w-full max-w-4xl px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div className="flex w-full gap-4">
          <div className="flex items-center justify-center rounded-lg size-8 ring-1 shrink-0 ring-border bg-background">
            <div className="translate-y-px">
              <Icon className="size-4" />
            </div>
          </div>

          <div className="flex flex-col w-full max-w-full gap-4 overflow-hidden">
            <Attachments message={message} />

            {/* Reasoning Component */}
            {reasoningContent && (
              <Reasoning
                content={reasoningContent}
                setMessages={setMessages}
                isOver={message.content !== ""}
              />
            )}

            {message.content && (
              <div className="flex flex-row items-start w-full gap-2">
                <div className="flex flex-col w-full gap-4">
                  <Markdown setMessages={setMessages} html>
                    {message.content as string}
                  </Markdown>
                </div>
              </div>
            )}

            <MessageActions
              key={`action-${message.id}`}
              chatId={chatId}
              message={message}
              vote={{}}
              isLoading={isLoading}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
