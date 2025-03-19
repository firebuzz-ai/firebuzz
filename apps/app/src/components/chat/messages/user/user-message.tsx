import { useUser } from "@/hooks/auth/use-user";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@firebuzz/ui/components/ui/avatar";
import type { Message as MessageType } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { type Dispatch, type SetStateAction, useState } from "react";
import { Markdown } from "../markdown";
import { MessageEditor } from "../message-editor";
interface UserMessageProps {
  message: MessageType;
  isLoading: boolean;
  chatId: string;
  setMessages: Dispatch<SetStateAction<MessageType[]>>;
  reload: () => void;
}

export const UserMessage = ({
  message,
  isLoading,
  chatId,
  setMessages,
}: UserMessageProps) => {
  const { user } = useUser();
  const [mode, setMode] = useState<"view" | "edit">("view");

  if (isLoading || !chatId) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="w-full max-w-4xl px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div className="flex gap-4 w-full">
          <Avatar className="size-8 flex items-center rounded-lg justify-center ring-1 shrink-0 ring-border bg-background">
            <AvatarFallback className="rounded-none">
              {user?.firstName?.charAt(0)}
            </AvatarFallback>
            <AvatarImage src={user?.imageUrl} />
          </Avatar>

          <div className="flex flex-col gap-4 w-full">
            {message.content && mode === "view" && (
              <div className="flex flex-row gap-2 items-start w-full">
                <div className="flex flex-col gap-4 w-full">
                  <Markdown>{message.content as string}</Markdown>
                </div>
              </div>
            )}

            {message.content && mode === "edit" && (
              <div className="flex flex-row gap-2 items-start w-full">
                <div className="size-8" />

                <MessageEditor
                  key={message.id}
                  message={message}
                  setMode={setMode}
                  setMessages={setMessages}
                />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
