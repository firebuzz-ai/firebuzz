import { parseAsBoolean, useQueryStates } from "nuqs";

export const useNewThemeModal = () => {
	return useQueryStates(
		{
			create: parseAsBoolean,
		},
		{
			urlKeys: {
				create: "create-theme",
			},
		},
	);
};
