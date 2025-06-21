import { useChatScroll } from "@/hooks/ui/use-chat-scroll";
import { Button } from "@firebuzz/ui/components/ui/button";
import { cn } from "@firebuzz/ui/lib/utils";
import type { Message as MessageType } from "ai";
import { motion } from "motion/react";
import { useEffect } from "react";
import { LoadingMessage } from "./loading-message";
import { Message } from "./message";

type PaginationStatus =
	| "LoadingFirstPage"
	| "LoadingMore"
	| "CanLoadMore"
	| "Exhausted";

interface MessagesProps {
	chatId: string;
	messages: MessageType[];
	setMessages: (
		messages: MessageType[] | ((messages: MessageType[]) => MessageType[]),
	) => void;
	reload: () => void;
	addToolResult: ({
		toolCallId,
		result,
	}: {
		toolCallId: string;
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		result: any;
	}) => void;
	overviewComponent: React.ReactNode;
	chatStatus: "submitted" | "streaming" | "error" | "ready";
	messagesStatus: PaginationStatus;
	loadMore?: (numItems: number) => void;
	onLoadMoreClick?: () => void;
}

export const ChatMessages = ({
	messages,
	chatId,
	overviewComponent,
	setMessages,
	reload,
	addToolResult,
	chatStatus,
	messagesStatus,
	onLoadMoreClick,
}: MessagesProps) => {
	const isStreaming = chatStatus === "streaming";
	const isSubmitted = chatStatus === "submitted";
	const isInitialMessageLoading = messagesStatus === "LoadingFirstPage";

	// Initialize chat scroll with correct loading state
	const { scrollContainerRef, bottomRef, scrollToBottom } = useChatScroll({
		isStreaming,
	});

	// Check if thinking message should be shown
	const isWaitingForResponse =
		isSubmitted &&
		messages.length > 0 &&
		messages[messages.length - 1].role === "user";

	// Initial scroll to bottom on component mount
	useEffect(() => {
		setTimeout(() => {
			scrollToBottom();
		}, 500);
	}, [scrollToBottom]);

	// Auto-scroll when user sends a message
	useEffect(() => {
		const isUserSending =
			isSubmitted &&
			messages.length > 0 &&
			messages[messages.length - 1].role === "user";

		if (isUserSending) {
			scrollToBottom();
		}
	}, [isSubmitted, messages, scrollToBottom]);

	// Auto-scroll when assistant starts responding
	useEffect(() => {
		const isAssistantResponding =
			isStreaming &&
			messages.length > 0 &&
			messages[messages.length - 1].role === "assistant";

		if (isAssistantResponding) {
			scrollToBottom();
		}
	}, [isStreaming, messages, scrollToBottom]);

	return (
		<motion.div
			layoutId={`chat-messages-${chatId}`}
			ref={scrollContainerRef}
			className={cn(
				"flex flex-col min-w-0 h-full max-h-full justify-start w-full max-w-4xl mx-auto overflow-x-hidden overflow-y-scroll py-4",
			)}
		>
			<div className="flex flex-col w-full gap-6">
				{/* Show overview if no messages */}
				{messages.length === 0 && !isInitialMessageLoading && (
					<div className="w-full p-3">{overviewComponent}</div>
				)}

				{/* Show load more button at the top if enabled */}
				{messagesStatus === "CanLoadMore" && messages.length > 0 && (
					<div className="sticky z-10 flex justify-center w-full py-2 -top-4 bg-background/80 backdrop-blur-sm">
						<Button
							size="sm"
							variant="outline"
							onClick={onLoadMoreClick}
							type="button"
						>
							Load Older Messages
						</Button>
					</div>
				)}

				{/* Render messages */}
				{messages.map((message) => (
					<div key={message.id} className="w-full p-3">
						<Message
							chatId={chatId}
							message={message}
							addToolResult={addToolResult}
							isLoading={
								isSubmitted &&
								message.role === "assistant" &&
								// Only mark the last assistant message as loading
								message.id ===
									messages.filter((m) => m.role === "assistant").slice(-1)[0]
										?.id
							}
							setMessages={setMessages}
							reload={reload}
						/>
					</div>
				))}

				{/* Show thinking indicator when waiting for response */}
				{isWaitingForResponse && (
					<div className="w-full pl-6">
						<LoadingMessage />
					</div>
				)}

				{/* Invisible element used to track if we're at the bottom */}
				<div ref={bottomRef} className="w-full h-24" />
			</div>
		</motion.div>
	);
};
