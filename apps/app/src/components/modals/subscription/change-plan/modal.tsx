"use client";

import { useSubscription } from "@/hooks/auth/use-subscription";
import { useUser } from "@/hooks/auth/use-user";
import { useChangePlan } from "@/hooks/ui/use-change-plan";
import {
	ConvexError,
	api,
	useAction,
	useCachedRichQuery,
} from "@firebuzz/convex";
import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	CreditCard,
	FolderOpen,
	HeadphonesIcon,
	Star,
	Users,
	Zap,
} from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

export const ChangePlanModal = () => {
	const [state, setState] = useChangePlan();
	const { subscription, isTeamPlan } = useSubscription();
	const [isLoading, setIsLoading] = useState(false);

	const { user } = useUser();

	const isAdmin = useMemo(() => {
		return user?.currentRole === "org:admin";
	}, [user]);

	// Get available plans
	const { data: availablePlans, isPending: plansLoading } = useCachedRichQuery(
		api.collections.stripe.products.queries.getSubscriptionPlansWithPrices,
		{},
	);

	// Current plan item
	const currentPlanItem = useMemo(() => {
		return subscription?.items.find(
			(item) =>
				item.metadata?.type === "subscription" &&
				item.metadata?.isShadow !== "true",
		);
	}, [subscription]);

	// Target plan (opposite of current)
	const targetPlan = useMemo(() => {
		if (!availablePlans) return null;

		if (isTeamPlan) {
			// Current is Team, show Pro plan
			return availablePlans.find(
				(plan) =>
					plan.metadata?.isTeam !== "true" &&
					plan.metadata?.type === "subscription",
			);
		}
		// Current is Pro, show Team plan
		return availablePlans.find(
			(plan) =>
				plan.metadata?.isTeam === "true" &&
				plan.metadata?.type === "subscription",
		);
	}, [availablePlans, isTeamPlan]);

	// Target price (monthly)
	const targetPrice = useMemo(() => {
		if (!targetPlan) return null;
		return targetPlan.prices.find(
			(price) => price.interval === "month" && price.active,
		);
	}, [targetPlan]);

	// Current price
	const currentPrice = useMemo(() => {
		if (!currentPlanItem?.price?.unitAmount) return 0;
		return currentPlanItem.price.unitAmount / 100;
	}, [currentPlanItem]);

	// Target price amount
	const targetPriceAmount = useMemo(() => {
		if (!targetPrice?.unitAmount) return 0;
		return targetPrice.unitAmount / 100;
	}, [targetPrice]);

	// Current seats for Team plans
	const currentSeats = useMemo(() => {
		return currentPlanItem?.quantity || 1;
	}, [currentPlanItem]);

	// Price comparison
	const priceDifference = useMemo(() => {
		if (isTeamPlan) {
			// Team to Pro: compare total team cost vs pro cost
			const currentTotalPrice = currentPrice * currentSeats;
			return targetPriceAmount - currentTotalPrice;
		}
		// Pro to Team: compare pro cost vs team cost (1 seat)
		return targetPriceAmount - currentPrice;
	}, [isTeamPlan, currentPrice, currentSeats, targetPriceAmount]);

	const isUpgrade = priceDifference > 0;

	const changePlanAction = useAction(api.lib.stripe.changePlan);

	useHotkeys(
		"meta+s",
		async () => {
			await handleChangePlan();
		},
		{
			preventDefault: true,
			enabled: state.changePlan ?? false,
		},
	);

	const handleChangePlan = async () => {
		if (!isAdmin) {
			toast.error("You are not authorized to change plans.", {
				description: "Please contact your administrator to change plans.",
				id: "change-plan",
			});
			return;
		}

		if (!targetPlan || !targetPrice) {
			toast.error("Target plan not found.", {
				description: "Please try again.",
				id: "change-plan",
			});
			return;
		}

		try {
			setIsLoading(true);

			await changePlanAction({
				targetProductId: targetPlan._id,
				targetPriceId: targetPrice._id,
			});

			toast.success(
				`Successfully ${isUpgrade ? "upgraded" : "downgraded"} to ${targetPlan.name}!`,
				{
					description: "Your plan change is being processed.",
					id: "change-plan",
				},
			);

			setState(null);
		} catch (error) {
			console.error(error);
			if (error instanceof ConvexError) {
				toast.error("Failed to change plan.", {
					description: error.data,
					id: "change-plan",
				});
			} else {
				toast.error("Failed to change plan.", {
					description: "Please try again.",
					id: "change-plan",
				});
			}
		} finally {
			setIsLoading(false);
		}
	};

	const handleCancel = () => {
		setState(null);
	};

	const getPlanFeatures = (plan: { metadata?: Record<string, string> }) => {
		if (plan?.metadata?.isTeam === "true") {
			return [
				{
					icon: Zap,
					text: "500 credits per month per seat",
					id: "credits-per-seat",
				},
				{
					icon: Users,
					text: "Unlimited team members",
					id: "unlimited-members",
				},
				{ icon: FolderOpen, text: "3 projects included", id: "projects" },
				{ icon: HeadphonesIcon, text: "Slack support", id: "slack-support" },
				{ icon: Star, text: "Priority support", id: "priority-support" },
			];
		}
		return [
			{ icon: Zap, text: "300 credits per month", id: "credits" },
			{ icon: Users, text: "Single user", id: "single-user" },
			{ icon: FolderOpen, text: "1 project included", id: "project" },
			{ icon: HeadphonesIcon, text: "Email support", id: "email-support" },
		];
	};

	if (plansLoading) {
		return (
			<Dialog
				open={state.changePlan ?? false}
				onOpenChange={(value) => {
					if (!value) {
						setState(null);
					} else {
						setState({ changePlan: true });
					}
				}}
			>
				<DialogContent className="sm:max-w-[500px]">
					<div className="flex justify-center items-center p-8">
						<Spinner size="sm" />
					</div>
				</DialogContent>
			</Dialog>
		);
	}

	if (!targetPlan || !targetPrice) {
		return (
			<Dialog
				open={state.changePlan ?? false}
				onOpenChange={(value) => {
					if (!value) {
						setState(null);
					} else {
						setState({ changePlan: true });
					}
				}}
			>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>Plan not available</DialogTitle>
						<DialogDescription>
							The target plan is not available at the moment.
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end">
						<Button variant="outline" onClick={handleCancel}>
							Close
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		);
	}

	const features = getPlanFeatures(targetPlan);

	return (
		<Dialog
			open={state.changePlan ?? false}
			onOpenChange={(value) => {
				if (!value) {
					setState(null);
				} else {
					setState({ changePlan: true });
				}
			}}
		>
			<DialogContent className="sm:max-w-[500px] !p-0">
				<DialogHeader className="px-4 py-4 border-b">
					<DialogTitle>
						{isUpgrade ? "Upgrade" : "Downgrade"} to {targetPlan.name}
					</DialogTitle>
					<DialogDescription>
						{isUpgrade
							? "Unlock additional features and capabilities"
							: "Switch to a simpler plan"}
					</DialogDescription>
				</DialogHeader>

				<div className="px-4 py-4 space-y-6">
					{/* Current Plan Summary */}
					<div className="space-y-2">
						<h4 className="text-sm font-medium">Current Plan</h4>
						<div className="p-3 rounded-lg border bg-muted/50">
							<div className="flex justify-between items-center">
								<div>
									<p className="font-medium">
										{isTeamPlan ? "Team" : "Pro"} Plan
									</p>
									<p className="text-sm text-muted-foreground">
										{isTeamPlan &&
											`${currentSeats} seat${currentSeats > 1 ? "s" : ""} • `}
										${isTeamPlan ? currentPrice * currentSeats : currentPrice}
										/month
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* Target Plan Details */}
					<div className="space-y-4">
						<div className="flex justify-between items-center">
							<h4 className="text-sm font-medium">New Plan</h4>
							<div className="text-right">
								<p className="text-2xl font-bold">
									${targetPriceAmount}
									<span className="text-sm font-normal text-muted-foreground">
										/month
										{targetPlan.metadata?.isTeam === "true" ? " per seat" : ""}
									</span>
								</p>
							</div>
						</div>

						{/* Features */}
						<div className="grid grid-cols-2 gap-3">
							{features.map((feature) => (
								<div key={feature.id} className="flex gap-3 items-center">
									<div className="flex justify-center items-center rounded-md border size-6 bg-muted">
										<feature.icon className="text-emerald-600 size-3.5" />
									</div>
									<span className="text-sm">{feature.text}</span>
								</div>
							))}
						</div>
					</div>

					<Separator />

					{/* Billing Impact */}
					<div className="space-y-2">
						<h4 className="text-sm font-medium">Billing Impact</h4>
						<InfoBox variant={isUpgrade ? "destructive" : "default"}>
							<div className="font-medium text-primary">
								{`${isUpgrade ? "Additional charge" : "Credit"} this cycle`}
							</div>
							<div>
								Your next billing cycle will be charged at the new plan rate.
							</div>
						</InfoBox>
						<p className="text-xs text-muted-foreground">
							Your next billing cycle will be charged at the new plan rate.
						</p>
					</div>
				</div>
				{/* Actions */}
				<div className="flex gap-2 justify-end px-4 py-4 border-t">
					<Button
						onClick={handleChangePlan}
						disabled={isLoading}
						className="flex gap-2 justify-center items-center w-full"
						size="sm"
						variant="outline"
					>
						{isLoading && <Spinner size="xs" />}
						<CreditCard className="size-3.5" />
						{isUpgrade ? "Upgrade" : "Downgrade"} Plan
						<ButtonShortcut>⌘S</ButtonShortcut>
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};
