"use client";

import { useWorkspace } from "@/hooks/auth/use-workspace";
import { type Doc, api, useCachedRichQuery } from "@firebuzz/convex";
import { createContext, useMemo } from "react";

interface SubscriptionData {
  subscription:
    | (Doc<"subscriptions"> & {
        items: Array<
          Doc<"subscriptionItems"> & {
            price: Doc<"prices"> | null;
            product: Doc<"products"> | null;
          }
        >;
      })
    | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  creditBalance: number;
  currentPeriodUsage: number;
  currentPeriodAdditions: number;
  periodCreditSummary: {
    periodStart: string;
    periodEnd: string;
    usage: number;
    additions: number;
  } | null;
  isActive: boolean;
  isTrial: boolean;
  isLoading: boolean;
}

const subscriptionContext = createContext<SubscriptionData>({
  subscription: null,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  creditBalance: 0,
  currentPeriodUsage: 0,
  currentPeriodAdditions: 0,
  periodCreditSummary: null,
  isActive: false,
  isTrial: false,
  isLoading: true,
});

const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const { currentWorkspace, isLoading: isWorkspaceLoading } = useWorkspace();

  // Get active subscription for current workspace
  const { data: activeSubscription, isPending: isSubscriptionsPending } =
    useCachedRichQuery(
      api.collections.stripe.subscriptions.queries.getCurrentByWorkspaceId,
      !currentWorkspace || !currentWorkspace.customerId ? "skip" : undefined
    );

  // Get current credit balance
  const { data: creditBalance, isPending: isCreditBalancePending } =
    useCachedRichQuery(
      api.collections.stripe.transactions.queries.getCurrentBalance,
      !currentWorkspace || !currentWorkspace.customerId
        ? "skip"
        : { workspaceId: currentWorkspace._id }
    );

  // Determine current period dates from subscription (shadow or regular) - Used for credit summary
  const currentPeriod = useMemo(() => {
    if (!activeSubscription) return null;

    const subscription = activeSubscription;
    return {
      start: subscription.shadowSubscription
        ? subscription.shadowSubscription.currentPeriodStart
        : subscription.currentPeriodStart,
      end: subscription.shadowSubscription
        ? subscription.shadowSubscription.currentPeriodEnd
        : subscription.currentPeriodEnd,
    };
  }, [activeSubscription]);

  // Get current period usage and additions
  const { data: periodCreditSummary, isPending: isPeriodSummaryPending } =
    useCachedRichQuery(
      api.collections.stripe.transactions.queries.getCurrentPeriodSummary,
      !currentWorkspace || !currentWorkspace.customerId || !currentPeriod
        ? "skip"
        : {
            workspaceId: currentWorkspace._id,
            periodStart: currentPeriod.start,
            periodEnd: currentPeriod.end,
          }
    );

  // Loading state
  const isLoading =
    isWorkspaceLoading ||
    (Boolean(currentWorkspace?.customerId) &&
      activeSubscription !== null &&
      (isSubscriptionsPending ||
        isCreditBalancePending ||
        isPeriodSummaryPending));

  // Subscription status
  const isActive = useMemo(() => {
    return !!(activeSubscription && activeSubscription.status === "active");
  }, [activeSubscription]);

  const isTrial = useMemo(() => {
    return !!(activeSubscription && activeSubscription.status === "trialing");
  }, [activeSubscription]);

  const exposed: SubscriptionData = {
    subscription: activeSubscription || null,
    currentPeriodStart: activeSubscription?.currentPeriodStart || null,
    currentPeriodEnd: activeSubscription?.currentPeriodEnd || null,
    // Credit Related
    creditBalance: creditBalance || 0,
    currentPeriodUsage: periodCreditSummary?.usage || 0,
    currentPeriodAdditions: periodCreditSummary?.additions || 0,
    periodCreditSummary: periodCreditSummary || null,
    // Flags
    isActive,
    isTrial,
    isLoading,
  };

  return (
    <subscriptionContext.Provider value={exposed}>
      {children}
    </subscriptionContext.Provider>
  );
};

export { SubscriptionProvider, subscriptionContext };
