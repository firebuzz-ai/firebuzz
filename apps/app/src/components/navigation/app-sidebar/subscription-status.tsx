"use client";

import { useSubscription } from "@/hooks/auth/use-subscription";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { SidebarMenuButton } from "@firebuzz/ui/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Crown, Info, TrendingUp } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { formatToCalendarDateTime } from "@firebuzz/utils";
import Link from "next/link";

export const SubscriptionStatus = () => {
  const {
    subscription,
    currentPeriodUsage,
    currentPeriodAdditions,
    periodCreditSummary,
    isActive,
    isTrial,
    isLoading,
  } = useSubscription();

  if (isLoading) {
    return (
      <div className="p-2 space-y-2">
        <div className="w-full h-4 rounded bg-sidebar-foreground/10 animate-pulse" />
        <div className="w-20 h-3 rounded bg-sidebar-foreground/10 animate-pulse" />
      </div>
    );
  }

  // Get the product name from subscription data
  // Uses the first subscription item's product name, with fallbacks
  const getProductName = () => {
    if (!subscription?.items?.length) return "Free Plan";

    const firstItem = subscription.items[0];
    const productName = firstItem?.product?.name;

    if (productName) {
      return isTrial ? `${productName} (Trial)` : productName;
    }

    // Fallback to status-based names if product name is not available
    return isTrial ? "Pro Trial" : isActive ? "Pro Plan" : "Free Plan";
  };

  const planName = getProductName();

  const progress = (currentPeriodUsage / currentPeriodAdditions) * 100;

  return (
    <div className="px-2 py-4 space-y-4 border rounded-lg bg-background-subtle">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <span className="text-sidebar-foreground/70">Credits</span>
            <Tooltip>
              <TooltipTrigger>
                <Info className="size-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="top" align="start" sideOffset={10}>
                Resets on{" "}
                {formatToCalendarDateTime(
                  periodCreditSummary?.periodEnd ?? new Date()
                )}
              </TooltipContent>
            </Tooltip>
          </div>
          <span className="font-mono font-medium text-sidebar-foreground">
            {currentPeriodUsage}/{currentPeriodAdditions}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full bg-primary/5">
          <div
            className={cn(
              "h-full",
              progress === 100 ? "rounded-lg" : "rounded-l-lg rounded-r-none",
              progress >= 100 ? "bg-red-500" : "bg-primary"
            )}
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-sidebar-foreground/70">Plan</span>
        <Badge variant="outline" className="flex items-center gap-1">
          {(isActive || isTrial) && (
            <Crown className="w-3 h-3 text-amber-500" />
          )}
          <span className="font-medium text-sidebar-foreground">
            {planName}
          </span>
        </Badge>
      </div>

      {(isTrial || !isActive) && (
        <SidebarMenuButton asChild size="sm" className="w-full h-8">
          <Link
            href="/settings/subscription"
            className="flex items-center justify-center gap-2"
          >
            <TrendingUp className="w-3 h-3" />
            <span className="text-xs font-medium">
              {isTrial ? "Upgrade Plan" : "Subscribe"}
            </span>
          </Link>
        </SidebarMenuButton>
      )}
    </div>
  );
};
