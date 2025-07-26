import { Icon } from "@firebuzz/ui/components/brand/icon";
import type { Message as MessageType } from "ai";
import { AnimatePresence, motion } from "motion/react";
import type { Dispatch, SetStateAction } from "react";
import { Markdown } from "../markdown";
import { MessageActions } from "../message-actions";
import { Reasoning } from "./reasoning";
import { ToolCall } from "./tool-calls/tool-calls";

interface AssistantMessageProps {
  message: MessageType & {
    metadata?: {
      thinkingTime?: string | number;
    };
  };
  isLoading: boolean;
  chatId: string;
  setMessages: Dispatch<SetStateAction<MessageType[]>>;
  addToolResult: ({
    toolCallId,
    result,
  }: {
    toolCallId: string;
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    result: any;
  }) => void;
  reload: () => void;
}

export const AssistantMessage = ({
  message,
  isLoading,
  chatId,
  setMessages,
  addToolResult,
}: AssistantMessageProps) => {
  return (
    <AnimatePresence>
      <motion.div
        className="px-4 w-full max-w-4xl group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div className="flex gap-4 w-full">
          <div className="flex justify-center items-center rounded-lg ring-1 size-8 shrink-0 ring-border bg-background">
            <div className="translate-y-px">
              <Icon className="size-4" />
            </div>
          </div>

          <div className="flex overflow-hidden flex-col gap-4 w-full max-w-full">
            {message.parts?.map((part, index) => {
              /* TEXT */
              if (part.type === "text") {
                return (
                  <div
                    key={`text-${message.id}-${index}`}
                    className="flex flex-row gap-2 items-start w-full"
                  >
                    <div className="flex flex-col gap-4 w-full">
                      <Markdown setMessages={setMessages} html>
                        {part.text}
                      </Markdown>
                    </div>
                  </div>
                );
              }

              /* TOOL CALLS */
              if (part.type === "tool-invocation") {
                return (
                  <ToolCall
                    message={message}
                    key={`tool-call-${part.toolInvocation.toolCallId}`}
                    toolCall={part.toolInvocation}
                    addToolResult={addToolResult}
                  />
                );
              }

              /* REASONING */
              if (part.type === "reasoning") {
                return (
                  <Reasoning
                    key={`reasoning-${message.id}`}
                    content={part.reasoning}
                    setMessages={setMessages}
                    isOver={
                      message.parts?.some(
                        (part) =>
                          part.type === "text" ||
                          part.type === "tool-invocation"
                      ) ?? false
                    }
                  />
                );
              }

              return null;
            })}

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
