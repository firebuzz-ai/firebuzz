import { parseAsString, useQueryStates } from "nuqs";

export const useEditSocialModal = () => {
	return useQueryStates(
		{
			edit: parseAsString,
		},
		{
			urlKeys: {
				edit: "edit-social",
			},
		},
	);
};
