"use client";

import { type Id, api, useRichQuery } from "@firebuzz/convex";
import { buttonVariants } from "@firebuzz/ui/components/ui/button";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import { ChevronRight, SendToBack } from "@firebuzz/ui/icons/lucide";
import Link from "next/link";
import { useParams } from "next/navigation";
export const CampaignTopbar = () => {
  const { id } = useParams<{ id: string | undefined }>();
  const { data: campaign, isPending: isLoading } = useRichQuery(
    api.collections.campaigns.queries.getById,
    id ? { id: id as Id<"campaigns"> } : "skip"
  );

  return (
    <div className="border-b px-2 py-3">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1">
        <Link
          className={buttonVariants({
            variant: "ghost",
            className: "h-8 !px-1.5 text-muted-foreground",
          })}
          href="/campaigns"
        >
          <SendToBack className="!size-3.5" />
          <p>Campaigns</p>
        </Link>

        {isLoading && id ? (
          <Skeleton className="h-8 w-24" />
        ) : campaign ? (
          <>
            <ChevronRight className="!size-3.5" />
            <Link
              className={buttonVariants({
                variant: "ghost",
                className: "h-8 !px-1.5",
              })}
              href={`/campaigns/${id}`}
            >
              <p>{campaign.title}</p>
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
};
