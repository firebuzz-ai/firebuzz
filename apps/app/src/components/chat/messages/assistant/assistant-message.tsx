import { Icon } from "@firebuzz/ui/components/brand/icon";
import { cn } from "@firebuzz/ui/lib/utils";
import type { Message } from "ai";
import { AnimatePresence, motion } from "motion/react";
import type { Dispatch, SetStateAction } from "react";
import { Markdown } from "../markdown";
import { MessageActions } from "../message-actions";
interface AssistantMessageProps {
  message: Message;
  isLoading: boolean;
  chatId: string;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  reload: () => void;
}

export const AssistantMessage = ({
  message,
  isLoading,
  chatId,
}: AssistantMessageProps) => {
  return (
    <AnimatePresence>
      <motion.div
        className="w-full max-w-4xl px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div
          className={cn(
            "flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl"
          )}
        >
          <div className="size-8 flex items-center rounded-lg justify-center ring-1 shrink-0 ring-border bg-background">
            <div className="translate-y-px">
              <Icon className="size-4" />
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full">
            {message.content && (
              <div className="flex flex-row gap-2 items-start">
                <div
                  className={cn("flex flex-col gap-4", {
                    "bg-primary text-primary-foreground px-3 py-2 rounded-xl":
                      message.role === "user",
                  })}
                >
                  <Markdown html>{message.content as string}</Markdown>
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
