import type { Id } from "@firebuzz/convex";
import { atom, useAtom } from "jotai";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";

interface NewCampaignModalState {
	createCampaign?: boolean;
	projectId?: Id<"projects">;
}

const newCampaignModalAtom = atom<NewCampaignModalState | null>(null);

export const useNewCampaignModal = () => {
	const [state, setState] = useAtom(newCampaignModalAtom);
	const searchParams = useSearchParams();
	const router = useRouter();

	// Sync state with URL params
	useEffect(() => {
		const createCampaign = searchParams.get("createCampaign") === "true";
		const projectId = searchParams.get("projectId") as Id<"projects"> | null;

		if (createCampaign) {
			setState({
				createCampaign: true,
				projectId: projectId || undefined,
			});
		} else if (state?.createCampaign) {
			setState(null);
		}
	}, [searchParams, state?.createCampaign, setState]);

	// Method to open modal with optional project ID
	const openModal = useCallback(
		(projectId?: Id<"projects">) => {
			const params = new URLSearchParams(window.location.search);
			params.set("createCampaign", "true");

			if (projectId) {
				params.set("projectId", projectId);
			}

			router.push(`${window.location.pathname}?${params.toString()}`);
		},
		[router],
	);

	// Method to close modal
	const closeModal = useCallback(() => {
		const params = new URLSearchParams(window.location.search);
		params.delete("createCampaign");
		params.delete("projectId");

		const newUrl = params.toString()
			? `${window.location.pathname}?${params.toString()}`
			: window.location.pathname;

		router.push(newUrl);
	}, [router]);

	return [state, { setState, openModal, closeModal }] as const;
};