import {
	api,
	ConvexError,
	type LandingPageUIMessage,
	optimisticallySendMessage,
	useCachedQuery,
	useCachedRichQuery,
	useMutation,
	useUIMessages,
} from "@firebuzz/convex";
import type { Doc, Id } from "@firebuzz/convex/nextjs";
import { toast } from "@firebuzz/ui/lib/utils";
import type { ChatStatus as AiChatStatus } from "ai";
import { useCallback, useMemo } from "react";
import { useAgentSession } from "./use-agent-session";

type ChatStatus = AiChatStatus | "loading";

export const useLandingChat = ({
	landingPageId,
}: {
	landingPageId: Id<"landingPages">;
}) => {
	const { data: landingPage, isPending: isLandingPageLoading } =
		useCachedRichQuery(
			api.collections.landingPages.queries.getById,
			landingPageId
				? {
						id: landingPageId,
					}
				: "skip",
		);

	const result = useUIMessages(
		api.components.agent.listLandingPageMessages,
		landingPage?.threadId ? { threadId: landingPage.threadId } : "skip",
		{ initialNumItems: 140, stream: true },
	);

	const { results, status, loadMore } = result;

	const typedMessages = useMemo(() => {
		return results as LandingPageUIMessage[];
	}, [results]);

	const session = useAgentSession();

	const availableKnowledgeBases = useCachedQuery(
		api.collections.storage.knowledgeBases.queries.getAll,
		{ showHidden: true },
	);

	const defaultKnowledgeBase = useMemo(() => {
		return availableKnowledgeBases?.find((kb) => kb.isSystem);
	}, [availableKnowledgeBases]);

	const updateKnowledgeBases = useMutation(
		api.collections.agentSessions.mutations.updateKnowledgeBases,
	).withOptimisticUpdate((store, args) => {
		const session = store.getQuery(
			api.collections.agentSessions.queries.getById,
			{ id: args.sessionId },
		);
		if (session) {
			store.setQuery(
				api.collections.agentSessions.queries.getById,
				{ id: args.sessionId },
				{ ...session, knowledgeBases: args.knowledgeBases },
			);
		}
	});

	const sendMessageMutation = useMutation(
		api.components.agent.sendMessageToLandingPageRegularAgent,
	).withOptimisticUpdate((store, args) => {
		optimisticallySendMessage(api.components.agent.listLandingPageMessages)(
			store,
			{
				threadId: args.threadId,
				prompt: args.prompt,
			},
		);
	});

	const selectedKnowledgeBases = useMemo(() => {
		const a = Array.from(
			new Set([
				...(session.session?.knowledgeBases || []),
				defaultKnowledgeBase,
			]),
		).filter(Boolean);

		return a as Doc<"knowledgeBases">[];
	}, [session.session?.knowledgeBases, defaultKnowledgeBase]);

	const addAttachmentMutation = useMutation(
		api.collections.agentSessions.mutations.addAttachment,
	).withOptimisticUpdate((store, args) => {
		const session = store.getQuery(
			api.collections.agentSessions.queries.getById,
			{ id: args.sessionId },
		);
		if (session) {
			// Check if attachment already exists
			const exists = session.attachments.some(
				(att) =>
					att.id === args.attachment.id && att.type === args.attachment.type,
			);
			if (!exists) {
				store.setQuery(
					api.collections.agentSessions.queries.getById,
					{ id: args.sessionId },
					{
						...session,
						attachments: [...session.attachments, args.attachment],
					},
				);
			}
		}
	});

	const removeAttachmentMutation = useMutation(
		api.collections.agentSessions.mutations.removeAttachment,
	).withOptimisticUpdate((store, args) => {
		const session = store.getQuery(
			api.collections.agentSessions.queries.getById,
			{ id: args.sessionId },
		);
		if (session) {
			store.setQuery(
				api.collections.agentSessions.queries.getById,
				{ id: args.sessionId },
				{
					...session,
					attachments: session.attachments.filter(
						(att) =>
							!(
								att.id === args.attachment.id &&
								att.type === args.attachment.type
							),
					),
				},
			);
		}
	});

	const clearAttachmentsMutation = useMutation(
		api.collections.agentSessions.mutations.clearAttachments,
	).withOptimisticUpdate((store, args) => {
		const session = store.getQuery(
			api.collections.agentSessions.queries.getById,
			{ id: args.sessionId },
		);
		if (session) {
			store.setQuery(
				api.collections.agentSessions.queries.getById,
				{ id: args.sessionId },
				{
					...session,
					attachments: [],
				},
			);
		}
	});

	const attachments = session.session?.attachments || [];

	const model = session.session?.model;
	const updateModelMutation = useMutation(
		api.collections.agentSessions.mutations.updateModel,
	).withOptimisticUpdate((store, args) => {
		const session = store.getQuery(
			api.collections.agentSessions.queries.getById,
			{ id: args.sessionId },
		);
		if (session) {
			store.setQuery(
				api.collections.agentSessions.queries.getById,
				{ id: args.sessionId },
				{
					...session,
					model: args.model,
				},
			);
		}
	});

	const queues = session.session?.messageQueue;
	const todoList = session.session?.todoList;

	const isLoading = status === "LoadingFirstPage";
	const isLoadingMore = status === "LoadingMore";
	const isCanLoadMore = status === "CanLoadMore";
	const isExhausted = status === "Exhausted";

	const chatStatus: ChatStatus = useMemo(() => {
		if (isLoading || session.isLoading || isLandingPageLoading)
			return "loading";
		const lastMessage = results[results.length - 1];
		if (!lastMessage) return "ready";
		if (lastMessage.status === "pending") return "submitted";
		if (lastMessage.status === "streaming") return "streaming";
		if (lastMessage.status === "failed") return "error";

		return "ready";
	}, [isLoading, results, session, isLandingPageLoading]);

	const sendMessage = useCallback(
		async (prompt: string) => {
			if (
				(chatStatus !== "ready" && chatStatus !== "error") ||
				!landingPage?.threadId ||
				!session.session?._id ||
				!session.session?.model
			)
				return;

			try {
				await sendMessageMutation({
					threadId: landingPage.threadId,
					prompt,
					sessionId: session.session?._id,
					model: session.session?.model,
					knowledgeBases: selectedKnowledgeBases.map((kb) => kb?._id),
				});
			} catch (error) {
				if (error instanceof ConvexError) {
					console.log("ConvexError", error);
					toast.error(error.data);
				}
			}
		},
		[
			sendMessageMutation,
			session.session?._id,
			session.session?.model,
			chatStatus,
			landingPage?.threadId,
			selectedKnowledgeBases,
		],
	);

	const abortStreamMutation = useMutation(
		api.components.agent.abortStreamByStreamId,
	);

	const pendingMessageId = useMemo(() => {
		return typedMessages.find(
			(message) =>
				message.role === "assistant" && message.status === "streaming",
		)?.id;
	}, [typedMessages]);

	const abortStream = useCallback(async () => {
		if (!pendingMessageId || !landingPage?.threadId) {
			toast.error("No pending message found");
			return;
		}
		await abortStreamMutation({
			threadId: landingPage.threadId,
		});
	}, [abortStreamMutation, landingPage?.threadId, pendingMessageId]);

	const addAttachment = useCallback(
		async (attachment: {
			type: "media" | "document";
			id: Id<"media"> | Id<"documents">;
		}) => {
			if (!session.session?._id) return;
			try {
				await addAttachmentMutation({
					sessionId: session.session._id,
					attachment: attachment as
						| { type: "media"; id: Id<"media"> }
						| { type: "document"; id: Id<"documents"> },
				});
			} catch (error) {
				if (error instanceof ConvexError) {
					toast.error(error.data);
				}
			}
		},
		[addAttachmentMutation, session.session?._id],
	);

	const removeAttachment = useCallback(
		async (attachment: {
			type: "media" | "document";
			id: Id<"media"> | Id<"documents">;
		}) => {
			if (!session.session?._id) return;
			try {
				await removeAttachmentMutation({
					sessionId: session.session._id,
					attachment: attachment as
						| { type: "media"; id: Id<"media"> }
						| { type: "document"; id: Id<"documents"> },
				});
			} catch (error) {
				if (error instanceof ConvexError) {
					toast.error(error.data);
				}
			}
		},
		[removeAttachmentMutation, session.session?._id],
	);

	const clearAttachments = useCallback(async () => {
		if (!session.session?._id) return;
		try {
			await clearAttachmentsMutation({
				sessionId: session.session._id,
			});
		} catch (error) {
			if (error instanceof ConvexError) {
				toast.error(error.data);
			}
		}
	}, [clearAttachmentsMutation, session.session?._id]);

	const clearConversationMutation = useMutation(
		api.components.agent.clearThreadAndCreateNew,
	).withOptimisticUpdate((store, args) => {
		// Optimistically clear messages from UI
		const landingPage = store.getQuery(
			api.collections.landingPages.queries.getById,
			{ id: args.landingPageId },
		);
		if (landingPage?.threadId) {
			// Clear messages from the old thread
			store.setQuery(
				api.components.agent.listLandingPageMessages,
				{
					threadId: landingPage.threadId,
					paginationOpts: {
						numItems: 140,
						cursor: null,
					},
				},
				undefined,
			);
		}
	});

	const clearConversation = useCallback(async () => {
		if (!landingPage?._id) return;
		try {
			toast.loading("Clearing conversation...", { id: "clear-conversation" });
			await clearConversationMutation({
				landingPageId: landingPage._id,
			});
			toast.success("Conversation cleared", {
				id: "clear-conversation",
				description: "Started fresh with a new conversation",
			});
		} catch (error) {
			if (error instanceof ConvexError) {
				toast.error("Failed to clear conversation", {
					id: "clear-conversation",
					description: error.data,
				});
			} else {
				toast.error("Failed to clear conversation", {
					id: "clear-conversation",
					description: "An unexpected error occurred",
				});
			}
		}
	}, [clearConversationMutation, landingPage?._id]);

	return {
		messages: typedMessages,
		sendMessage,
		abortStream,
		status,
		updateKnowledgeBases,
		availableKnowledgeBases,
		selectedKnowledgeBases,
		loadMore,
		isLoading,
		isLoadingMore,
		isCanLoadMore,
		isExhausted,
		chatStatus,
		model,
		updateModelMutation,
		queues,
		todoList,
		landingPage,
		attachments,
		addAttachment,
		removeAttachment,
		clearAttachments,
		clearConversation,
	};
};
