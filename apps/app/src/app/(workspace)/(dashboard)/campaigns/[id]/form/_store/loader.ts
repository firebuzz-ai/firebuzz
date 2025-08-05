"use client";

import { type Id, api, useCachedQuery } from "@firebuzz/convex";
import { atom } from "jotai";

// Loading state atom
export const isLoadingAtom = atom(false);
export const loadingErrorAtom = atom<string | null>(null);

// Campaign ID atom (set from component)
export const campaignIdAtom = atom<Id<"campaigns"> | null>(null);

// Data fetching atom that loads form data
export const loadFormDataAtom = atom(
	null,
	async (_get, set, campaignId: Id<"campaigns">) => {
		set(isLoadingAtom, true);
		set(loadingErrorAtom, null);
		set(campaignIdAtom, campaignId);

		try {
			// This will be replaced with a direct API call since we can't use hooks in atoms
			// For now, we'll set up the structure and handle the actual loading in the hook
			set(isLoadingAtom, false);
		} catch (error) {
			set(
				loadingErrorAtom,
				error instanceof Error ? error.message : "Failed to load form data",
			);
			set(isLoadingAtom, false);
		}
	},
);

// Hook to load form data (bridges the gap between hooks and atoms)
export const useFormDataLoader = (campaignId: Id<"campaigns">) => {
	// Get form data from Convex
	const formQuery = useCachedQuery(
		api.collections.forms.queries.getByCampaignId,
		{
			campaignId,
		},
	);

	return {
		form: formQuery,
		isLoading: !formQuery,
		error: null, // We can enhance error handling later
	};
};
