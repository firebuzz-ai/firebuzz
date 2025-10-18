"use client";

import type { Id } from "@firebuzz/convex/nextjs";
import { Button } from "@firebuzz/ui/components/ui/button";
import { useLandingChat } from "@/hooks/agent/use-landing-chat";
import { useMemo } from "react";
import { ChatInput } from "../input/chat-input";
import { AssistantMessage } from "../message/assistant-message";
import { UserMessage } from "../message/user-message";
import { ReasoningProvider } from "../providers/reasoning-provider";
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "./conversation";

interface ChatboxProps {
	landingPageId: Id<"landingPages">;
}

export const Chatbox = ({ landingPageId }: ChatboxProps) => {
	const { messages, isCanLoadMore, loadMore, isLoadingMore } = useLandingChat({
		landingPageId,
	});

	const renderedMessages = useMemo(() => {
		return messages.map((message) => {
			if (message.role === "user") {
				return <UserMessage key={message.id} message={message} />;
			}
			return <AssistantMessage key={message.id} message={message} />;
		});
	}, [messages]);

	return (
		<div className="flex flex-col h-full">
			<ReasoningProvider>
				<Conversation className="relative w-full">
					<ConversationContent className="overflow-x-hidden pr-4 pb-20 pl-2 space-y-16 w-full max-w-full">
						{isCanLoadMore && (
							<div className="flex justify-center">
								<Button
									variant="outline"
									size="sm"
									onClick={() => loadMore(10)}
									disabled={isLoadingMore}
								>
									{isLoadingMore ? "Loading..." : "Load More"}
								</Button>
							</div>
						)}
						{renderedMessages}
					</ConversationContent>
					<ConversationScrollButton />
				</Conversation>
			</ReasoningProvider>

			{/* Chat Input */}
			<div className="pr-4 pl-2">
				<ChatInput landingPageId={landingPageId} />
			</div>
		</div>
	);
};
