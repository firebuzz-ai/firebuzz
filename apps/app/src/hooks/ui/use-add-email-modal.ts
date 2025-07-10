import { atom, useAtom } from "jotai";

interface AddEmailModalState {
	create?: boolean;
}

const addEmailModalAtom = atom<AddEmailModalState | null>(null);

export const useAddEmailModal = () => {
	return useAtom(addEmailModalAtom);
};
