import { useContext } from "react";
import { projectContext } from "@/components/providers/workspace/project";

export const useProject = () => {
	return useContext(projectContext);
};
