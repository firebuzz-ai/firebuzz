"use client";

import { createContext, useContext, useState } from "react";

interface ReasoningContextType {
	expandedReasoningIndex: number | null;
	setExpandedReasoningIndex: (index: number | null) => void;
}

const ReasoningContext = createContext<ReasoningContextType | null>(null);

export const useReasoningContext = () => {
	const context = useContext(ReasoningContext);
	return context;
};

interface ReasoningProviderProps {
	children: React.ReactNode;
}

export const ReasoningProvider = ({ children }: ReasoningProviderProps) => {
	const [expandedReasoningIndex, setExpandedReasoningIndex] = useState<
		number | null
	>(null);

	return (
		<ReasoningContext.Provider
			value={{ expandedReasoningIndex, setExpandedReasoningIndex }}
		>
			{children}
		</ReasoningContext.Provider>
	);
};
