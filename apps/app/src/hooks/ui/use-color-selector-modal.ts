import { atom, useAtom } from "jotai";

export interface SystemColor {
	name: string;
	displayName: string;
	hexValue: string;
	category: string;
	description: string;
}

interface ColorSelectorModal {
	isOpen: boolean;
	onSelect: (color: string) => void;
	activeTab: "system" | "library" | "custom" | "themes";
	color: string | undefined;
	systemColors: SystemColor[];
}

export const colorSelectorModalAtom = atom<ColorSelectorModal>({
	isOpen: false,
	color: undefined,
	onSelect: () => {},
	activeTab: "system",
	systemColors: [],
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
				| "system"
				| "library"
				| "custom"
				| "themes"
				| ((
						prev: "system" | "library" | "custom" | "themes",
				  ) => "system" | "library" | "custom" | "themes"),
		) => {
			setState((prev) => {
				if (typeof value === "function") {
					return { ...prev, activeTab: value(prev.activeTab) };
				}
				return { ...prev, activeTab: value };
			});
		},
		setSystemColors: (colors: SystemColor[]) => {
			setState((prev) => ({ ...prev, systemColors: colors }));
		},
	};
};
