/**
 * @deprecated Use the useChatScroll hook instead which provides a more comprehensive solution
 */

import * as React from "react";
import { useInView } from "react-intersection-observer";

interface ChatScrollAnchorProps {
  trackVisibility: boolean;
  isAtBottom: boolean;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
}

/**
 * @deprecated Use the useChatScroll hook instead
 */
export function ChatScrollAnchor({
  trackVisibility,
  isAtBottom,
  scrollAreaRef,
}: ChatScrollAnchorProps) {
  const { ref, inView } = useInView({
    trackVisibility,
    delay: 100,
  });

  React.useEffect(() => {
    if (isAtBottom && trackVisibility && !inView) {
      if (!scrollAreaRef.current) return;

      const scrollAreaElement = scrollAreaRef.current;

      scrollAreaElement.scrollTop =
        scrollAreaElement.scrollHeight - scrollAreaElement.clientHeight;
    }
  }, [inView, isAtBottom, trackVisibility, scrollAreaRef]);

  return <div ref={ref} className="h-px w-full" />;
}
