import { atom, useAtom } from "jotai";

export type ImageSize = "1024x1024" | "1536x1024" | "1024x1536" | "auto";
export type ImageQuality = "low" | "medium" | "high";

const aiImageModalAtom = atom<{
  isOpen: boolean;
  selectedImage: string | undefined;
  selectedImageQuality: ImageQuality;
  selectedImageSize: ImageSize;
  selectedImagePrompt: string;
  onInsert: null | ((imageKey: string) => void);
}>({
  isOpen: false,
  selectedImage: undefined,
  selectedImageQuality: "medium",
  selectedImageSize: "auto",
  selectedImagePrompt: "",
  onInsert: null,
});

export const useAIImageModal = () => {
  const [state, setState] = useAtom(aiImageModalAtom);

  return {
    ...state,
    setIsOpen: (isOpen: boolean | ((prev: boolean) => boolean)) => {
      if (typeof isOpen === "function") {
        setState((prev) => ({ ...prev, isOpen: isOpen(prev.isOpen) }));
      } else {
        setState((prev) => ({ ...prev, isOpen }));
      }
    },
    setSelectedImagePrompt: (
      selectedImagePrompt: string | ((prev: string) => string)
    ) => {
      if (typeof selectedImagePrompt === "function") {
        setState((prev) => ({
          ...prev,
          selectedImagePrompt: selectedImagePrompt(prev.selectedImagePrompt),
        }));
      } else {
        setState((prev) => ({ ...prev, selectedImagePrompt }));
      }
    },
    setSelectedImageSize: (
      selectedImageSize: ImageSize | ((prev: ImageSize) => ImageSize)
    ) => {
      if (typeof selectedImageSize === "function") {
        setState((prev) => ({
          ...prev,
          selectedImageSize: selectedImageSize(prev.selectedImageSize),
        }));
      } else {
        setState((prev) => ({ ...prev, selectedImageSize }));
      }
    },
    setSelectedImageQuality: (
      selectedImageQuality:
        | ImageQuality
        | ((prev: ImageQuality) => ImageQuality)
    ) => {
      if (typeof selectedImageQuality === "function") {
        setState((prev) => ({
          ...prev,
          selectedImageQuality: selectedImageQuality(prev.selectedImageQuality),
        }));
      } else {
        setState((prev) => ({ ...prev, selectedImageQuality }));
      }
    },
    setSelectedImage: (
      selectedImage: string | undefined,
      selectedImageQuality?: ImageQuality | undefined,
      selectedImageSize?: ImageSize | undefined,
      selectedImagePrompt?: string | undefined
    ) => {
      setState((prev) => ({
        ...prev,
        selectedImage,
        selectedImageQuality: selectedImageQuality ?? prev.selectedImageQuality,
        selectedImageSize: selectedImageSize ?? prev.selectedImageSize,
        selectedImagePrompt: selectedImagePrompt ?? prev.selectedImagePrompt,
      }));
    },
    setOnInsert: (onInsert: null | ((imageKey: string) => void)) => {
      setState((prev) => ({ ...prev, onInsert }));
    },
  };
};
