import type { Message } from "ai";
import { useAtom } from "jotai";
import { useCallback, useEffect } from "react";
import { parsedMessagesAtom } from "../atoms";
import { messageParser } from "../parser/parser-instance";
export function useMessageParser() {
  const [parsedMessages, setParsedMessages] = useAtom(parsedMessagesAtom);

  // Reset parser state when component unmounts
  useEffect(() => {
    return () => {
      console.log("resetting message parser");
      messageParser.reset();
    };
  }, []);

  const parseMessages = useCallback(
    (messages: Message[]) => {
      const newParsedMessages: Record<string, string> = { ...parsedMessages };
      let hasChanges = false;

      for (const [_, message] of messages.entries()) {
        if (message.role === "assistant") {
          const textParts =
            message.parts?.filter((part) => part.type === "text") ?? [];
          const newParsedContent = messageParser.parse(
            message.id,
            textParts,
            // @ts-ignore (metadata is not always present)
            message.metadata?.initial ?? false,
            // @ts-ignore
            message.metadata?.versionId,
            // @ts-ignore
            message.metadata?.versionNumber
          );

          if (newParsedContent) {
            newParsedMessages[message.id] =
              (newParsedMessages[message.id] ?? "") + newParsedContent;
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        setParsedMessages(newParsedMessages);
      }
    },
    [setParsedMessages, parsedMessages]
  );

  return { parsedMessages, parseMessages };
}
