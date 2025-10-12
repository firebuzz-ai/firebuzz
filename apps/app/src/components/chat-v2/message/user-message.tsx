"use client";

import type { LandingPageUIMessage } from "@firebuzz/convex";
import { useEffect } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { MarkdownRenderer } from "../markdown/markdown-renderer";

interface UserMessageProps {
	message: LandingPageUIMessage;
}

export const UserMessage = ({ message }: UserMessageProps) => {
	const { scrollToBottom } = useStickToBottomContext();

	// Scroll to bottom when the message is rendered
	useEffect(() => {
		scrollToBottom();
	}, [scrollToBottom]);

	return (
		<div className="w-full max-w-4xl group/message">
			<div className="flex gap-4 justify-end items-center w-full text-sm">
				<div className="flex flex-col gap-4 items-end p-2 rounded-lg border bg-muted">
					<MarkdownRenderer content={message.text} />
				</div>
			</div>
		</div>
	);
};
