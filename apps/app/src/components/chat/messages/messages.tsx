import { useChatScroll } from "@/hooks/ui/use-chat-scroll";
import { Button } from "@firebuzz/ui/components/ui/button";
import { cn } from "@firebuzz/ui/lib/utils";
import type { Message as MessageType } from "ai";
import { useEffect } from "react";
import { Message } from "./message";
import { ThinkingMessage } from "./thinkinh-message";

type PaginationStatus =
  | "LoadingFirstPage"
  | "LoadingMore"
  | "CanLoadMore"
  | "Exhausted";

interface MessagesProps {
  chatId: string;
  messages: MessageType[];
  setMessages: (
    messages: MessageType[] | ((messages: MessageType[]) => MessageType[])
  ) => void;
  reload: () => void;
  isLoading: boolean;
  isStreaming: boolean;
  overviewComponent: React.ReactNode;
  status?: PaginationStatus;
  loadMore?: (numItems: number) => void;
  onLoadMoreClick?: () => void;
  showLoadMoreButton?: boolean;
}

export const ChatMessages = ({
  messages,
  isLoading,
  isStreaming,
  chatId,
  overviewComponent,
  setMessages,
  reload,
  status,
  onLoadMoreClick,
  showLoadMoreButton = false,
}: MessagesProps) => {
  // Initialize chat scroll with correct loading state
  const { scrollContainerRef, bottomRef, scrollToBottom } = useChatScroll({
    isLoading: isLoading || isStreaming,
  });

  // Initial scroll to bottom on component mount
  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  // Auto-scroll when user sends a message
  useEffect(() => {
    const isUserSending =
      isLoading &&
      messages.length > 0 &&
      messages[messages.length - 1].role === "user";

    if (isUserSending) {
      scrollToBottom();
    }
  }, [isLoading, messages, scrollToBottom]);

  // Auto-scroll when assistant starts responding
  useEffect(() => {
    const isAssistantResponding =
      isStreaming &&
      messages.length > 0 &&
      messages[messages.length - 1].role === "assistant";

    if (isAssistantResponding) {
      scrollToBottom();
    }
  }, [isStreaming, messages, scrollToBottom]);

  // Check if thinking message should be shown
  const isThinking =
    isLoading &&
    messages.length > 0 &&
    messages[messages.length - 1].role === "user";

  return (
    <div
      ref={scrollContainerRef}
      className={cn(
        "flex flex-col min-w-0 h-full justify-start w-full max-w-4xl mx-auto overflow-x-hidden overflow-y-scroll px-4 py-4"
      )}
    >
      <div className="flex flex-col gap-6 w-full">
        {/* Show overview if no messages */}
        {messages.length === 0 && (
          <div className="w-full p-3">{overviewComponent}</div>
        )}

        {/* Show load more button at the top if enabled */}
        {showLoadMoreButton &&
          status === "CanLoadMore" &&
          messages.length > 0 && (
            <div className="w-full flex justify-center py-2 sticky -top-4 bg-background/80 backdrop-blur-sm z-10">
              <Button
                size="sm"
                variant="outline"
                onClick={onLoadMoreClick}
                type="button"
              >
                Load Older Messages
              </Button>
            </div>
          )}

        {/* Loading more indicator */}
        {status === "LoadingMore" && (
          <div className="w-full p-3 flex justify-center sticky top-0 bg-background/80 backdrop-blur-sm z-10">
            <ThinkingMessage />
          </div>
        )}

        {/* Render messages */}
        {messages.map((message) => (
          <div key={message.id} className="w-full p-3">
            <Message
              chatId={chatId}
              message={message}
              isLoading={
                isLoading &&
                message.role === "assistant" &&
                // Only mark the last assistant message as loading
                message.id ===
                  messages.filter((m) => m.role === "assistant").slice(-1)[0]
                    ?.id
              }
              setMessages={setMessages}
              reload={reload}
            />
          </div>
        ))}

        {/* Show thinking indicator when waiting for response */}
        {isThinking && (
          <div className="w-full p-3">
            <ThinkingMessage />
          </div>
        )}

        {/* Invisible element used to track if we're at the bottom */}
        <div ref={bottomRef} className="h-24 w-full" />
      </div>
    </div>
  );
};
