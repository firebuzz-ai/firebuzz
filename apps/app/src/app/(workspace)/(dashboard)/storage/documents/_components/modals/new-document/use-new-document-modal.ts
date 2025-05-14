import { atom, useAtom } from "jotai";

interface NewDocumentModal {
  isOpen: boolean;
  isKnowledgeBaseEnabled: boolean;
  selectedKnowledgeBase: string | null;
  files: File[];
}

export const newDocumentModalAtom = atom<NewDocumentModal>({
  isOpen: false,
  isKnowledgeBaseEnabled: false,
  selectedKnowledgeBase: null,
  files: [],
});

export const useNewDocumentModal = () => {
  const [state, setState] = useAtom(newDocumentModalAtom);

  const setIsOpen = (value: boolean | ((prev: boolean) => boolean)) => {
    setState((prev) => ({
      ...prev,
      isOpen: typeof value === "boolean" ? value : !prev.isOpen,
    }));
  };

  const setFiles = (value: File[] | ((prev: File[]) => File[])) => {
    setState((prev) => ({
      ...prev,
      files: typeof value === "function" ? value(prev.files) : value,
    }));
  };

  const setIsKnowledgeBaseEnabled = (
    value: boolean | ((prev: boolean) => boolean)
  ) => {
    setState((prev) => ({
      ...prev,
      isKnowledgeBaseEnabled:
        typeof value === "boolean" ? value : !prev.isKnowledgeBaseEnabled,
    }));
  };

  const setSelectedKnowledgeBase = (
    value: string | null | ((prev: string | null) => string | null)
  ) => {
    setState((prev) => ({
      ...prev,
      selectedKnowledgeBase:
        typeof value === "function" ? value(prev.selectedKnowledgeBase) : value,
    }));
  };

  return {
    ...state,
    setSelectedKnowledgeBase,
    setState,
    setIsOpen,
    setFiles,
    setIsKnowledgeBaseEnabled,
  };
};
