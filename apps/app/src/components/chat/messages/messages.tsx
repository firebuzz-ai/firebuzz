import { useChatScroll } from "@/hooks/ui/use-chat-scroll";
import { type VirtualItem, cn, useVirtualizer } from "@firebuzz/ui/lib/utils";
import type { Message as MessageType } from "ai";
import { useEffect } from "react";
import { Message } from "./message";
import { ThinkingMessage } from "./thinkinh-message";

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
}

export const ChatMessages = ({
  messages,
  isLoading,
  isStreaming,
  chatId,
  overviewComponent,
  setMessages,
  reload,
}: MessagesProps) => {
  // Track if assistant is responding
  const isAssistantResponding =
    isLoading &&
    messages.length > 0 &&
    messages[messages.length - 1].role === "assistant";

  // Initialize chat scroll with correct loading state
  const { scrollContainerRef, bottomRef, scrollToBottom } = useChatScroll({
    isLoading: isLoading || isStreaming,
  });

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
    if (isAssistantResponding) {
      scrollToBottom();
    }
  }, [isAssistantResponding, scrollToBottom]);

  // Prepare data array for virtualizer (messages + potential thinking message)
  const messageData = [...messages];

  // Add thinking message if needed
  const isThinking =
    isLoading &&
    messages.length > 0 &&
    messages[messages.length - 1].role === "user";

  // Create virtualizer for messages
  const virtualizer = useVirtualizer({
    count:
      messageData.length +
      (isThinking ? 1 : 0) +
      (messages.length === 0 ? 1 : 0),
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 180, // Increased to ensure enough space for each message + padding
    overscan: 10, // Render more items outside viewport for smoother scrolling
    measureElement: (element) => {
      // Add extra padding to account for the gaps between messages
      return element?.getBoundingClientRect().height + 24 || 180;
    },
  });

  return (
    <div
      ref={scrollContainerRef}
      className={cn(
        "flex flex-col min-w-0 flex-1 justify-start w-full max-w-4xl mx-auto overflow-x-hidden overflow-y-scroll px-4 pt-4"
      )}
    >
      <div
        className="relative w-full pb-6"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualItem: VirtualItem) => {
          const index = virtualItem.index;

          // Handle empty state with overview component
          if (messages.length === 0 && index === 0) {
            return (
              <div
                key="overview"
                ref={virtualizer.measureElement}
                data-index={virtualItem.index}
                className="absolute top-0 left-0 w-full p-3"
                style={{
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                {overviewComponent}
              </div>
            );
          }

          // Handle the thinking message
          if (isThinking && index === messageData.length) {
            return (
              <div
                key="thinking"
                ref={virtualizer.measureElement}
                data-index={virtualItem.index}
                className="absolute top-0 left-0 w-full p-3 pt-3"
                style={{
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <ThinkingMessage />
              </div>
            );
          }

          // Regular message
          const message = messageData[index];
          if (!message) return null;

          return (
            <div
              key={message.id}
              ref={virtualizer.measureElement}
              data-index={virtualItem.index}
              className="absolute top-0 left-0 w-full p-3 pt-3"
              style={{
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <Message
                chatId={chatId}
                message={message}
                isLoading={isLoading && messageData.length - 1 === index}
                setMessages={setMessages}
                reload={reload}
              />
            </div>
          );
        })}
      </div>

      {/* Invisible element used to track if we're at the bottom */}
      <div ref={bottomRef} className="h-px w-full" />
    </div>
  );
};
