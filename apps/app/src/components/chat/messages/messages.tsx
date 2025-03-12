import { useScrollToBottom } from "@/hooks/ui/use-scroll-to-bottom";
import { cn } from "@firebuzz/ui/lib/utils";
import type { Message as MessageType } from "ai";
import type { Dispatch, SetStateAction } from "react";
import { Message } from "./message";
import { ThinkingMessage } from "./thinkinh-message";
interface MessagesProps {
  chatId: string;
  messages: MessageType[];
  setMessages: Dispatch<SetStateAction<MessageType[]>>;
  reload: () => void;
  isLoading: boolean;
  overviewComponent: React.ReactNode;
}

export const ChatMessages = ({
  messages,
  isLoading,
  chatId,
  overviewComponent,
  setMessages,
  reload,
}: MessagesProps) => {
  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  return (
    <div
      ref={messagesContainerRef}
      className={cn(
        "flex flex-col min-w-0 gap-6 flex-1 justify-start w-full max-w-4xl mx-auto overflow-x-hidden overflow-y-scroll px-4 pt-4"
      )}
    >
      {messages.length === 0 && overviewComponent}

      {messages.map((message, index) => (
        <Message
          key={message.id}
          chatId={chatId}
          message={message}
          isLoading={isLoading && messages.length - 1 === index}
          setMessages={setMessages}
          reload={reload}
        />
      ))}

      {isLoading &&
        messages.length > 0 &&
        messages[messages.length - 1].role === "user" && <ThinkingMessage />}

      <div
        ref={messagesEndRef}
        className="shrink-0 min-w-[24px] min-h-[24px]"
      />
    </div>
  );
};
