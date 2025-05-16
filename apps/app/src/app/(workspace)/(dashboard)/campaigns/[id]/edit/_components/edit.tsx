"use client";
import { CanvasProvider } from "@/components/canvas/provider";
import { FlowLayout } from "@/components/layouts/two-panels/panels/campaign/flow";
import { PanelLayout } from "@/components/layouts/two-panels/panels/campaign/panel";
import { TwoPanelsProvider } from "@/components/layouts/two-panels/provider";
import { type Id, api, useRichQuery } from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { notFound } from "next/navigation";
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
	} = useRichQuery(
		api.collections.campaigns.queries.getById,
		id
			? {
					id: id as Id<"campaigns">,
				}
			: "skip",
	);

	if (isLoading) {
		return (
			<div className="flex h-full w-full items-center justify-center">
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
		<TwoPanelsProvider
			rightPanelSizeFromCookie={rightPanelSize}
			id="campaign-flow"
			isRightPanelClosable={false}
		>
			<CanvasProvider>
				<FlowLayout>
					<CampaignCanvas campaign={campaign} />
				</FlowLayout>
				<PanelLayout>
					<Panel />
				</PanelLayout>
			</CanvasProvider>
		</TwoPanelsProvider>
	);
}
