import { createContext, useContext } from "react";

export interface ReasoningContextType {
	expandedReasoningIndex: number | null;
	setExpandedReasoningIndex: (index: number | null) => void;
}

export const ReasoningContext = createContext<ReasoningContextType | null>(
	null,
);

export const useReasoningContext = () => {
	const context = useContext(ReasoningContext);
	return context;
};
