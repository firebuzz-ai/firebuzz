import { parseAsBoolean, useQueryStates } from "nuqs";

export const useManageSeats = () => {
	return useQueryStates(
		{
			manageSeats: parseAsBoolean,
		},
		{
			urlKeys: {
				manageSeats: "manage-seats",
			},
			history: "replace",
		},
	);
};
