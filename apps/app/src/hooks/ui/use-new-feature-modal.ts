import { atom, useAtom } from "jotai";

interface NewFeatureModalState {
	create: boolean;
}

const newFeatureModalAtom = atom<NewFeatureModalState>({
	create: false,
});

export const useNewFeatureModal = () => useAtom(newFeatureModalAtom);
