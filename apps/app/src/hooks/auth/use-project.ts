import { projectContext } from "@/components/providers/workspace/project";
import { useContext } from "react";

export const useProject = () => {
	return useContext(projectContext);
};
