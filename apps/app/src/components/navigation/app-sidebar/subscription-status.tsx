"use client";

import { useSubscription } from "@/hooks/auth/use-subscription";
import { badgeVariants } from "@firebuzz/ui/components/ui/badge";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Crown, Info } from "@firebuzz/ui/icons/lucide";
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
				<div className="w-full h-4 rounded animate-pulse bg-sidebar-foreground/10" />
				<div className="w-20 h-3 rounded animate-pulse bg-sidebar-foreground/10" />
			</div>
		);
	}

	// Get the product name from subscription data
	// Uses the first subscription item's product name, with fallbacks
	const getProductName = () => {
		if (!subscription?.items?.length) return "Free Plan";

		const firstItem = subscription.items[0];
		const productName = firstItem?.product?.name;

		return productName;
	};

	const planName = getProductName();

	const progress = (currentPeriodUsage / currentPeriodAdditions) * 100;

	const trialDaysLeft =
		new Date(periodCreditSummary?.periodEnd ?? new Date()).getDate() -
		new Date().getDate();

	return (
		<div className="py-3 rounded-lg border bg-background-subtle">
			{/* Top */}
			<div className="flex justify-between items-center px-3 text-xs">
				<span className="text-sidebar-foreground/70">Plan</span>
				<Link
					href="/settings/subscription"
					className={badgeVariants({
						variant: "outline",
						className: "flex gap-1 items-center",
					})}
				>
					{(isActive || isTrial) && (
						<Crown className="w-3 h-3 text-amber-500" />
					)}
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
									periodCreditSummary?.periodEnd ?? new Date(),
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
							progress >= 100 ? "bg-red-500" : "bg-primary",
						)}
						style={{
							width: `${progress}%`,
						}}
					/>
				</div>
			</div>
		</div>
	);
};
