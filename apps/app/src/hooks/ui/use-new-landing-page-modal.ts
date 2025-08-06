import type { Id } from "@firebuzz/convex";
import { atom, useAtom } from "jotai";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";

interface NewLandingPageModalState {
	createLandingPage?: boolean;
	campaignId?: Id<"campaigns">;
}

const newLandingPageModalAtom = atom<NewLandingPageModalState | null>(null);

export const useNewLandingPageModal = () => {
	const [state, setState] = useAtom(newLandingPageModalAtom);
	const searchParams = useSearchParams();
	const router = useRouter();

	// Sync state with URL params
	useEffect(() => {
		const createLandingPage = searchParams.get("createLandingPage") === "true";
		const campaignId = searchParams.get("campaignId") as Id<"campaigns"> | null;

		if (createLandingPage) {
			setState({
				createLandingPage: true,
				campaignId: campaignId || undefined,
			});
		} else if (state?.createLandingPage) {
			setState(null);
		}
	}, [searchParams, state?.createLandingPage, setState]);

	// Method to open modal with optional campaign ID
	const openModal = useCallback(
		(campaignId?: Id<"campaigns">) => {
			const params = new URLSearchParams(window.location.search);
			params.set("createLandingPage", "true");

			if (campaignId) {
				params.set("campaignId", campaignId);
			}

			router.push(`${window.location.pathname}?${params.toString()}`);
		},
		[router],
	);

	// Method to close modal
	const closeModal = useCallback(() => {
		const params = new URLSearchParams(window.location.search);
		params.delete("createLandingPage");
		params.delete("campaignId");

		const newUrl = params.toString()
			? `${window.location.pathname}?${params.toString()}`
			: window.location.pathname;

		router.push(newUrl);
	}, [router]);

	return [state, { setState, openModal, closeModal }] as const;
};
