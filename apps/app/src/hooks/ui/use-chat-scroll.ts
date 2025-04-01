import { useCallback, useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";

interface UseChatScrollOptions {
  /**
   * Whether new messages are being loaded
   */
  isStreaming?: boolean;
  /**
   * Optional callback when scrolling state changes
   */
  onScrollStateChange?: (isAtBottom: boolean) => void;
  /**
   * The threshold distance from bottom (in pixels) to consider "at bottom"
   * @default 10
   */
  bottomThreshold?: number;
}

export function useChatScroll({
  isStreaming = false,
  onScrollStateChange,
  bottomThreshold = 10,
}: UseChatScrollOptions = {}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const observerRef = useRef<MutationObserver | null>(null);

  // Using intersection observer to detect if we're at the bottom
  const { ref: bottomRef, inView } = useInView({
    threshold: 0.5,
    delay: 100,
  });

  // Update isAtBottom state based on intersection observer
  useEffect(() => {
    const newIsAtBottom = inView;
    setIsAtBottom(newIsAtBottom);
    onScrollStateChange?.(newIsAtBottom);
  }, [inView, onScrollStateChange]);

  // Handle scroll manually to determine if user has scrolled up
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - clientHeight - scrollTop;

    const newIsAtBottom = distanceFromBottom < bottomThreshold;
    setIsAtBottom(newIsAtBottom);
    onScrollStateChange?.(newIsAtBottom);
  }, [bottomThreshold, onScrollStateChange]);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (!scrollContainerRef.current) return;

    scrollContainerRef.current.scrollTop =
      scrollContainerRef.current.scrollHeight -
      scrollContainerRef.current.clientHeight;

    setIsAtBottom(true);
    onScrollStateChange?.(true);
  }, [onScrollStateChange]);

  // Setup mutation observer to detect streaming content changes
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    // Disconnect previous observer if exists
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Only create observer when streaming is happening and user is at bottom
    if (isStreaming && isAtBottom) {
      observerRef.current = new MutationObserver(() => {
        if (isAtBottom) {
          scrollToBottom();
        }
      });

      observerRef.current.observe(scrollContainer, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      return () => {
        observerRef.current?.disconnect();
      };
    }
  }, [isStreaming, isAtBottom, scrollToBottom]);

  // Auto-scroll to bottom when new messages arrive if already at bottom
  useEffect(() => {
    if (isAtBottom && isStreaming) {
      scrollToBottom();
    }
  }, [isStreaming, isAtBottom, scrollToBottom]);

  // Setup scroll event listener
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    scrollContainer.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check

    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return {
    scrollContainerRef,
    bottomRef,
    isAtBottom,
    scrollToBottom,
  };
}
