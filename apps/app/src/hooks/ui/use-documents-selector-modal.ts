import type { Doc } from "@firebuzz/convex";
import { atom, useAtom } from "jotai";

type ActiveTab = "documents" | "upload";

interface DocumentSelectorModal {
  allowedTypes: Doc<"documents">["type"][];
  allowMultiple: boolean;
  maxFiles: number;
  isOpen: boolean;
  activeTab: ActiveTab;
  onSelect: (
    data: {
      id: string;
      url: string;
      key: string;
      fileName: string;
      type: Doc<"documents">["type"];
      contentType: string;
      size: number;
    }[]
  ) => void;
}

export const documentsSelectorModalAtom = atom<DocumentSelectorModal>({
  allowedTypes: ["md", "html", "txt", "pdf", "csv", "docx"],
  allowMultiple: false,
  maxFiles: 5,
  isOpen: false,
  onSelect: () => {},
  activeTab: "documents",
});

export const useDocumentsSelectorModal = () => {
  const [state, setState] = useAtom(documentsSelectorModalAtom);

  return {
    ...state,
    setState: setState,
    setActiveTab: (value: ActiveTab | ((prev: ActiveTab) => ActiveTab)) => {
      setState((prev) => {
        if (typeof value === "function") {
          return { ...prev, activeTab: value(prev.activeTab) };
        }
        return { ...prev, activeTab: value };
      });
    },
    setIsOpen: (value: boolean | ((prev: boolean) => boolean)) => {
      setState((prev) => {
        if (typeof value === "boolean") {
          return { ...prev, isOpen: value };
        }
        return { ...prev, isOpen: value(prev.isOpen) };
      });
    },
    setMaxFiles: (value: number | ((prev: number) => number)) => {
      setState((prev) => {
        if (typeof value === "number") {
          return { ...prev, maxFiles: value };
        }
        return { ...prev, maxFiles: value(prev.maxFiles) };
      });
    },
    setOnSelect: (
      handler: (
        data: {
          id: string;
          url: string;
          key: string;
          fileName: string;
          type: Doc<"documents">["type"];
          contentType: string;
          size: number;
        }[]
      ) => void
    ) => {
      setState((prev) => {
        return { ...prev, onSelect: handler };
      });
    },
    setAllowedTypes: (types: Doc<"documents">["type"][]) => {
      setState((prev) => {
        return { ...prev, allowedTypes: types };
      });
    },
    setAllowMultiple: (value: boolean | ((prev: boolean) => boolean)) => {
      setState((prev) => {
        if (typeof value === "boolean") {
          return { ...prev, allowMultiple: value };
        }
        return { ...prev, allowMultiple: value(prev.allowMultiple) };
      });
    },
  };
};
