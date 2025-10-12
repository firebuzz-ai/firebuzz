import { useContext } from "react";
import { workspaceContext } from "@/components/providers/workspace/workspace";

export const useWorkspace = () => {
	return useContext(workspaceContext);
};
