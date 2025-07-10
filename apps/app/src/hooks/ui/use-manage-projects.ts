import { parseAsBoolean, useQueryStates } from "nuqs";

export const useManageProjects = () => {
	return useQueryStates(
		{
			manageProjects: parseAsBoolean,
		},
		{
			urlKeys: {
				manageProjects: "manage-projects",
			},
			history: "replace",
		},
	);
};
