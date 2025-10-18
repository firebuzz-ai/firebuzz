"use client";

import { createContext, useContext, useState } from "react";

type ChatTab = "chat" | "history";

interface ChatTabsContextType {
	activeTab: ChatTab;
	setActiveTab: (tab: ChatTab) => void;
}

const ChatTabsContext = createContext<ChatTabsContextType | null>(null);

export const ChatTabsProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const [activeTab, setActiveTab] = useState<ChatTab>("chat");

	return (
		<ChatTabsContext.Provider value={{ activeTab, setActiveTab }}>
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
