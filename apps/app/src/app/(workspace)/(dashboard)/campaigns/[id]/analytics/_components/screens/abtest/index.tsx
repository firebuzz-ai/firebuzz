"use client";

import { EmptyState } from "@/components/analytics/states";
import { useCampaignAnalytics } from "@/hooks/state/use-campaign-analytics";
import type { Id } from "@firebuzz/convex";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";

interface CampaignAnalyticsAbtestProps {
  campaignId: Id<"campaigns">;
}

export const CampaignAnalyticsAbtest = ({
  campaignId,
}: CampaignAnalyticsAbtestProps) => {
  const { data, isLoading } = useCampaignAnalytics({ campaignId });

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-[180px]" />
          <div className="flex gap-4 items-center">
            <Skeleton className="w-20 h-6" />
            <Skeleton className="w-20 h-9" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 p-4 rounded-xl border sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={`abtest-skeleton-${
                // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                i
              }`}
              className="p-4 space-y-3 rounded-lg border"
            >
              <div className="flex justify-between items-center">
                <div className="flex gap-2 items-center">
                  <Skeleton className="w-4 h-4 rounded" />
                  <Skeleton className="w-20 h-4" />
                </div>
                <Skeleton className="w-4 h-4 rounded" />
              </div>
              <Skeleton className="w-16 h-8" />
              <div className="flex justify-between items-center">
                <Skeleton className="w-12 h-4" />
                <Skeleton className="w-16 h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show no data state
  if (!data.abTestResults && !data.abTests?.length) {
    return <EmptyState />;
  }

  return (
    <div className="flex overflow-hidden relative flex-col max-h-full">
      {/* Gradient background - Top */}
      <div className="absolute top-0 right-0 left-0 z-10 h-5 bg-gradient-to-b to-transparent from-background" />
      <div className="overflow-y-auto relative pt-5 pb-6 space-y-6 max-h-full">
        {/* Placeholder for A/B Test Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Variant Performance Comparison */}
          <div className="p-6 rounded-lg border">
            <h3 className="mb-4 text-lg font-semibold">Variant Performance</h3>
            <div className="text-sm text-muted-foreground">
              A/B test variant comparison chart will be implemented here
            </div>
          </div>

          {/* Conversion Funnel by Variant */}
          <div className="p-6 rounded-lg border">
            <h3 className="mb-4 text-lg font-semibold">Conversion Funnel</h3>
            <div className="text-sm text-muted-foreground">
              Conversion funnel breakdown by variant will be implemented here
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Statistical Analysis */}
          <div className="p-6 rounded-lg border">
            <h3 className="mb-4 text-lg font-semibold">Statistical Analysis</h3>
            <div className="text-sm text-muted-foreground">
              Confidence intervals and significance testing will be implemented
              here
            </div>
          </div>

          {/* Test Timeline */}
          <div className="p-6 rounded-lg border">
            <h3 className="mb-4 text-lg font-semibold">Test Timeline</h3>
            <div className="text-sm text-muted-foreground">
              A/B test performance over time will be implemented here
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Segment Analysis */}
          <div className="p-6 rounded-lg border">
            <h3 className="mb-4 text-lg font-semibold">Segment Performance</h3>
            <div className="text-sm text-muted-foreground">
              Variant performance by audience segments will be implemented here
            </div>
          </div>

          {/* Revenue Impact */}
          <div className="p-6 rounded-lg border">
            <h3 className="mb-4 text-lg font-semibold">Revenue Impact</h3>
            <div className="text-sm text-muted-foreground">
              Revenue and value analysis by variant will be implemented here
            </div>
          </div>
        </div>
      </div>
      {/* Gradient background - Bottom */}
      <div className="absolute right-0 bottom-0 left-0 z-10 h-6 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
};
