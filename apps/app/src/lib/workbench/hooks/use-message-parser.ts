import type { Message } from "ai";
import { useAtom } from "jotai";
import { useCallback, useEffect } from "react";
import { parsedMessagesAtom } from "../atoms";
import { messageParser } from "../parser/parser-instance";
import { useMessageQueue } from "./use-message-queue";
export function useMessageParser() {
	const [parsedMessages, setParsedMessages] = useAtom(parsedMessagesAtom);

	// Handle message queue
	useMessageQueue();

	// Reset parser state when component unmounts
	useEffect(() => {
		return () => {
			messageParser.reset();
		};
	}, []);

	const parseMessages = useCallback(
		(messages: Message[]) => {
			const newParsedMessages: Record<string, string> = { ...parsedMessages };
			let hasChanges = false;

			for (const [_, message] of messages.entries()) {
				if (message.role === "assistant") {
					const newParsedContent = messageParser.parse(
						message.id,
						message.content,
						// @ts-ignore (metadata is not always present)
						message.metadata?.initial ?? false,
						// @ts-ignore
						message.metadata?.versionId,
						// @ts-ignore
						message.metadata?.versionNumber,
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
		[setParsedMessages, parsedMessages],
	);

	return { parsedMessages, parseMessages };
}
