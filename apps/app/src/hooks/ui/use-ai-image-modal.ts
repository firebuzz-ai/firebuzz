import { useAtom } from "jotai";
import { RESET, atomWithReset } from "jotai/utils";
import { useCallback, useMemo } from "react";

export type ImageSize = "1024x1024" | "1536x1024" | "1024x1536" | "auto";
export type ImageQuality = "low" | "medium" | "high";
export type BrushSize = "sm" | "md" | "lg" | "xl";
export type GeneratedImage = {
	name: string;
	imageKey: string;
	prompt: string;
	quality: ImageQuality;
	size: ImageSize;
	contentType: string;
	fileSize: number;
};

export type ImageType = {
	key: string;
	name: string;
	contentType: string;
	size: number;
};

export const aiImageModalAtom = atomWithReset<{
	isOpen: boolean;
	images: ImageType[];
	generations: GeneratedImage[];
	selectedImage: ImageType | undefined;
	selectedImageQuality: ImageQuality;
	selectedImageSize: ImageSize;
	selectedImagePrompt: string;
	isMasking: boolean;
	onInsert: null | ((image: ImageType) => void);
}>({
	isOpen: false,
	images: [],
	generations: [],
	selectedImage: undefined,
	selectedImageQuality: "medium",
	selectedImageSize: "auto",
	selectedImagePrompt: "",
	isMasking: false,
	onInsert: null,
});

const brushAtom = atomWithReset<{
	size: BrushSize;
	scale: number;
}>({
	size: "md",
	scale: 1,
});

export const useBrush = () => {
	const [state, setState] = useAtom(brushAtom);

	const reset = useCallback(() => {
		setState(RESET);
	}, [setState]);

	return {
		...state,
		setSize: (size: BrushSize | ((prev: BrushSize) => BrushSize)) => {
			if (typeof size === "function") {
				setState((prev) => ({ ...prev, size: size(prev.size) }));
			} else {
				setState((prev) => ({ ...prev, size }));
			}
		},
		setScale: (scale: number | ((prev: number) => number)) => {
			if (typeof scale === "function") {
				setState((prev) => ({ ...prev, scale: scale(prev.scale) }));
			} else {
				setState((prev) => ({ ...prev, scale }));
			}
		},
		reset,
	};
};

export const useAIImageModal = () => {
	const [state, setState] = useAtom(aiImageModalAtom);

	const reset = useCallback(() => {
		setState(RESET);
	}, [setState]);

	const openWithReset = useCallback(() => {
		reset();
		setState((prev) => ({ ...prev, isOpen: true }));
	}, [reset, setState]);

	const isSelectedImagePrimary = useMemo(() => {
		return (
			state.images.length > 0 &&
			state.images[0].key === state.selectedImage?.key
		);
	}, [state.images, state.selectedImage]);

	return {
		...state,
		isSelectedImagePrimary,
		reset,
		openWithReset,
		setState,
		setIsOpen: (isOpen: boolean | ((prev: boolean) => boolean)) => {
			if (typeof isOpen === "function") {
				setState((prev) => ({ ...prev, isOpen: isOpen(prev.isOpen) }));
			} else {
				setState((prev) => ({ ...prev, isOpen }));
			}
		},
		setSelectedImagePrompt: (
			selectedImagePrompt: string | ((prev: string) => string),
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
			selectedImageSize: ImageSize | ((prev: ImageSize) => ImageSize),
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
				| ((prev: ImageQuality) => ImageQuality),
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
			selectedImage: ImageType | undefined,
			selectedImageQuality?: ImageQuality,
			selectedImageSize?: ImageSize,
			selectedImagePrompt?: string | undefined,
		) => {
			setState((prev) => ({
				...prev,
				selectedImage: selectedImage ?? undefined,
				selectedImageQuality: selectedImageQuality ?? prev.selectedImageQuality,
				selectedImageSize: selectedImageSize ?? prev.selectedImageSize,
				selectedImagePrompt: selectedImagePrompt ?? prev.selectedImagePrompt,
			}));
		},
		setImages: (images: ImageType[] | ((prev: ImageType[]) => ImageType[])) => {
			if (typeof images === "function") {
				setState((prev) => ({
					...prev,
					images: images(prev.images).map((image) => ({
						key: image.key,
						name: image.name,
						contentType: image.contentType,
						size: image.size,
					})),
				}));
			} else {
				setState((prev) => ({ ...prev, images }));
			}
		},
		setOnInsert: (onInsert: null | ((image: ImageType) => void)) => {
			setState((prev) => ({ ...prev, onInsert }));
		},
		setIsMasking: (isMasking: boolean | ((prev: boolean) => boolean)) => {
			if (typeof isMasking === "function") {
				setState((prev) => ({ ...prev, isMasking: isMasking(prev.isMasking) }));
			} else {
				setState((prev) => ({ ...prev, isMasking }));
			}
		},
		setGenerations: (
			generations:
				| GeneratedImage[]
				| ((prev: GeneratedImage[]) => GeneratedImage[]),
		) => {
			if (typeof generations === "function") {
				setState((prev) => ({
					...prev,
					generations: generations(prev.generations),
				}));
			} else {
				setState((prev) => ({ ...prev, generations }));
			}
		},
	};
};
