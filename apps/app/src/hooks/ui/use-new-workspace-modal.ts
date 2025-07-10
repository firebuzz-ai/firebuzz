import { atom, useAtom } from "jotai";

interface NewWorkspaceModalState {
	create?: boolean;
}

const newWorkspaceModalAtom = atom<NewWorkspaceModalState | null>(null);

export const useNewWorkspaceModal = () => {
	return useAtom(newWorkspaceModalAtom);
};
