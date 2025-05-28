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
				// Only parse assistant messages
				if (message.role === "assistant") {
					const parts = message.parts ?? [];

					for (const [index, part] of parts.entries()) {
						if (part.type !== "text") continue;

						const newParsedContent = messageParser.parse(
							message.id,
							`${message.id}-${index}`,
							part.text ?? "",
							// @ts-expect-error - metadata.initial property doesn't exist on Message type but is used at runtime
							message.metadata?.initial ?? false,
							// @ts-expect-error - metadata.versionId property doesn't exist on Message type but is used at runtime
							message.metadata?.versionId,
							// @ts-expect-error - metadata.versionNumber property doesn't exist on Message type but is used at runtime
							message.metadata?.versionNumber,
						);

						if (newParsedContent) {
							newParsedMessages[`${message.id}-${index}`] =
								(newParsedMessages[`${message.id}-${index}`] ?? "") +
								newParsedContent;
							hasChanges = true;
						}
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
