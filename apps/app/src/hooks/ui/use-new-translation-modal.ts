import type { Id } from "@firebuzz/convex";
import { atom, useAtom } from "jotai";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";

interface NewTranslationModalState {
	createTranslation?: boolean;
	originalLandingPageId?: Id<"landingPages">;
}

const newTranslationModalAtom = atom<NewTranslationModalState | null>(null);

export const useNewTranslationModal = () => {
	const [state, setState] = useAtom(newTranslationModalAtom);
	const searchParams = useSearchParams();
	const router = useRouter();

	// Sync state with URL params
	useEffect(() => {
		const createTranslation = searchParams.get("createTranslation") === "true";
		const originalLandingPageId = searchParams.get("originalLandingPageId") as Id<"landingPages"> | null;

		if (createTranslation) {
			setState({
				createTranslation: true,
				originalLandingPageId: originalLandingPageId || undefined,
			});
		} else if (state?.createTranslation) {
			setState(null);
		}
	}, [searchParams, state?.createTranslation, setState]);

	// Method to open modal with required parameters
	const openModal = useCallback(
		(originalLandingPageId: Id<"landingPages">) => {
			const params = new URLSearchParams(window.location.search);
			params.set("createTranslation", "true");
			params.set("originalLandingPageId", originalLandingPageId);

			router.push(`${window.location.pathname}?${params.toString()}`);
		},
		[router],
	);

	// Method to close modal
	const closeModal = useCallback(() => {
		const params = new URLSearchParams(window.location.search);
		params.delete("createTranslation");
		params.delete("originalLandingPageId");

		const newUrl = params.toString()
			? `${window.location.pathname}?${params.toString()}`
			: window.location.pathname;

		router.push(newUrl);
	}, [router]);

	return [state, { setState, openModal, closeModal }] as const;
};