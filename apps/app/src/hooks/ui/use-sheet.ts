import { atom, useAtom } from "jotai";
import { atomFamily } from "jotai/utils";

export const sheetAtomFamily = atomFamily((key: string) =>
	atom({ key, isOpen: false }),
);

export const useSheet = (key: string) => {
	const [isOpen, setIsOpen] = useAtom(sheetAtomFamily(key));

	return {
		isOpen: isOpen.isOpen,
		setIsOpen: (value: boolean | ((prev: boolean) => boolean)) => {
			setIsOpen((prev) => {
				if (typeof value === "boolean") {
					return { ...prev, isOpen: value };
				}
				return { ...prev, isOpen: value(prev.isOpen) };
			});
		},
	};
};
