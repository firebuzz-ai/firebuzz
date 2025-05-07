import { atom, useAtom } from "jotai";

interface NewDocumentModal {
  isOpen: boolean;
  isMemoryEnabled: boolean;
  selectedMemory: string | null;
  files: File[];
}

export const newDocumentModalAtom = atom<NewDocumentModal>({
  isOpen: false,
  isMemoryEnabled: false,
  selectedMemory: null,
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

  const setIsMemoryEnabled = (
    value: boolean | ((prev: boolean) => boolean)
  ) => {
    setState((prev) => ({
      ...prev,
      isMemoryEnabled:
        typeof value === "boolean" ? value : !prev.isMemoryEnabled,
    }));
  };

  const setSelectedMemory = (
    value: string | null | ((prev: string | null) => string | null)
  ) => {
    setState((prev) => ({
      ...prev,
      selectedMemory:
        typeof value === "function" ? value(prev.selectedMemory) : value,
    }));
  };

  return {
    ...state,
    setSelectedMemory,
    setState,
    setIsOpen,
    setFiles,
    setIsMemoryEnabled,
  };
};
