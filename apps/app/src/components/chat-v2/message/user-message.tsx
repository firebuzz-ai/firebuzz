"use client";

import { useAgentSession } from "@/hooks/agent/use-agent-session";
import type { LandingPageUIMessage } from "@firebuzz/convex";
import { formatRelativeTimeShort } from "@firebuzz/utils";
import { useEffect } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { MarkdownRenderer } from "../markdown/markdown-renderer";

interface UserMessageProps {
	message: LandingPageUIMessage;
}

export const UserMessage = ({ message }: UserMessageProps) => {
	const { scrollToBottom } = useStickToBottomContext();

	const { session } = useAgentSession();
	const joinedUsers = session?.joinedUsers;
	const user = message.metadata?.userId;
	const userData = joinedUsers?.find((joinedUser) => joinedUser._id === user);

	// Scroll to bottom when the message is rendered
	useEffect(() => {
		scrollToBottom();
	}, [scrollToBottom]);

	return (
		<div className="w-full max-w-4xl group/message group">
			<div className="flex flex-col gap-2 justify-end items-end w-full text-sm">
				<div className="flex flex-row gap-2 items-center opacity-0 transition-opacity duration-150 ease-in-out group-hover/message:opacity-100">
					<span className="text-xs font-medium text-muted-foreground">
						{userData?.firstName ?? "Unknown User"}
					</span>
					<div className="rounded-[2px] size-2 bg-brand/10 border-brand border" />
					<span className="text-xs text-muted-foreground">
						{formatRelativeTimeShort(message._creationTime)}
					</span>
				</div>

				<div className="flex flex-col gap-4 items-end p-2 rounded-lg border bg-muted">
					<MarkdownRenderer content={message.text} />
				</div>
			</div>
		</div>
	);
};
