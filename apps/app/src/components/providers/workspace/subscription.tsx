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
	isCancellingAtPeriodEnd: boolean;
	seatLimit: number;
	baseSeatsCount: number;
	extraSeatsCount: number;
	baseProjectsCount: number;
	extraProjectsCount: number;
	projectLimit: number;
	interval: "month" | "year";
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
	isCancellingAtPeriodEnd: false,
	seatLimit: 1,
	baseSeatsCount: 1,
	extraSeatsCount: 0,
	baseProjectsCount: 1,
	extraProjectsCount: 0,
	projectLimit: 1,
	interval: "month",
});

const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
	const { currentWorkspace, isLoading: isWorkspaceLoading } = useWorkspace();

	// Get active subscription for current workspace
	const { data: activeSubscription, isPending: isSubscriptionsPending } =
		useCachedRichQuery(
			api.collections.stripe.subscriptions.queries.getCurrentByWorkspaceId,
			!currentWorkspace || !currentWorkspace.customerId ? "skip" : undefined,
		);

	// Get current credit balance
	const { data: creditBalance, isPending: isCreditBalancePending } =
		useCachedRichQuery(
			api.collections.stripe.transactions.queries.getCurrentBalance,
			!currentWorkspace || !currentWorkspace.customerId
				? "skip"
				: { workspaceId: currentWorkspace._id },
		);

	// Current Subcription Item (Plan Item)
	const currentSubscriptionPlanItem = useMemo(() => {
		return activeSubscription?.items.find(
			(item) =>
				item.metadata?.type === "subscription" &&
				item.metadata?.isShadow !== "true",
		);
	}, [activeSubscription]);

	// Current Subscription Product (Plan)
	const currentSubscriptionPlanProduct = useMemo(() => {
		return currentSubscriptionPlanItem?.product;
	}, [currentSubscriptionPlanItem]);

	const currentSubscriptionAddOns = useMemo(() => {
		return activeSubscription?.items.filter(
			(item) => item.metadata?.type === "add-on",
		);
	}, [activeSubscription]);

	// Base Seats Count from product metadata
	const baseSeatsCount = useMemo(() => {
		const seats =
			currentSubscriptionPlanProduct?.metadata?.type === "subscription"
				? currentSubscriptionPlanProduct?.metadata?.seats || 1
				: 1;
		return Number(seats);
	}, [currentSubscriptionPlanProduct]);

	// Base Projects Count from product metadata
	const baseProjectsCount = useMemo(() => {
		const projects =
			currentSubscriptionPlanProduct?.metadata?.type === "subscription"
				? currentSubscriptionPlanProduct?.metadata?.projects || 1
				: 1;
		return Number(projects);
	}, [currentSubscriptionPlanProduct]);

	// Extra projects count
	const extraProjectsCount = useMemo(() => {
		const extraProjectSubscriptionItem = currentSubscriptionAddOns?.filter(
			(item) =>
				item.metadata?.type === "add-on" &&
				item.metadata?.addonType === "extra-project",
		);

		return (
			extraProjectSubscriptionItem?.reduce(
				(acc, item) => acc + item.quantity,
				0,
			) || 0
		);
	}, [currentSubscriptionAddOns]);

	// Project Limit from product metadata
	const projectLimit = useMemo(() => {
		return baseProjectsCount + extraProjectsCount;
	}, [extraProjectsCount, baseProjectsCount]);

	// Extra seats count
	const extraSeatsCount = useMemo(() => {
		const extraSeatSubscriptionItem = currentSubscriptionAddOns?.filter(
			(item) =>
				item.metadata?.type === "add-on" &&
				item.metadata?.addonType === "extra-seat",
		);

		return (
			extraSeatSubscriptionItem?.reduce(
				(acc, item) => acc + item.quantity,
				0,
			) || 0
		);
	}, [currentSubscriptionAddOns]);

	// Seat Limit from product metadata + extra seats
	const seatLimit = useMemo(() => {
		return baseSeatsCount + extraSeatsCount;
	}, [extraSeatsCount, baseSeatsCount]);

	// Main subscription interval
	const interval = useMemo(() => {
		const mainPlanPrice = currentSubscriptionPlanItem?.price;
		if (!mainPlanPrice || !mainPlanPrice.interval) return "month" as const;
		return mainPlanPrice.interval as "month" | "year";
	}, [currentSubscriptionPlanItem]);

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
						periodEnd: currentPeriod.end,
						periodStart: currentPeriod.start,
					},
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
		isCancellingAtPeriodEnd: activeSubscription?.cancelAtPeriodEnd ?? false,
		isLoading,
		// Limits
		seatLimit,
		baseSeatsCount,
		extraSeatsCount,
		baseProjectsCount,
		extraProjectsCount,
		projectLimit,
		interval,
	};

	return (
		<subscriptionContext.Provider value={exposed}>
			{children}
		</subscriptionContext.Provider>
	);
};

export { SubscriptionProvider, subscriptionContext };
