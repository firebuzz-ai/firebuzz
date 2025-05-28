import { atom, useAtom } from "jotai";

interface ColorSelectorModal {
	isOpen: boolean;
	onSelect: (color: string) => void;
	activeTab: "library" | "custom" | "themes";
	color: string | undefined;
}

export const colorSelectorModalAtom = atom<ColorSelectorModal>({
	isOpen: false,
	color: undefined,
	onSelect: () => {},
	activeTab: "themes",
});

export const useColorSelectorModal = () => {
	const [state, setState] = useAtom(colorSelectorModalAtom);

	return {
		...state,
		setColor: (
			color:
				| string
				| undefined
				| ((prev: string | undefined) => string | undefined),
		) => {
			setState((prev) => {
				if (typeof color === "function") {
					return { ...prev, color: color(prev.color) };
				}
				return { ...prev, color: color };
			});
		},
		setState,
		setIsOpen: (value: boolean | ((prev: boolean) => boolean)) => {
			setState((prev) => {
				if (typeof value === "function") {
					return { ...prev, isOpen: value(prev.isOpen) };
				}
				return { ...prev, isOpen: value };
			});
		},
		setActiveTab: (
			value:
				| "library"
				| "custom"
				| "themes"
				| ((
						prev: "library" | "custom" | "themes",
				  ) => "library" | "custom" | "themes"),
		) => {
			setState((prev) => {
				if (typeof value === "function") {
					return { ...prev, activeTab: value(prev.activeTab) };
				}
				return { ...prev, activeTab: value };
			});
		},
	};
};
