import { atom, useAtom } from "jotai";

type ActiveTab = "gallery" | "unsplash" | "upload";

interface MediaModalAtom {
  allowedTypes: ("image" | "video" | "audio")[];
  allowMultiple: boolean;
  maxFiles: number;
  isOpen: boolean;
  activeTab: ActiveTab;
  onSelect: (
    data: {
      url: string;
      key: string;
      fileName: string;
      description: string;
      type: "image" | "video" | "audio";
      contentType: string;
      size: number;
    }[]
  ) => void;
}

export const mediaModalAtom = atom<MediaModalAtom>({
  allowedTypes: ["image", "video", "audio"],
  allowMultiple: false,
  maxFiles: 5,
  isOpen: false,
  onSelect: () => {},
  activeTab: "gallery",
});

export const useMediaGalleryModal = () => {
  const [state, setState] = useAtom(mediaModalAtom);

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
          url: string;
          key: string;
          fileName: string;
          description: string;
          type: "image" | "video" | "audio";
          contentType: string;
          size: number;
        }[]
      ) => void
    ) => {
      setState((prev) => {
        return { ...prev, onSelect: handler };
      });
    },
    setAllowedTypes: (types: ("image" | "video" | "audio")[]) => {
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
