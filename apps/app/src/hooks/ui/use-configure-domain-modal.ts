import type { Doc } from "@firebuzz/convex";
import { atom, useAtom } from "jotai";

interface ConfigureDomainModalState {
	domain?: Doc<"customDomains">;
	isOpen?: boolean;
}

const configureDomainModalAtom = atom<ConfigureDomainModalState | null>(null);

export const useConfigureDomainModal = () => {
	return useAtom(configureDomainModalAtom);
};
