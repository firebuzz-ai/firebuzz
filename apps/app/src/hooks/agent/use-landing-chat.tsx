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
		useCachedRichQuery(api.collections.landingPages.queries.getById, {
			id: landingPageId,
		});

	const { results, status, loadMore } = useUIMessages(
		api.components.agent.listLandingPageMessages,
		{ landingPageId, threadId: "" }, // threadId is passed as empty string to make ts happy (We are inheriting it from the landing page)
		{ initialNumItems: 140, stream: true },
	);

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

	const abortStream = useCallback(async () => {
		await abortStreamMutation({ landingPageId });
	}, [abortStreamMutation, landingPageId]);

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
	};
};
