import { useChatScroll } from "@/hooks/ui/use-chat-scroll";
import { cn, useVirtualizer } from "@firebuzz/ui/lib/utils";
import type { Message as MessageType } from "ai";
import { useEffect, useRef } from "react";
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

  // Check if thinking message should be shown
  const isThinking =
    isLoading &&
    messages.length > 0 &&
    messages[messages.length - 1].role === "user";

  // Create virtualizer for messages
  const parentRef = useRef<HTMLDivElement | null>(null);

  // Define types for display items
  type DisplayItem =
    | { type: "overview" }
    | { type: "thinking" }
    | { type: "message"; data: MessageType };

  // Create an array that includes both real messages and potentially a thinking placeholder
  const displayItems: DisplayItem[] = [
    ...(messages.length === 0 ? [{ type: "overview" as const }] : []),
    ...messages.map((message) => ({ type: "message" as const, data: message })),
    ...(isThinking ? [{ type: "thinking" as const }] : []),
  ];

  const virtualizer = useVirtualizer({
    count: displayItems.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 180,
    overscan: 10,
    scrollToFn: (offset, { behavior }) => {
      scrollContainerRef.current?.scrollTo({
        top: offset,
        behavior,
      });
    },
  });

  // Create array of virtualized items
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={scrollContainerRef}
      className={cn(
        "flex flex-col min-w-0 h-full justify-start w-full max-w-4xl mx-auto overflow-x-hidden overflow-y-scroll px-4 py-4"
      )}
    >
      {/* This padding creates space for virtual items */}
      <div
        ref={parentRef}
        className="relative w-full"
        style={{
          height: virtualizer.getTotalSize(),
          paddingTop: virtualItems.length > 0 ? virtualItems[0].start : 0,
          paddingBottom:
            virtualItems.length > 0
              ? virtualizer.getTotalSize() -
                virtualItems[virtualItems.length - 1].end
              : 0,
        }}
      >
        <div className="flex flex-col gap-6 w-full">
          {virtualItems.map((virtualItem) => {
            const index = virtualItem.index;
            const item = displayItems[index];

            if (!item) return null;

            // Handle different types of items
            if (item.type === "overview") {
              return (
                <div
                  key="overview"
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  className="w-full p-3"
                >
                  {overviewComponent}
                </div>
              );
            }

            if (item.type === "thinking") {
              return (
                <div
                  key="thinking"
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  className="w-full p-3"
                >
                  <ThinkingMessage />
                </div>
              );
            }

            // Regular message
            const message = item.data;
            return (
              <div
                key={message.id}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                className="w-full p-3"
              >
                <Message
                  chatId={chatId}
                  message={message}
                  isLoading={
                    isLoading &&
                    message.role === "assistant" &&
                    // Only mark the last assistant message as loading
                    index ===
                      messages.findLastIndex((m) => m.role === "assistant")
                  }
                  setMessages={setMessages}
                  reload={reload}
                />
              </div>
            );
          })}
        </div>

        {/* Invisible element used to track if we're at the bottom */}
        <div ref={bottomRef} className="h-24 w-full" />
      </div>
    </div>
  );
};
