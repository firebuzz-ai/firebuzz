import { parseAsString, useQueryStates } from "nuqs";

export const useTemplatePreviewModal = () => {
	return useQueryStates(
		{
			templateId: parseAsString,
		},
		{
			urlKeys: {
				templateId: "tplId",
			},
		},
	);
};
