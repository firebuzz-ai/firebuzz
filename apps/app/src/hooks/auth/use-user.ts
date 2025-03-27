import { useContext } from "react";
import { userContext } from "../../components/providers/workspace/user";

export const useUser = () => {
	return useContext(userContext);
};
