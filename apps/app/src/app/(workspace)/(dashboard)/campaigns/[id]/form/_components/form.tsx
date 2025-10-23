"use client";
import { api, type Id, useRichQuery } from "@firebuzz/convex";
import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { notFound } from "next/navigation";
import { Canvas, FormCanvasProvider } from "@/components/canvas/forms";
import { FlowLayout } from "@/components/layouts/two-panels/panels/campaign/flow";
import { PanelLayout } from "@/components/layouts/two-panels/panels/campaign/panel";
import { TwoPanelsProvider } from "@/components/layouts/two-panels/provider";
// Removed Jotai dependencies - using canvas-only approach with optimistic updates
import { Panel } from "./panel/panel";

interface FormCampaignProps {
	id: string;
	rightPanelSize: number;
}

// Inner component that uses the form hooks (needs to be inside the provider)
function FormCampaignInner({
	campaign,
	rightPanelSize,
}: {
	campaign: { _id: Id<"campaigns">; type: string };
	rightPanelSize: number;
}) {
	// Canvas mode uses optimistic updates - no need for separate auto-save

	// Get form data for the canvas
	const { data: formData, isPending: isFormLoading } = useRichQuery(
		api.collections.forms.queries.getByCampaignId,
		{ campaignId: campaign._id },
	);

	// Canvas-only approach - removed traditional mode

	if (isFormLoading) {
		return (
			<div className="flex justify-center items-center w-full h-full">
				<Spinner size="sm" />
			</div>
		);
	}

	if (!formData) {
		return (
			<div className="flex justify-center items-center w-full h-full">
				<div>Form data not found</div>
			</div>
		);
	}

	// Canvas-only mode with optimistic updates
	return (
		<FormCanvasProvider>
			<TwoPanelsProvider
				rightPanelSizeFromCookie={rightPanelSize}
				id="campaign-form-canvas"
				isRightPanelClosable={false}
			>
				<FlowLayout>
					<Canvas
						formId={formData._id}
						form={formData}
						campaignId={campaign._id}
					/>
				</FlowLayout>
				<PanelLayout>
					<Panel campaignId={campaign._id} formId={formData._id} />
				</PanelLayout>
			</TwoPanelsProvider>
		</FormCanvasProvider>
	);
}

export function FormCampaign({ id, rightPanelSize }: FormCampaignProps) {
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

	if (campaign && campaign.type !== "lead-generation") {
		return (
			<div className="flex flex-1 justify-center items-center">
				<InfoBox variant="info" iconPlacement="top" className="max-w-md">
					<h3 className="text-lg font-medium text-primary">
						Form is not available
					</h3>
					<p className="text-sm text-muted-foreground">
						This campaign doesn't collect data so form is not available. In
						order to collect data, you need to create a lead generation
						campaign.
					</p>
				</InfoBox>
			</div>
		);
	}

	// No longer need FormStoreProvider - using canvas-only approach
	return (
		<FormCampaignInner campaign={campaign} rightPanelSize={rightPanelSize} />
	);
}
