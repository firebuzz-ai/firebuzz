import { useUser } from "@/hooks/auth/use-user";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@firebuzz/ui/components/ui/avatar";
import { cn } from "@firebuzz/ui/lib/utils";
import type { Message } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { type Dispatch, type SetStateAction, useState } from "react";
import { Markdown } from "../markdown";
import { MessageActions } from "../message-actions";
import { MessageEditor } from "../message-editor";
interface UserMessageProps {
  message: Message;
  isLoading: boolean;
  chatId: string;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  reload: () => void;
}

export const UserMessage = ({
  message,
  isLoading,
  chatId,
  setMessages,
  reload,
}: UserMessageProps) => {
  const { user } = useUser();
  const [mode, setMode] = useState<"view" | "edit">("view");

  return (
    <AnimatePresence>
      <motion.div
        className="w-full max-w-4xl px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div
          className={cn("flex gap-4 w-full", {
            "w-full": mode === "edit",
            "group-data-[role=user]/message:w-fit": mode !== "edit",
          })}
        >
          <Avatar className="size-8 flex items-center rounded-lg justify-center ring-1 shrink-0 ring-border bg-background">
            <AvatarFallback className="rounded-none">
              {user?.firstName?.charAt(0)}
            </AvatarFallback>
            <AvatarImage src={user?.imageUrl} />
          </Avatar>

          <div className="flex flex-col gap-4 w-full">
            {message.content && mode === "view" && (
              <div className="flex flex-row gap-2 items-start">
                <div className="flex flex-col gap-4">
                  <Markdown>{message.content as string}</Markdown>
                </div>
              </div>
            )}

            {message.content && mode === "edit" && (
              <div className="flex flex-row gap-2 items-start">
                <div className="size-8" />

                <MessageEditor
                  key={message.id}
                  message={message}
                  setMode={setMode}
                  setMessages={setMessages}
                  reload={reload}
                />
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
