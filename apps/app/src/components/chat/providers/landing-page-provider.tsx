"use client";

import { useCachedRichQuery } from "@firebuzz/convex";
import type { Doc, Id } from "@firebuzz/convex/nextjs";
import { api } from "@firebuzz/convex/nextjs";
import { createContext, type ReactNode } from "react";

interface LandingPageContextValue {
	landingPageId: Id<"landingPages">;
	campaignId: Id<"campaigns">;
	landingPage: Doc<"landingPages"> | null;
	campaign: Doc<"campaigns"> | null;
	currentVersionId: string | null;
	isLoading: boolean;
}

export const LandingPageContext = createContext<LandingPageContextValue | null>(
	null,
);

interface LandingPageProviderProps {
	children: ReactNode;
	landingPageId: Id<"landingPages">;
	campaignId: Id<"campaigns">;
}

export const LandingPageProvider = ({
	children,
	landingPageId,
	campaignId,
}: LandingPageProviderProps) => {
	const { data: landingPage, isPending: isLandingPageLoading } =
		useCachedRichQuery(
			api.collections.landingPages.queries.getById,
			landingPageId ? { id: landingPageId } : "skip",
		);

	const { data: campaign, isPending: isCampaignLoading } = useCachedRichQuery(
		api.collections.campaigns.queries.getById,
		campaignId ? { id: campaignId } : "skip",
	);

	const value: LandingPageContextValue = {
		landingPageId,
		campaignId,
		landingPage: landingPage || null,
		campaign: campaign || null,
		currentVersionId: landingPage?.landingPageVersionId || null,
		isLoading: isLandingPageLoading || isCampaignLoading,
	};

	return (
		<LandingPageContext.Provider value={value}>
			{children}
		</LandingPageContext.Provider>
	);
};
