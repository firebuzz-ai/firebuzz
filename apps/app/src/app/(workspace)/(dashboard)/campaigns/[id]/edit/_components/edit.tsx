"use client";
import { api, type Id, useCachedRichQuery } from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { notFound } from "next/navigation";
import { FlowLayout } from "@/components/layouts/two-panels/panels/campaign/flow";
import { PanelLayout } from "@/components/layouts/two-panels/panels/campaign/panel";
import { TwoPanelsProvider } from "@/components/layouts/two-panels/provider";
import { NewLandingPageModal } from "@/components/modals/landing-pages/landing-page-modal";
import { TrackingSetupModal } from "@/components/modals/tracking/tracking-setup-modal";
import { CampaignCanvas } from "./canvas";
import { Panel } from "./panel";

interface EditCampaignProps {
	id: string;
	rightPanelSize: number;
}

export function EditCampaign({ id, rightPanelSize }: EditCampaignProps) {
	const {
		data: campaign,
		isPending: isLoading,
		isError,
	} = useCachedRichQuery(
		api.collections.campaigns.queries.getById,
		id
			? {
					id: id as Id<"campaigns">,
				}
			: "skip",
	);

	if (isLoading) {
		return (
			<div className="flex justify-center items-center w-full h-full">
				<Spinner size="sm" />
			</div>
		);
	}

	if (isError) {
		return <div>Error</div>;
	}

	if (!campaign) {
		return notFound();
	}

	return (
		<>
			<TwoPanelsProvider
				rightPanelSizeFromCookie={rightPanelSize}
				id="campaign-flow"
				isRightPanelClosable={false}
			>
				<FlowLayout>
					<CampaignCanvas campaign={campaign} />
				</FlowLayout>
				<PanelLayout>
					<Panel campaign={campaign} />
				</PanelLayout>
			</TwoPanelsProvider>
			<NewLandingPageModal />
			<TrackingSetupModal />
		</>
	);
}
