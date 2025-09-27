"use client";

import { useProject } from "@/hooks/auth/use-project";
import { useSubscription } from "@/hooks/auth/use-subscription";
import { useUser } from "@/hooks/auth/use-user";
import { useChangePlan } from "@/hooks/ui/use-change-plan";
import {
	ConvexError,
	type Doc,
	api,
	useAction,
	useCachedRichQuery,
} from "@firebuzz/convex";
import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	AlertTriangle,
	CreditCard,
	FolderOpen,
	HeadphonesIcon,
	Users,
	Zap,
} from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

type PlanWithPrices = Doc<"products"> & {
	prices: Doc<"prices">[];
};

export const ChangePlanModal = () => {
	const [state, setState] = useChangePlan();
	const {
		subscription,
		interval: currentInterval,
		extraSeatsCount,
		extraProjectsCount,
	} = useSubscription();
	const [isLoading, setIsLoading] = useState(false);
	const [selectedPlan, setSelectedPlan] = useState<PlanWithPrices | null>(null);

	const { user } = useUser();
	const { projects } = useProject();

	// Get workspace members for seat count validation
	const { data: members } = useCachedRichQuery(
		api.collections.members.queries.getByWorkspace,
	);

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

	// Current plan product
	const currentPlan = useMemo(() => {
		if (!currentPlanItem || !availablePlans) return null;
		return availablePlans.find(
			(plan) => plan._id === currentPlanItem.product?._id,
		);
	}, [currentPlanItem, availablePlans]);

	// Current usage counts
	const currentUsage = useMemo(() => {
		const memberCount = members?.length || 1; // Include owner
		const projectCount = projects?.length || 0;

		return {
			members: memberCount,
			projects: projectCount,
		};
	}, [members, projects]);

	// Validation for selected plan
	const planValidation = useMemo(() => {
		if (!selectedPlan) return { isValid: true, issues: [] };

		const metadata = selectedPlan.metadata;
		const newBaseSeatCount = Number(
			metadata?.type === "subscription" ? metadata?.seats || "1" : "1",
		);
		const newBaseProjectCount = Number(
			metadata?.type === "subscription" ? metadata?.projects || "1" : "1",
		);

		// Calculate new total limits including existing add-ons
		const newTotalSeatLimit = newBaseSeatCount + extraSeatsCount;
		const newTotalProjectLimit = newBaseProjectCount + extraProjectsCount;

		const issues: string[] = [];
		let isValid = true;

		// Check if downgrading exceeds current usage
		if (newTotalSeatLimit < currentUsage.members) {
			issues.push(
				`New plan would provide ${newTotalSeatLimit} total seat${newTotalSeatLimit > 1 ? "s" : ""} (${newBaseSeatCount} base + ${extraSeatsCount} extra) but you have ${currentUsage.members} team member${currentUsage.members > 1 ? "s" : ""}`,
			);
			isValid = false;
		}

		if (newTotalProjectLimit < currentUsage.projects) {
			issues.push(
				`New plan would provide ${newTotalProjectLimit} total project${newTotalProjectLimit > 1 ? "s" : ""} (${newBaseProjectCount} base + ${extraProjectsCount} extra) but you have ${currentUsage.projects} project${currentUsage.projects > 1 ? "s" : ""}`,
			);
			isValid = false;
		}

		return { isValid, issues };
	}, [selectedPlan, currentUsage, extraSeatsCount, extraProjectsCount]);

	// Sort plans by price (ascending)
	const sortedPlans = useMemo(() => {
		if (!availablePlans) return [];

		return availablePlans
			.filter((plan) => plan.metadata?.type === "subscription")
			.sort((a, b) => {
				const aPrice = a.prices.find(
					(price) => price.interval === currentInterval && price.active,
				);
				const bPrice = b.prices.find(
					(price) => price.interval === currentInterval && price.active,
				);

				const aPriceAmount = aPrice?.unitAmount || 0;
				const bPriceAmount = bPrice?.unitAmount || 0;

				return aPriceAmount - bPriceAmount;
			});
	}, [availablePlans, currentInterval]);

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

		if (!selectedPlan) {
			toast.error("Please select a plan.", {
				description: "Choose a plan to continue.",
				id: "change-plan",
			});
			return;
		}

		// Check if selecting the same plan (no change)
		if (selectedPlan._id === currentPlan?._id) {
			toast.error("You're already on this plan.", {
				description: "Please select a different plan.",
				id: "change-plan",
			});
			return;
		}

		// Validate plan change
		if (!planValidation.isValid) {
			toast.error("Cannot downgrade to this plan.", {
				description: "Please reduce your usage first or contact support.",
				id: "change-plan",
			});
			return;
		}

		const targetPrice = selectedPlan.prices.find(
			(price) => price.interval === currentInterval && price.active,
		);

		if (!targetPrice) {
			toast.error("Plan pricing not found.", {
				description: "Please try again.",
				id: "change-plan",
			});
			return;
		}

		const currentPrice = currentPlan?.prices.find(
			(price) => price.interval === currentInterval && price.active,
		);

		const isUpgrade =
			(targetPrice.unitAmount || 0) > (currentPrice?.unitAmount || 0);

		try {
			setIsLoading(true);

			await changePlanAction({
				targetProductId: selectedPlan._id,
				targetPriceId: targetPrice._id,
			});

			toast.success(
				`Successfully ${isUpgrade ? "upgraded" : "downgraded"} to ${selectedPlan.name}!`,
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

	const getPlanFeatures = (plan: PlanWithPrices) => {
		const metadata = plan.metadata;
		const seats = Number(
			metadata?.type === "subscription" ? metadata?.seats || "1" : "1",
		);
		const projects =
			metadata?.type === "subscription" ? metadata?.projects || "1" : "1";
		const credits =
			metadata?.type === "subscription" ? metadata?.credits || "0" : "0";
		const planName = plan.name?.toLowerCase() || "";

		// Determine plan type from name
		const isAgency = planName.includes("agency");
		const isScale = planName.includes("scale");

		const features = [
			{
				icon: Zap,
				text: `${credits} credits per month`,
				id: "credits",
			},
			{
				icon: Users,
				text: seats === 1 ? "Single user" : `Up to ${seats} team members`,
				id: "users",
			},
			{
				icon: FolderOpen,
				text: `${projects} project${Number(projects) > 1 ? "s" : ""} included`,
				id: "projects",
			},
		];

		// Add support features based on plan type
		if (isAgency) {
			features.push({
				icon: HeadphonesIcon,
				text: "Customer success manager",
				id: "support",
			});
		} else if (isScale) {
			features.push({
				icon: HeadphonesIcon,
				text: "Priority support",
				id: "support",
			});
		} else {
			// Starter plan
			features.push({
				icon: HeadphonesIcon,
				text: "Email / Chat support",
				id: "support",
			});
		}

		return features;
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
				<DialogContent className="sm:max-w-4xl">
					<div className="flex justify-center items-center p-8">
						<Spinner size="sm" />
					</div>
				</DialogContent>
			</Dialog>
		);
	}

	if (!sortedPlans.length) {
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
				<DialogContent className="sm:max-w-4xl">
					<DialogHeader>
						<DialogTitle>No plans available</DialogTitle>
						<DialogDescription>
							No subscription plans are available at the moment.
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
			<DialogContent className="sm:max-w-4xl !p-0">
				<DialogHeader className="px-6 py-4 border-b">
					<DialogTitle>Change Plan</DialogTitle>
					<DialogDescription>
						Choose the plan that best fits your needs. You can upgrade or
						downgrade at any time.
					</DialogDescription>
				</DialogHeader>

				<div className="px-6 py-6 space-y-6">
					{/* Current Plan Info */}
					{currentPlan && (
						<div className="space-y-2">
							<h4 className="text-sm font-medium">Current Plan</h4>
							<div className="p-3 rounded-lg border bg-muted/50">
								<div className="flex justify-between items-center">
									<div>
										<p className="font-medium">{currentPlan.name}</p>
										<p className="text-sm text-muted-foreground">
											$
											{(
												(currentPlan.prices.find(
													(price) =>
														price.interval === currentInterval && price.active,
												)?.unitAmount || 0) / 100
											).toFixed(2)}
											/{currentInterval}
										</p>
									</div>
									<Badge variant="brand">Current</Badge>
								</div>
							</div>
						</div>
					)}

					{/* Plan Selection */}
					<div className="space-y-4">
						<div className="flex justify-between items-center">
							<h4 className="text-sm font-medium">Available Plans</h4>
							<Badge variant="outline" className="text-xs">
								{currentInterval === "year" ? "Yearly" : "Monthly"} Plans
							</Badge>
						</div>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
							{sortedPlans.map((plan) => {
								const price = plan.prices.find(
									(p) => p.interval === currentInterval && p.active,
								);
								const priceAmount = price ? (price?.unitAmount || 0) / 100 : 0;
								const features = getPlanFeatures(plan);
								const isCurrentPlan = currentPlan?._id === plan._id;
								const isSelected = selectedPlan?._id === plan._id;

								return (
									<div
										key={plan._id}
										className={cn(
											"relative p-4 rounded-lg border cursor-pointer transition-all",
											isSelected ? "ring-1 ring-brand" : "hover:bg-muted",
											isCurrentPlan && "opacity-50 cursor-not-allowed",
										)}
										onClick={() => {
											if (!isCurrentPlan) {
												setSelectedPlan(plan);
											}
										}}
									>
										<div className="space-y-4">
											{/* Plan Header */}
											<div className="space-y-2">
												<h3 className="font-semibold">{plan.name}</h3>
												<div className="text-2xl font-bold">
													${priceAmount.toFixed(2)}
													<span className="text-sm font-normal text-muted-foreground">
														/{currentInterval}
													</span>
												</div>
											</div>

											{/* Features */}
											<div className="space-y-2">
												{features.map((feature) => (
													<div
														key={feature.id}
														className="flex gap-2 items-center text-sm"
													>
														<feature.icon className="flex-shrink-0 p-1 text-emerald-600 rounded-md border size-6 bg-muted" />
														<span>{feature.text}</span>
													</div>
												))}
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>

					{/* Validation Warnings */}
					{selectedPlan && !planValidation.isValid && (
						<div className="space-y-2">
							<h4 className="text-sm font-medium">Plan Validation</h4>
							<InfoBox variant="destructive">
								<div className="space-y-2">
									<div className="flex gap-2 items-start">
										<AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
										<div>
											<p className="text-sm font-medium">
												Cannot downgrade to this plan
											</p>
											<p className="text-xs text-muted-foreground">
												Your current usage exceeds the limits of this plan:
											</p>
										</div>
									</div>
									<ul className="ml-6 space-y-1">
										{planValidation.issues.map((issue) => (
											<li
												key={`validation-issue-${issue}`}
												className="text-xs text-muted-foreground"
											>
												• {issue}
											</li>
										))}
									</ul>
									<p className="text-xs text-muted-foreground mt-2">
										Please reduce your team members or projects, or contact
										support for assistance.
									</p>
								</div>
							</InfoBox>
						</div>
					)}

					{/* Selected Plan Summary */}
					{selectedPlan && planValidation.isValid && (
						<div className="space-y-2">
							<h4 className="text-sm font-medium">Plan Change Summary</h4>
							<div className="p-4 rounded-lg border bg-muted/30">
								<div className="flex justify-between items-center">
									<div>
										<p className="font-medium">
											Switching to {selectedPlan.name}
										</p>
										<p className="text-sm text-muted-foreground">
											Changes will take effect immediately
										</p>
									</div>
									<div className="text-right">
										<p className="text-lg font-semibold">
											$
											{(
												(selectedPlan.prices.find(
													(price) =>
														price.interval === currentInterval && price.active,
												)?.unitAmount || 0) / 100
											).toFixed(2)}
											/{currentInterval}
										</p>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Actions */}
				<div className="flex gap-3 justify-between px-6 py-4 border-t">
					<Button
						variant="outline"
						size="sm"
						className="h-8"
						onClick={handleCancel}
					>
						Cancel
					</Button>
					<Button
						size="sm"
						onClick={handleChangePlan}
						disabled={isLoading || !selectedPlan || !planValidation.isValid}
						className="flex gap-2 items-center h-8"
					>
						{isLoading && <Spinner size="xs" />}
						<CreditCard className="size-4" />
						Change Plan
						<ButtonShortcut>⌘S</ButtonShortcut>
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};
