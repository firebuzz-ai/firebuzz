import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";

export const useNewMemoryItem = () => {
	return useQueryStates(
		{
			createMemoryItem: parseAsBoolean,
			knowledgeBase: parseAsString,
		},
		{
			urlKeys: {
				createMemoryItem: "create-memory-item",
				knowledgeBase: "knowledge-base",
			},
		},
	);
};
