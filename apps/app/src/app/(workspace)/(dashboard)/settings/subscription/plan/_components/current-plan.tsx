"use client";

import { CancelSubscriptionModal } from "@/components/modals/subscription/cancel-subscription/modal";
import { ChangePlanModal } from "@/components/modals/subscription/change-plan/modal";
import { FinishTrialModal } from "@/components/modals/subscription/finish-trial/modal";
import { ResubscribeModal } from "@/components/modals/subscription/resubscribe/modal";
import { useSubscription } from "@/hooks/auth/use-subscription";
import { useUser } from "@/hooks/auth/use-user";
import { useWorkspace } from "@/hooks/auth/use-workspace";
import { useChangePlan } from "@/hooks/ui/use-change-plan";
import { api, useAction } from "@firebuzz/convex";
import { Icon } from "@firebuzz/ui/components/brand/icon";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Progress } from "@firebuzz/ui/components/ui/progress";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { ArrowDownRight, ArrowRight } from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { useMemo, useState } from "react";

export const CurrentPlan = () => {
  const { currentWorkspace } = useWorkspace();
  const { user: currentUser } = useUser();
  const [, setChangePlanState] = useChangePlan();
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isFinishTrialDialogOpen, setIsFinishTrialDialogOpen] = useState(false);
  const [isResubscribeDialogOpen, setIsResubscribeDialogOpen] = useState(false);

  const reactivateSubscription = useAction(
    api.lib.stripe.reactivateSubscription
  );

  const {
    subscription,
    isLoading,
    isActive,
    isTrial,
    isCancellingAtPeriodEnd,
    currentPeriodStart,
    currentPeriodEnd,
    seatLimit,
    projectLimit,
  } = useSubscription();

  // Check if current user is workspace owner
  const isWorkspaceOwner = useMemo(() => {
    if (!currentUser || !currentWorkspace) return false;
    return currentWorkspace.ownerId === currentUser._id;
  }, [currentUser, currentWorkspace]);

  const isAdmin = useMemo(() => {
    return currentUser?.currentRole === "org:admin";
  }, [currentUser]);

  // Get current plan product
  const currentPlanItem = useMemo(() => {
    return subscription?.items.find(
      (item) =>
        item.metadata?.type === "subscription" &&
        item.metadata?.isShadow !== "true"
    );
  }, [subscription]);

  const interval = useMemo(() => {
    return subscription?.interval;
  }, [subscription]);

  // Check if subscription is completely ended (canceled status)
  const isSubscriptionEnded = useMemo(() => {
    return subscription?.status === "canceled";
  }, [subscription]);

  const currentPlanProduct = currentPlanItem?.product;
  const currentPlanPrice = currentPlanItem?.price;

  // Calculate billing cycle dates and progress
  const billingCycleInfo = useMemo(() => {
    if (!currentPeriodStart || !currentPeriodEnd) return null;

    const start = new Date(currentPeriodStart);
    const end = new Date(currentPeriodEnd);
    const now = new Date();

    const totalDays = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Check if billing period has started
    const hasStarted = now.getTime() >= start.getTime();

    let remainingDays: number;
    let progress: number;

    if (hasStarted) {
      // Period has started - show remaining days until end
      remainingDays = Math.ceil(
        (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const elapsedDays = totalDays - remainingDays;
      progress = Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100));
    } else {
      // Period hasn't started yet - show days until start
      remainingDays = Math.ceil(
        (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      progress = 0; // No progress since period hasn't started
    }

    return {
      startDate: start.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      }),
      endDate: end.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      }),
      remainingDays,
      progress,
      hasStarted,
    };
  }, [currentPeriodStart, currentPeriodEnd]);

  // Format price
  const formattedPrice = useMemo(() => {
    if (!currentPlanPrice?.unitAmount) return "Free";
    const amount = currentPlanPrice.unitAmount / 100;
    return `$${amount.toFixed(2)}`;
  }, [currentPlanPrice]);

  // Get plan name
  const planName = useMemo(() => {
    if (!currentPlanProduct?.name) return "Free";
    return currentPlanProduct.name;
  }, [currentPlanProduct]);

  const handleChangePlan = () => {
    if (isAdmin || isWorkspaceOwner) {
      setChangePlanState({ changePlan: true });
    } else {
      toast.error("You are not authorized to change plan");
    }
  };

  const handleCancelSubscription = () => {
    if (isAdmin || isWorkspaceOwner) {
      setIsCancelDialogOpen(true);
    } else {
      toast.error("You are not authorized to cancel subscription");
    }
  };

  const handleCloseCancelDialog = () => {
    setIsCancelDialogOpen(false);
  };

  const handleFinishTrial = () => {
    if (isWorkspaceOwner) {
      setIsFinishTrialDialogOpen(true);
    } else {
      toast.error("You are not authorized to finish trial");
    }
  };

  const handleCloseFinishTrialDialog = () => {
    setIsFinishTrialDialogOpen(false);
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
      setIsResubscribeDialogOpen(true);
    } else {
      toast.error("You are not authorized to resubscribe");
    }
  };

  const handleCloseResubscribeDialog = () => {
    setIsResubscribeDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <>
      <ChangePlanModal />
      <CancelSubscriptionModal
        isOpen={isCancelDialogOpen}
        onClose={handleCloseCancelDialog}
        planName={planName}
      />
      <FinishTrialModal
        isOpen={isFinishTrialDialogOpen}
        onClose={handleCloseFinishTrialDialog}
        planName={planName}
      />
      <ResubscribeModal
        isOpen={isResubscribeDialogOpen}
        onClose={handleCloseResubscribeDialog}
        planName={planName}
      />
      <div className="p-6 space-y-6 w-full border-b">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold">Plan</h2>
          <p className="text-sm text-muted-foreground">
            Check your current plan and manage it.
          </p>
        </div>

        {/* Plan Card */}
        <div className="max-w-2xl">
          <div className="p-6 space-y-6 rounded-lg border bg-muted">
            {/* Plan Header */}
            <div className="space-y-3">
              <div className="flex gap-2 items-center">
                <Badge variant="brand">{planName}</Badge>
                {isTrial && <Badge variant="outline">Trial</Badge>}
                {!isActive && !isTrial && (
                  <Badge variant="destructive">Inactive</Badge>
                )}
                {isCancellingAtPeriodEnd && (
                  <Badge variant="destructive">Cancelling</Badge>
                )}
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold">
                  {formattedPrice}
                  <span className="text-lg font-normal text-muted-foreground">
                    /per {interval}
                  </span>
                </div>
                {isCancellingAtPeriodEnd && (
                  <p className="text-sm text-muted-foreground">
                    Your subscription will be cancelled at the end of the
                    current billing period.
                  </p>
                )}
              </div>
              {/* Plan Limits */}
              <div className="flex flex-wrap gap-4">
                <div className="text-sm">
                  <span className="text-muted-foreground">Seats:</span>{" "}
                  <Badge variant="outline">{seatLimit}</Badge>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Projects:</span>{" "}
                  <Badge variant="outline">{projectLimit}</Badge>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Credits:</span>{" "}
                  <Badge variant="outline">
                    {currentPlanProduct?.metadata?.type === "subscription"
                      ? currentPlanProduct?.metadata?.credits || 0
                      : 0}
                  </Badge>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Traffic:</span>{" "}
                  <Badge variant="outline">
                    {Number(
                      currentPlanProduct?.metadata?.type === "subscription"
                        ? currentPlanProduct?.metadata?.traffic || 0
                        : 0
                    ).toLocaleString()}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Billing Cycle */}
            {billingCycleInfo && (isActive || isTrial) && (
              <div className="space-y-3">
                <div className="flex justify-between items-end text-sm">
                  <div className="space-y-1">
                    <div className="font-medium">Billing Cycle</div>
                    <div className="flex gap-1 items-center">
                      <ArrowDownRight className="size-3.5" />
                      <div>{billingCycleInfo.startDate}</div>
                    </div>
                  </div>
                  <span className="text-muted-foreground">
                    {billingCycleInfo.endDate}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <Progress value={billingCycleInfo.progress} className="h-2" />
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">
                      {billingCycleInfo.hasStarted
                        ? `${billingCycleInfo.remainingDays} days left`
                        : `Starts in ${billingCycleInfo.remainingDays} days`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 justify-between items-center">
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex gap-2 items-center"
                  onClick={handleChangePlan}
                  disabled={!isActive || isTrial || isCancellingAtPeriodEnd}
                >
                  Change Plan
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
              <div className="flex gap-2">
                {/* Resubscribe button - only show for ended subscriptions */}
                {isSubscriptionEnded && (
                  <Button
                    variant="default"
                    size="sm"
                    className="flex gap-2 items-center h-8"
                    onClick={handleResubscribe}
                    disabled={!isWorkspaceOwner}
                  >
                    <div className="size-4">
                      <Icon />
                    </div>
                    Resubscribe
                  </Button>
                )}

                {/* Active subscription buttons */}
                {!isSubscriptionEnded && (
                  <>
                    {/* Upgrade Now button - only show for trial users */}
                    {isTrial && !isCancellingAtPeriodEnd && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex gap-2 items-center h-8"
                        onClick={handleFinishTrial}
                        disabled={!isWorkspaceOwner}
                      >
                        <div className="size-4">
                          <Icon />
                        </div>
                        Upgrade Now
                      </Button>
                    )}

                    {/* Reactivate button - only show for cancelling subscriptions */}
                    {isCancellingAtPeriodEnd && (
                      <Button
                        variant="default"
                        size="sm"
                        className="flex gap-2 items-center h-8"
                        onClick={handleReactivateSubscription}
                        disabled={!isWorkspaceOwner}
                      >
                        <div className="size-4">
                          <Icon />
                        </div>
                        Resume Subscription
                      </Button>
                    )}

                    {/* Cancel/Status buttons */}
                    {!isCancellingAtPeriodEnd ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex gap-2 items-center h-8"
                        onClick={handleCancelSubscription}
                        disabled={
                          !isWorkspaceOwner ||
                          (!isActive && !isTrial) ||
                          isCancellingAtPeriodEnd
                        }
                      >
                        {isTrial ? "Cancel Trial" : "Cancel Subscription"}
                      </Button>
                    ) : (
                      <Badge variant="destructive">
                        Cancelling at{" "}
                        {currentPeriodEnd
                          ? new Date(currentPeriodEnd).toLocaleDateString()
                          : "Unknown"}
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
