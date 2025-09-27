"use client";

import { FinishTrialModal } from "@/components/modals/subscription/finish-trial/modal";
import { ResubscribeModal } from "@/components/modals/subscription/resubscribe/modal";
import { useSubscription } from "@/hooks/auth/use-subscription";
import { useUser } from "@/hooks/auth/use-user";
import { useWorkspace } from "@/hooks/auth/use-workspace";
import { api, useAction } from "@firebuzz/convex";
import { Icon } from "@firebuzz/ui/components/brand/icon";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Info } from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { formatToCalendarDateTime } from "@firebuzz/utils";
import Link from "next/link";
import { useMemo, useState } from "react";

export const SubscriptionStatus = () => {
  const { currentWorkspace } = useWorkspace();
  const { user: currentUser } = useUser();
  const {
    subscription,
    currentPeriodUsage,
    currentPeriodAdditions,
    periodCreditSummary,
    isTrial,
    isCancellingAtPeriodEnd,
    isLoading,
  } = useSubscription();

  const [isFinishTrialModalOpen, setIsFinishTrialModalOpen] = useState(false);
  const [isResubscribeModalOpen, setIsResubscribeModalOpen] = useState(false);

  const reactivateSubscription = useAction(
    api.lib.stripe.reactivateSubscription
  );

  // Check if current user is workspace owner
  const isWorkspaceOwner = useMemo(() => {
    if (!currentUser || !currentWorkspace) return false;
    return currentWorkspace.ownerId === currentUser._id;
  }, [currentUser, currentWorkspace]);

  // Check if subscription is completely ended (canceled status)
  const isSubscriptionEnded = useMemo(() => {
    return subscription?.status === "canceled";
  }, [subscription]);

  const handleFinishTrial = () => {
    if (isWorkspaceOwner) {
      setIsFinishTrialModalOpen(true);
    } else {
      toast.error("You are not authorized to finish trial");
    }
  };

  const handleReactivateSubscription = async () => {
    if (!isWorkspaceOwner) {
      toast.error("You are not authorized to reactivate subscription");
      return;
    }

    try {
      await reactivateSubscription();
      toast.success("Subscription reactivated successfully!", {
        description:
          "Your subscription will continue at the end of the current period.",
      });
    } catch (error) {
      console.error("Failed to reactivate subscription:", error);
      toast.error("Failed to reactivate subscription. Please try again.");
    }
  };

  const handleResubscribe = () => {
    if (isWorkspaceOwner) {
      setIsResubscribeModalOpen(true);
    } else {
      toast.error("You are not authorized to resubscribe");
    }
  };

  const handleCloseFinishTrialModal = () => {
    setIsFinishTrialModalOpen(false);
  };

  const handleCloseResubscribeModal = () => {
    setIsResubscribeModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="p-2 space-y-2">
        <div className="w-full h-4 rounded animate-pulse bg-sidebar-foreground/10" />
        <div className="w-20 h-3 rounded animate-pulse bg-sidebar-foreground/10" />
      </div>
    );
  }

  // Get the product name from subscription data
  // Uses the first subscription item's product name, with fallbacks
  const getProductName = (): string => {
    if (!subscription?.items?.length) return "Free Plan";

    const firstItem = subscription.items[0];
    const productName = firstItem?.product?.name;

    return productName || "Free Plan";
  };

  const planName = getProductName();

  const progress = (currentPeriodUsage / currentPeriodAdditions) * 100;

  const trialDaysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(periodCreditSummary?.periodEnd ?? new Date()).getTime() -
        new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  return (
    <>
      <FinishTrialModal
        isOpen={isFinishTrialModalOpen}
        onClose={handleCloseFinishTrialModal}
        planName={planName}
      />
      <ResubscribeModal
        isOpen={isResubscribeModalOpen}
        onClose={handleCloseResubscribeModal}
        planName={planName}
      />
      <div className="py-3 rounded-lg border bg-background-subtle">
        {/* Top */}
        <div className="flex justify-between items-center px-3 text-xs">
          <span className="text-sidebar-foreground/70">Plan</span>
          <Link
            href="/settings/subscription"
            className="flex gap-1 items-center"
          >
            <span className="font-medium text-sidebar-foreground">
              {planName}
            </span>
            {isTrial && (
              <span className="text-xs text-sidebar-foreground/70">
                (Trial {trialDaysLeft} days left)
              </span>
            )}
          </Link>
        </div>
        <Separator className="my-3" />
        {/* Bottom */}
        <div className="px-3 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <div className="flex gap-1 items-center">
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
          <div className="w-full h-2 rounded-[1rem] bg-primary/5">
            <div
              className={cn(
                "h-full",
                progress === 100
                  ? "rounded-[1rem]"
                  : "rounded-l-[1rem] rounded-r-none",
                progress >= 100 ? "bg-red-500" : "bg-primary"
              )}
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-3">
          {/* Resubscribe button - only show for ended subscriptions */}
          {isSubscriptionEnded && (
            <>
              <Separator className="my-3" />
              <Button
                variant="outline"
                size="sm"
                className="flex gap-2 items-center w-full h-8"
                onClick={handleResubscribe}
                disabled={!isWorkspaceOwner}
              >
                <div className="size-3">
                  <Icon />
                </div>
                Subscribe
              </Button>
            </>
          )}

          {/* Finish Trial button - only show for trial users */}
          {!isSubscriptionEnded && isTrial && !isCancellingAtPeriodEnd && (
            <>
              <Separator className="my-3" />
              <Button
                variant="outline"
                size="sm"
                className="flex gap-2 items-center w-full h-8"
                onClick={handleFinishTrial}
                disabled={!isWorkspaceOwner}
              >
                <div className="size-3">
                  <Icon />
                </div>
                Upgrade
              </Button>
            </>
          )}

          {/* Reactivate button - only show for cancelling subscriptions */}
          {!isSubscriptionEnded && isCancellingAtPeriodEnd && (
            <>
              <Separator className="my-3" />
              <Button
                variant="outline"
                size="sm"
                className="flex gap-2 items-center w-full h-8"
                onClick={handleReactivateSubscription}
                disabled={!isWorkspaceOwner}
              >
                <div className="size-3">
                  <Icon />
                </div>
                Resume Subscription
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
};
