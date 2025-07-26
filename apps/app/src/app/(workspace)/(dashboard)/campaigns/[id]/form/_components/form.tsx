"use client";
import { CanvasProvider } from "@/components/canvas/provider";
import { FlowLayout } from "@/components/layouts/two-panels/panels/campaign/flow";
import { PanelLayout } from "@/components/layouts/two-panels/panels/campaign/panel";
import { TwoPanelsProvider } from "@/components/layouts/two-panels/provider";
import { type Id, api, useRichQuery } from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { notFound } from "next/navigation";
import { Panel } from "./panel/panel";
import { Preview } from "./preview/preview";

interface FormCampaignProps {
  id: string;
  rightPanelSize: number;
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
      : "skip"
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

  // TODO: Re-design this for a better UX
  if (campaign.type !== "lead-generation") {
    return <div>Not a lead generation campaign</div>;
  }

  return (
    <TwoPanelsProvider
      rightPanelSizeFromCookie={rightPanelSize}
      id="campaign-form"
      isRightPanelClosable={false}
    >
      <CanvasProvider>
        <FlowLayout>
          <Preview campaignId={campaign._id} />
        </FlowLayout>
        <PanelLayout>
          <Panel campaignId={campaign._id} />
        </PanelLayout>
      </CanvasProvider>
    </TwoPanelsProvider>
  );
}
