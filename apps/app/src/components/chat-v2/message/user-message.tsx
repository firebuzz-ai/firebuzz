/** biome-ignore-all lint/suspicious/noArrayIndexKey: <We must use the index as the key> */
"use client";

import { useAgentSession } from "@/hooks/agent/use-agent-session";
import type { LandingPageUIMessage } from "@firebuzz/convex";
import { formatRelativeTimeShort } from "@firebuzz/utils";
import { memo, useEffect, useMemo } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { UserMarkdownRenderer } from "../markdown/user-markdown-renderer";
import { MessageAttachments } from "./message-part/attachments";

interface UserMessageProps {
	message: LandingPageUIMessage;
}

// Helper to group only sequential file parts together (not text parts)
const groupMessageParts = (parts: LandingPageUIMessage["parts"]) => {
	const grouped: Array<
		| { type: "text"; index: number }
		| { type: "files"; parts: Array<(typeof parts)[0]> }
	> = [];

	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		if (part.type === "file") {
			const lastGroup = grouped[grouped.length - 1];
			if (lastGroup?.type === "files") {
				lastGroup.parts.push(part);
			} else {
				grouped.push({ type: "files", parts: [part] });
			}
		} else if (part.type === "text") {
			grouped.push({ type: "text", index: i });
		}
	}

	return grouped;
};

export const UserMessage = memo(({ message }: UserMessageProps) => {
	const { scrollToBottom } = useStickToBottomContext();

	const { session } = useAgentSession();
	const joinedUsers = session?.joinedUsers;
	const user = message.metadata?.userId;
	const userData = joinedUsers?.find((joinedUser) => joinedUser._id === user);

	const groupedParts = useMemo(
		() => groupMessageParts(message.parts),
		[message.parts],
	);

	useEffect(() => {
		scrollToBottom();
	}, [scrollToBottom]);

	return (
		<div className="overflow-hidden w-full max-w-full group/message group">
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

				<div className="flex flex-col gap-4 items-end max-w-[90%]">
					{groupedParts.map((group, groupIndex) => {
						/* Text Part */
						if (group.type === "text") {
							const part = message.parts[group.index];

							if (part.type === "text") {
								// Skip rendering text parts marked as hidden from UI
								if (part.text.includes('data-hidden-from-ui="true"')) {
									return null;
								}

								return (
									<div
										className="overflow-hidden items-start p-2 w-full rounded-md border bg-muted"
										key={`${group.index}-text`}
									>
										<UserMarkdownRenderer content={part.text} />
									</div>
								);
							}
							return null;
						}
						/* Files Group */
						if (group.type === "files") {
							return (
								<div
									key={`${groupIndex}-files`}
									className="flex overflow-x-auto gap-2 pb-1 max-w-full snap-x snap-mandatory scroll-smooth"
								>
									{group.parts.map((part, fileIndex) => {
										if (part.type === "file") {
											return (
												<MessageAttachments
													key={`${groupIndex}-${fileIndex}-file`}
													part={part}
												/>
											);
										}
										return null;
									})}
								</div>
							);
						}

						return null;
					})}
				</div>
			</div>
		</div>
	);
});
