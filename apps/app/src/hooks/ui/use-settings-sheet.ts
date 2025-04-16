import { atom, useAtom } from "jotai";

export const settingsSheetAtom = atom(false);

export const useSettingsSheet = () => {
  const [isOpen, setIsOpen] = useAtom(settingsSheetAtom);

  return {
    isOpen,
    setIsOpen,
  };
};
