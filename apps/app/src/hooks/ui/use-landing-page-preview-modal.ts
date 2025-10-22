import { parseAsString, useQueryStates } from "nuqs";

export const useLandingPagePreviewModal = () => {
	return useQueryStates(
		{
			landingPageId: parseAsString,
		},
		{
			urlKeys: {
				landingPageId: "lpId",
			},
		},
	);
};
