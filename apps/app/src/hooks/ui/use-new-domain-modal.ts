import { atom, useAtom } from "jotai";

interface NewDomainModalState {
  create?: boolean;
}

const newDomainModalAtom = atom<NewDomainModalState | null>(null);

export const useNewDomainModal = () => {
  return useAtom(newDomainModalAtom);
};
