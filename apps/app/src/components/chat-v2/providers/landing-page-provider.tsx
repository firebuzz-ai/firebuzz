"use client";

import { useCachedRichQuery } from "@firebuzz/convex";
import type { Doc, Id } from "@firebuzz/convex/nextjs";
import { api } from "@firebuzz/convex/nextjs";
import { createContext, type ReactNode, useContext } from "react";

interface LandingPageContextValue {
	landingPageId: Id<"landingPages">;
	campaignId: Id<"campaigns">;
	landingPage: Doc<"landingPages"> | null;
	campaign: Doc<"campaigns"> | null;
	currentVersionId: string | null;
	isLoading: boolean;
}

const LandingPageContext = createContext<LandingPageContextValue | null>(null);

export const useLandingPageContext = () => {
	const context = useContext(LandingPageContext);
	if (!context) {
		throw new Error(
			"useLandingPageContext must be used within LandingPageProvider",
		);
	}
	return context;
};

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
		useCachedRichQuery(api.collections.landingPages.queries.getById, {
			id: landingPageId,
		});

	const { data: campaign, isPending: isCampaignLoading } = useCachedRichQuery(
		api.collections.campaigns.queries.getById,
		{
			id: campaignId,
		},
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
