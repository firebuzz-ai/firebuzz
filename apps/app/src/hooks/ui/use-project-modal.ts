import type { Doc } from "@firebuzz/convex";
import { atom, useAtom } from "jotai";

interface ProjectModalState {
	create?: boolean;
	edit?: {
		project: Doc<"projects">;
	};
}

const projectModalAtom = atom<ProjectModalState | null>(null);

export const useProjectModal = () => {
	return useAtom(projectModalAtom);
};
