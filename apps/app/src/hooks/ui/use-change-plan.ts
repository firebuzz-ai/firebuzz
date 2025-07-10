import { parseAsBoolean, useQueryStates } from "nuqs";

export const useChangePlan = () => {
	return useQueryStates(
		{
			changePlan: parseAsBoolean,
		},
		{
			urlKeys: {
				changePlan: "change-plan",
			},
			history: "replace",
		},
	);
};
