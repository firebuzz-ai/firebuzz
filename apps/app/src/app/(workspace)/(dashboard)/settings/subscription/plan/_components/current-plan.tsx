"use client";

import { ChangePlanModal } from "@/components/modals/subscription/change-plan/modal";
import { ManageSeatsModal } from "@/components/modals/subscription/manage-seats/modal";
import { useSubscription } from "@/hooks/auth/use-subscription";
import { useUser } from "@/hooks/auth/use-user";
import { useWorkspace } from "@/hooks/auth/use-workspace";
import { useChangePlan } from "@/hooks/ui/use-change-plan";
import { useManageSeats } from "@/hooks/ui/use-manage-seats";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Progress } from "@firebuzz/ui/components/ui/progress";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	ArrowDownRight,
	ArrowRight,
	CreditCard,
} from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { useMemo, useState } from "react";
import { CancelSubscriptionDialog } from "./cancel-subscription-dialog";

export const CurrentPlan = () => {
	const { currentWorkspace } = useWorkspace();
	const { user: currentUser } = useUser();
	const [, setManageSeatsState] = useManageSeats();
	const [, setChangePlanState] = useChangePlan();
	const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

	const {
		subscription,
		isLoading,
		isActive,
		isTrial,
		isTeamPlan,
		isCancellingAtPeriodEnd,
		currentPeriodStart,
		currentPeriodEnd,
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
				item.metadata?.isShadow !== "true",
		);
	}, [subscription]);

	const interval = useMemo(() => {
		return subscription?.interval;
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
			(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
		);
		const remainingDays = Math.ceil(
			(end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
		);
		const elapsedDays = totalDays - remainingDays;

		const progress = Math.max(
			0,
			Math.min(100, (elapsedDays / totalDays) * 100),
		);

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
		};
	}, [currentPeriodStart, currentPeriodEnd]);

	// Format price
	const formattedPrice = useMemo(() => {
		if (!currentPlanPrice?.unitAmount) return "Free";
		const amount = isTeamPlan
			? (currentPlanPrice.unitAmount / 100) * (currentPlanItem?.quantity ?? 1)
			: currentPlanPrice.unitAmount / 100;
		return `$${amount.toFixed(2)}`;
	}, [currentPlanPrice, isTeamPlan, currentPlanItem?.quantity]);

	// Get plan name
	const planName = useMemo(() => {
		if (!currentPlanProduct?.name) return "Free";
		return currentPlanProduct.name;
	}, [currentPlanProduct]);

	const handleManageSeats = () => {
		if (isAdmin || isWorkspaceOwner) {
			setManageSeatsState({ manageSeats: true });
		} else {
			toast.error("You are not authorized to manage seats");
		}
	};

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

	if (isLoading) {
		return (
			<div className="flex justify-center items-center p-8">
				<Spinner size="sm" />
			</div>
		);
	}

	return (
		<>
			<ManageSeatsModal />
			<ChangePlanModal />
			<CancelSubscriptionDialog
				isOpen={isCancelDialogOpen}
				onClose={handleCloseCancelDialog}
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
								{isTeamPlan && (
									<Badge variant="outline">
										{currentPlanItem?.quantity} seat
										{currentPlanItem?.quantity && currentPlanItem?.quantity > 1
											? "s"
											: ""}
									</Badge>
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
											{billingCycleInfo.remainingDays} days left
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
									{isTeamPlan ? "Downgrade to Pro" : "Upgrade to Team"}
									<ArrowRight className="size-3.5" />
								</Button>
								<Button
									disabled={
										!isTeamPlan ||
										!isAdmin ||
										!isWorkspaceOwner ||
										isCancellingAtPeriodEnd
									}
									variant="outline"
									size="sm"
									className="flex gap-2 items-center"
									onClick={handleManageSeats}
								>
									Manage Seats <ArrowRight className="size-3.5" />
								</Button>
							</div>
							{!isCancellingAtPeriodEnd ? (
								<Button
									variant="destructive"
									size="sm"
									className="flex gap-2 items-center"
									onClick={handleCancelSubscription}
									disabled={
										!isWorkspaceOwner ||
										(!isActive && !isTrial) ||
										isCancellingAtPeriodEnd
									}
								>
									<CreditCard className="size-3.5" />
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
						</div>
					</div>
				</div>
			</div>
		</>
	);
};
