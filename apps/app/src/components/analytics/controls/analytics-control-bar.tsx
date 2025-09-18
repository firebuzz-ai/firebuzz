"use client";

import {
  ANALYTICS_PERIODS,
  useCampaignAnalytics,
} from "@/hooks/state/use-campaign-analytics";
import type { Id } from "@firebuzz/convex";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Label } from "@firebuzz/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@firebuzz/ui/components/ui/select";
import { Switch } from "@firebuzz/ui/components/ui/switch";
import {
  Calendar,
  FlaskConical,
  Radio,
  RotateCw,
  Split,
} from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";

interface AnalyticsControlBarProps {
  campaignId: Id<"campaigns">;
  className?: string;
}

export const AnalyticsControlBar = ({
  campaignId,
  className,
}: AnalyticsControlBarProps) => {
  const {
    period,
    setPeriod,
    isPreview,
    setIsPreview,
    revalidate,
    currentScreen,
    isRevalidating,
    campaign,
  } = useCampaignAnalytics({ campaignId });

  return (
    <div className={cn("flex justify-between items-center pb-1", className)}>
      {/* Period Selector or Fixed Labels */}
      {currentScreen === "realtime" ? (
        <div className="flex gap-2 items-center px-3 w-[180px] h-8 rounded-md border bg-muted">
          <div className="bg-emerald-500 rounded-[2px] animate-pulse size-2.5" />
          <span className="text-sm font-medium">Realtime</span>
        </div>
      ) : currentScreen === "ab-tests" ? (
        <div className="flex gap-2 items-center px-3 w-[180px] h-8 rounded-md border bg-muted">
          <Split className="size-3.5" />
          <span className="text-sm font-medium">All Time</span>
        </div>
      ) : (
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px] h-8 rounded-md ">
            <div className="flex gap-2 items-center">
              <Calendar className="size-3.5" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-md">
            {Object.entries(ANALYTICS_PERIODS).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Right Side Controls */}
      <div className="flex gap-4 items-center">
        {/* Preview/Production Switch */}
        <div className="flex overflow-hidden gap-2 items-center pr-2 h-8 rounded-md border transition-transform duration-200 ease-in-out">
          <Label
            htmlFor="preview-switch"
            className="inline-flex items-center px-2 h-full text-sm border-r text-muted-foreground bg-muted"
          >
            {isPreview ? (
              <div className="flex gap-2 items-center">
                <FlaskConical className="size-3.5" />
                Preview
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <Radio className="size-3.5" />
                <span className="text-sm">Production</span>
              </div>
            )}
          </Label>
          <Switch
            disabled={!campaign?.isPublished && isPreview}
            id="preview-switch"
            checked={isPreview}
            onCheckedChange={setIsPreview}
          />
        </div>

        {/* Revalidate Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={revalidate}
          disabled={isRevalidating}
          className="gap-2 h-8 rounded-md"
        >
          <RotateCw
            className={cn("size-3.5", isRevalidating && "animate-spin")}
          />
          Refresh
        </Button>
      </div>
    </div>
  );
};
