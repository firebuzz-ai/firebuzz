import { atom, useAtom } from "jotai";

interface NewMediaModal {
  isOpen: boolean;
  type: "upload" | "unsplash" | "ai";
  files: File[];
}

export const newMediaModalAtom = atom<NewMediaModal>({
  isOpen: false,
  type: "upload",
  files: [],
});

export const useNewMediaModal = () => {
  const [state, setState] = useAtom(newMediaModalAtom);

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

  const setType = (value: "upload" | "unsplash" | "ai") => {
    setState((prev) => ({
      ...prev,
      type: value,
    }));
  };

  return {
    isOpen: state.isOpen,
    files: state.files,
    type: state.type,
    setIsOpen,
    setFiles,
    setType,
    setState,
  };
};
