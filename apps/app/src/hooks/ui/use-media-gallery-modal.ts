import type { Id } from "@firebuzz/convex";
import { atom, useAtom } from "jotai";

type Tab = "gallery" | "unsplash" | "upload";
type Type = "image" | "video" | "audio";

interface MediaModalAtom {
	allowedTypes: Type[];
	allowMultiple: boolean;
	allowedSources: Tab[];
	maxFiles: number;
	isOpen: boolean;
	activeTab: Tab;
	onSelect: (
		data: {
			id: Id<"media">;
			url: string;
			key: string;
			fileName: string;
			description: string;
			type: Type;
			contentType: string;
			size: number;
		}[],
	) => void;
}

export const mediaModalAtom = atom<MediaModalAtom>({
	allowedTypes: ["image", "video", "audio"],
	allowMultiple: false,
	allowedSources: ["gallery", "unsplash", "upload"],
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
		setActiveTab: (value: Tab | ((prev: Tab) => Tab)) => {
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
					id: Id<"media">;
					url: string;
					key: string;
					fileName: string;
					description: string;
					type: Type;
					contentType: string;
					size: number;
				}[],
			) => void,
		) => {
			setState((prev) => {
				return { ...prev, onSelect: handler };
			});
		},
		setAllowedTypes: (types: Type[] | ((prev: Type[]) => Type[])) => {
			setState((prev) => {
				if (typeof types === "function") {
					return { ...prev, allowedTypes: types(prev.allowedTypes) };
				}
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
		setAllowedSources: (sources: Tab[] | ((prev: Tab[]) => Tab[])) => {
			setState((prev) => {
				if (typeof sources === "function") {
					return {
						...prev,
						allowedSources: sources(prev.allowedSources),
					};
				}
				return { ...prev, allowedSources: sources };
			});
		},
	};
};
