"use client";

import { useAgentSession } from "@/hooks/agent/use-agent-session";
import { api, useMutation, useQuery } from "@firebuzz/convex";
import { createContext, useContext } from "react";

export type ChatTab = "chat" | "history" | "design";

interface ChatTabsContextType {
	activeTab: ChatTab;
	setActiveTab: (tab: ChatTab) => void;
	isLoading: boolean;
}

const ChatTabsContext = createContext<ChatTabsContextType | null>(null);

export const ChatTabsProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const { session } = useAgentSession();

	// Get active tab from Convex (reactive)
	const activeTab = useQuery(
		api.collections.agentSessions.queries.getActiveTab,
		session?._id ? { sessionId: session._id } : "skip",
	);

	// Use mutation with optimistic update
	const setActiveTabMutation = useMutation(
		api.collections.agentSessions.mutations.setActiveTab,
	).withOptimisticUpdate((localStore, args) => {
		// Optimistically update the active tab query
		localStore.setQuery(
			api.collections.agentSessions.queries.getActiveTab,
			{ sessionId: args.sessionId },
			args.activeTab,
		);
	});

	const setActiveTab = (tab: ChatTab) => {
		if (!session?._id) return;
		setActiveTabMutation({
			sessionId: session._id,
			activeTab: tab,
		});
	};

	return (
		<ChatTabsContext.Provider
			value={{
				activeTab: activeTab ?? "chat",
				setActiveTab,
				isLoading: !activeTab,
			}}
		>
			{children}
		</ChatTabsContext.Provider>
	);
};

export const useChatTabs = () => {
	const context = useContext(ChatTabsContext);
	if (!context) {
		throw new Error("useChatTabs must be used within ChatTabsProvider");
	}
	return context;
};
