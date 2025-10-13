"use client";

import { createContext, useContext, useState } from "react";

interface ReasoningContextType {
	expandedReasoningId: string | null;
	setExpandedReasoningId: (id: string | null) => void;
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
	const [expandedReasoningId, setExpandedReasoningId] = useState<string | null>(
		null,
	);

	return (
		<ReasoningContext.Provider
			value={{ expandedReasoningId, setExpandedReasoningId }}
		>
			{children}
		</ReasoningContext.Provider>
	);
};
