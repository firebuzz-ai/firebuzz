import { ChatHeader } from "@/components/chat/header";
import { ChatInput } from "@/components/chat/input/chat-input";
import { ChatMessages } from "@/components/chat/messages/messages";
import { currentVersionAtom } from "@/lib/workbench/atoms";
import { useMessageParser } from "@/lib/workbench/hooks/use-message-parser";
import { useChat } from "@ai-sdk/react";
import type { Id } from "@firebuzz/convex";
import {
	api,
	useRichQuery,
	useStableReversedPaginatedMessagesQuery,
} from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import type { Message } from "ai";
import { useSetAtom } from "jotai";
import {
	type Dispatch,
	type SetStateAction,
	useCallback,
	useEffect,
	useMemo,
} from "react";

const EmptyState = () => {
	return (
		<div className="space-y-1">
			<p className="font-bold text-lg">How can I help you?</p>
			<p className="text-sm text-muted-foreground">
				Ask the me to help you create a landing page for your business.
			</p>
		</div>
	);
};

export const Chat = ({ id }: { id: string }) => {
	const setCurrentVersion = useSetAtom(currentVersionAtom);
	const {
		results: landingPageMessages,
		status: messagesStatus,
		loadMore,
	} = useStableReversedPaginatedMessagesQuery(
		api.collections.landingPageMessages.queries.getPaginatedLandingPageMessages,
		{ landingPageId: id as Id<"landingPages"> },
		{ initialNumItems: 8 },
	);

	const { data: currentVersion } = useRichQuery(
		api.collections.landingPageVersions.queries.getLandingPageCurrentVersion,
		{
			landingPageId: id as Id<"landingPages">,
		},
	);

	const handleLoadMore = useCallback(() => {
		if (messagesStatus === "CanLoadMore") {
			loadMore(8);
		}
	}, [messagesStatus, loadMore]);

	// Format messages from backend to AI SDK format
	const formattedMessages = useMemo(() => {
		if (!landingPageMessages) return [];

		// landingPageMessages are already sorted chronologically by the backend
		return landingPageMessages.map(
			(message): Message => ({
				id: message.messageId ?? message._id,
				content: message.message,
				role: message.role,
				experimental_attachments: message.attachments,
				// @ts-expect-error
				metadata: {
					initial: true,
					versionId: message.landingPageVersionId,
					versionNumber: message.landingPageVersionNumber,
					createdAt: message.createdAt,
				},
			}),
		);
	}, [landingPageMessages]);

	const { messages, setMessages, status, append } = useChat({
		id,
		api: "/api/chat/landing",
		// @ts-expect-error
		initialMessages: formattedMessages,
		sendExtraMessageFields: true,
	});

	const { parsedMessages, parseMessages } = useMessageParser();

	// Parse messages when assistant responds
	useEffect(() => {
		const assistantMessages = messages.filter(
			(msg) => msg.role === "assistant",
		);
		if (assistantMessages.length > 0) {
			// Always parse all messages to ensure correct order
			parseMessages(messages as Message[]);
		}
	}, [messages, parseMessages]);

	// Set current version
	useEffect(() => {
		if (currentVersion) {
			setCurrentVersion(currentVersion);
		}
	}, [currentVersion, setCurrentVersion]);

	if (messagesStatus === "LoadingFirstPage") {
		return (
			<div className="flex flex-col items-center justify-center h-full">
				<Spinner size="xs" />
			</div>
		);
	}

	return (
		<div className="flex flex-col overflow-hidden w-full h-full">
			<ChatHeader title="My first landing page" type="Landing Page" />
			<ChatMessages
				chatId={id}
				messages={messages.map((message) => {
					if (message.role === "user") {
						return message as Message;
					}

					return {
						...message,
						content: parsedMessages[message.id] ?? "",
					} as Message;
				})}
				isLoading={status === "submitted" || messagesStatus === "LoadingMore"}
				isStreaming={status === "streaming"}
				overviewComponent={<EmptyState />}
				setMessages={setMessages as Dispatch<SetStateAction<Message[]>>}
				reload={() => {}}
				status={messagesStatus}
				loadMore={loadMore}
				onLoadMoreClick={handleLoadMore}
				showLoadMoreButton={true}
			/>
			{/* biome-ignore lint/suspicious/noExplicitAny: <explanation> */}
			<ChatInput append={append as unknown as any} />
		</div>
	);
};
