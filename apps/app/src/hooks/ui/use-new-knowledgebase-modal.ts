import { parseAsBoolean } from "nuqs";

import { useQueryStates } from "nuqs";

export const useNewKnowledgeBaseModal = () => {
	return useQueryStates(
		{
			create: parseAsBoolean,
		},
		{
			urlKeys: {
				create: "create",
			},
		},
	);
};
