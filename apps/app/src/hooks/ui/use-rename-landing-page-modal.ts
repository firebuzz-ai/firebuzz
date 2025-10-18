import type { Id } from "@firebuzz/convex";
import { atom, useAtom } from "jotai";

interface RenameLandingPageModalState {
	landingPageId: Id<"landingPages">;
	currentTitle: string;
}

const renameLandingPageModalAtom =
	atom<RenameLandingPageModalState | null>(null);

export const useRenameLandingPageModal = () => {
	return useAtom(renameLandingPageModalAtom);
};
