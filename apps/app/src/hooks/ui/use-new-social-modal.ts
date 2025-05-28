import { parseAsBoolean, useQueryStates } from "nuqs";

export const useNewSocialModal = () => {
	return useQueryStates(
		{
			create: parseAsBoolean,
		},
		{
			urlKeys: {
				create: "create-social",
			},
		},
	);
};
