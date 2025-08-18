import type { Doc } from "@firebuzz/convex";
import { atom, useAtom } from "jotai";

interface ConfigureProjectDomainModalState {
	configure: boolean;
	domain: Doc<"projectDomains"> | null;
}

const modalAtom = atom<ConfigureProjectDomainModalState>({
	configure: false,
	domain: null,
});

export const useConfigureProjectDomainModal = () => useAtom(modalAtom);
