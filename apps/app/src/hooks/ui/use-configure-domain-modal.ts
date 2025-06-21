import type { Doc } from "@firebuzz/convex";
import { atom, useAtom } from "jotai";

interface ConfigureDomainModalState {
	domain?: Doc<"domains">;
	isOpen?: boolean;
}

const configureDomainModalAtom = atom<ConfigureDomainModalState | null>(null);

export const useConfigureDomainModal = () => {
	return useAtom(configureDomainModalAtom);
};
