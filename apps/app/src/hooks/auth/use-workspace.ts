import { workspaceContext } from "@/components/providers/workspace/workspace";
import { useContext } from "react";

export const useWorkspace = () => {
	return useContext(workspaceContext);
};
