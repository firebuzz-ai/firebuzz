"use client";

import { useSubscription } from "@/hooks/auth/use-subscription";
import { useWorkspace } from "@/hooks/auth/use-workspace";
import { useManageSeats } from "@/hooks/ui/use-manage-seats";
import {
	ConvexError,
	api,
	useAction,
	useCachedRichQuery,
	useMutation,
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
import { ArrowLeft, Minus, Plus } from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { MemberSelection } from "./member-selection";

type ModalStep = "seats" | "members";

export const ManageSeatsModal = () => {
	const [state, setState] = useManageSeats();
	const { subscription, isTeamPlan, seatLimit } = useSubscription();
	const { currentWorkspace } = useWorkspace();
	const [isLoading, setIsLoading] = useState(false);
	const [currentStep, setCurrentStep] = useState<ModalStep>("seats");
	const [selectedMembersToRemove, setSelectedMembersToRemove] = useState<
		string[]
	>([]);

	// Get current members to check actual member count
	const { data: members } = useCachedRichQuery(
		api.collections.members.queries.getByWorkspace,
		!currentWorkspace ? "skip" : undefined,
	);

	// Current seat count from subscription
	const currentSeats = useMemo(() => {
		return seatLimit || 1;
	}, [seatLimit]);

	// Current member count (excluding owners since they can't be removed)
	const currentMemberCount = useMemo(() => {
		if (!members || !currentWorkspace) return 0;
		return (
			members.filter((member) => member.userId !== currentWorkspace.ownerId)
				.length + 1
		); // +1 for owner
	}, [members, currentWorkspace]);

	// New seat count state
	const [newSeats, setNewSeats] = useState(currentSeats);

	// Get current plan item and pricing
	const currentPlanItem = useMemo(() => {
		return subscription?.items.find(
			(item) =>
				item.metadata?.type === "subscription" &&
				item.metadata?.isShadow !== "true",
		);
	}, [subscription]);

	const pricePerSeat = useMemo(() => {
		if (!currentPlanItem?.price?.unitAmount) return 0;
		return currentPlanItem.price.unitAmount / 100;
	}, [currentPlanItem]);

	const currentTotalPrice = useMemo(() => {
		return pricePerSeat * currentSeats;
	}, [pricePerSeat, currentSeats]);

	const newTotalPrice = useMemo(() => {
		return pricePerSeat * newSeats;
	}, [pricePerSeat, newSeats]);

	const priceDifference = useMemo(() => {
		return newTotalPrice - currentTotalPrice;
	}, [newTotalPrice, currentTotalPrice]);

	const interval = useMemo(() => {
		return subscription?.interval || "month";
	}, [subscription]);

	const isDecreasing = useMemo(() => {
		return newSeats < currentSeats;
	}, [newSeats, currentSeats]);

	const requiresMemberRemoval = useMemo(() => {
		return isDecreasing && newSeats < currentMemberCount;
	}, [isDecreasing, newSeats, currentMemberCount]);

	const decreaseAmount = useMemo(() => {
		return requiresMemberRemoval ? currentMemberCount - newSeats : 0;
	}, [requiresMemberRemoval, currentMemberCount, newSeats]);

	const updateSeats = useAction(api.lib.stripe.updateSubscriptionSeats);
	const removeMember = useMutation(
		api.collections.members.mutations.handleRemoveMember,
	);

	// Reset state when modal opens
	useEffect(() => {
		if (state.manageSeats) {
			setNewSeats(currentSeats);
			setCurrentStep("seats");
			setSelectedMembersToRemove([]);
		}
	}, [state.manageSeats, currentSeats]);

	useHotkeys(
		"meta+s",
		async () => {
			if (currentStep === "seats") {
				await handleSeatsStep();
			} else if (currentStep === "members") {
				await handleMembersStep();
			}
		},
		{
			preventDefault: true,
			enabled: state.manageSeats ?? false,
		},
	);

	const handleSeatsStep = async () => {
		if (!isTeamPlan) {
			toast.error("Only team plans can manage seats.", {
				description: "Please upgrade to a team plan first.",
				id: "manage-seats",
			});
			return;
		}

		if (newSeats === currentSeats) {
			toast.error("No changes made to seat count.", {
				description: "Please adjust the number of seats.",
				id: "manage-seats",
			});
			return;
		}

		if (newSeats < 1) {
			toast.error("Minimum 1 seat required.", {
				description: "Please select at least 1 seat.",
				id: "manage-seats",
			});
			return;
		}

		// If decreasing seats and requires member removal, go to member selection
		if (requiresMemberRemoval) {
			setCurrentStep("members");
			return;
		}

		// If just changing seats without member removal, update directly
		try {
			setIsLoading(true);

			await updateSeats({
				newQuantity: newSeats,
			});

			toast.success("Seats updated successfully!", {
				description: `${newSeats} seat${newSeats > 1 ? "s" : ""} active.`,
				id: "manage-seats",
			});

			setState(null);
		} catch (error) {
			console.error(error);
			if (error instanceof ConvexError) {
				toast.error("Failed to update seats.", {
					description: error.data,
					id: "manage-seats",
				});
			} else {
				toast.error("Failed to update seats.", {
					description: "Please try again.",
					id: "manage-seats",
				});
			}
		} finally {
			setIsLoading(false);
		}
	};

	const handleMembersStep = async () => {
		if (selectedMembersToRemove.length !== decreaseAmount) {
			toast.error("Please select the required number of members.", {
				description: `You need to select ${decreaseAmount} member${decreaseAmount > 1 ? "s" : ""} to remove.`,
				id: "manage-seats",
			});
			return;
		}

		try {
			setIsLoading(true);

			// Remove selected members first
			for (const memberExternalId of selectedMembersToRemove) {
				await removeMember({
					userExternalId: memberExternalId,
				});
			}

			// Then update seat count
			await updateSeats({
				newQuantity: newSeats,
			});

			toast.success("Seats and members updated successfully!", {
				description: `${newSeats} seat${newSeats > 1 ? "s" : ""} active, ${decreaseAmount} member${decreaseAmount > 1 ? "s" : ""} removed.`,
				id: "manage-seats",
			});

			setState(null);
		} catch (error) {
			console.error(error);
			if (error instanceof ConvexError) {
				toast.error("Failed to update seats and remove members.", {
					description: error.data,
					id: "manage-seats",
				});
			} else {
				toast.error("Failed to update seats and remove members.", {
					description: "Please try again.",
					id: "manage-seats",
				});
			}
		} finally {
			setIsLoading(false);
		}
	};

	const handleBackToSeats = () => {
		setCurrentStep("seats");
		setSelectedMembersToRemove([]);
	};

	const handleCancel = () => {
		setState(null);
	};

	if (!state.manageSeats) return null;

	return (
		<Dialog
			open={state.manageSeats ?? false}
			onOpenChange={(value) => {
				setState(value ? { manageSeats: true } : null);
			}}
		>
			<DialogContent
				onOpenAutoFocus={(e) => e.preventDefault()}
				className="sm:max-w-lg w-full flex flex-col !gap-0 !p-0"
			>
				<DialogHeader className="px-4 py-4 border-b">
					<div className="w-full">
						<div className="flex gap-2 items-center">
							{currentStep === "members" && (
								<Button
									variant="ghost"
									size="iconXs"
									onClick={handleBackToSeats}
									disabled={isLoading}
								>
									<ArrowLeft className="w-4 h-4" />
								</Button>
							)}
							<DialogTitle>
								{currentStep === "seats"
									? "Manage Seats"
									: "Select Members to Remove"}
							</DialogTitle>
						</div>
						<DialogDescription>
							{currentStep === "seats"
								? "Adjust the number of seats for your team plan."
								: "Choose which members to remove when decreasing seats."}
						</DialogDescription>
					</div>
				</DialogHeader>

				<div className="flex flex-col">
					{currentStep === "seats" ? (
						<div className="px-4 py-4 space-y-4">
							{/* Current Plan Info */}
							<div className="p-4 rounded-lg border bg-muted">
								<div className="space-y-2">
									<div className="flex justify-between items-center">
										<span className="text-sm font-medium">Current Seats</span>
										<span className="text-sm">{currentSeats}</span>
									</div>
									<div className="flex justify-between items-center">
										<span className="text-sm font-medium">Current Members</span>
										<span className="text-sm">{currentMemberCount}</span>
									</div>
									<Separator />
									<div className="flex justify-between items-center">
										<span className="text-sm font-medium">Price per Seat</span>
										<span className="text-sm">
											${pricePerSeat.toFixed(2)}/{interval}
										</span>
									</div>
									<div className="flex justify-between items-center">
										<span className="text-sm font-medium">Current Total</span>
										<span className="text-sm font-semibold">
											${currentTotalPrice.toFixed(2)}/{interval}
										</span>
									</div>
								</div>
							</div>

							{/* Seat Selector */}
							<div className="space-y-3">
								<div className="flex justify-between items-center">
									<span className="text-sm font-medium">New Seat Count</span>
									<div className="flex gap-3 items-center">
										<Button
											variant="outline"
											size="sm"
											onClick={() => setNewSeats(Math.max(1, newSeats - 1))}
											disabled={newSeats <= 1}
										>
											<Minus className="w-4 h-4" />
										</Button>
										<span className="text-lg font-semibold min-w-[2ch] text-center">
											{newSeats}
										</span>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setNewSeats(newSeats + 1)}
										>
											<Plus className="w-4 h-4" />
										</Button>
									</div>
								</div>
							</div>

							{/* Price Summary */}
							<div className="p-4 space-y-2 rounded-lg border">
								<div className="flex justify-between items-center">
									<span className="text-sm font-medium">New Total</span>
									<span className="text-sm font-semibold">
										${newTotalPrice.toFixed(2)}/{interval}
									</span>
								</div>
								{priceDifference !== 0 && (
									<>
										<div className="flex justify-between items-center">
											<span className="text-sm font-medium">
												{priceDifference > 0 ? "Additional Cost" : "Savings"}
											</span>
											<span
												className={`text-sm font-semibold ${
													priceDifference > 0
														? "text-red-600"
														: "text-emerald-600"
												}`}
											>
												{priceDifference > 0 ? "+" : ""}$
												{priceDifference.toFixed(2)}/{interval}
											</span>
										</div>
										<Separator />
										<div className="space-y-1">
											<p className="text-xs font-medium text-muted-foreground">
												💡 Billing Impact
											</p>
											<p className="text-xs text-muted-foreground">
												{priceDifference > 0
													? "You'll be charged a prorated amount for the remaining days in your current billing period."
													: "You'll receive a prorated credit for the remaining days in your current billing period."}
											</p>
										</div>
									</>
								)}
							</div>

							{/* Warning for member removal */}
							{requiresMemberRemoval && (
								<InfoBox variant="destructive">
									<p className="text-sm font-medium">
										You will need to remove {decreaseAmount} member
										{decreaseAmount > 1 ? "s" : ""}
									</p>
									<p className="text-xs text-muted-foreground">
										You currently have {currentMemberCount} members but are
										reducing to {newSeats} seats.
									</p>
								</InfoBox>
							)}

							{/* Info for seat decrease without member removal */}
							{isDecreasing && !requiresMemberRemoval && (
								<InfoBox variant="default">
									<p className="text-sm font-medium">
										No member removal required
									</p>
									<p className="text-xs text-muted-foreground">
										You have {currentMemberCount} members and will have{" "}
										{newSeats} seats available.
									</p>
								</InfoBox>
							)}
						</div>
					) : (
						<MemberSelection
							decreaseAmount={decreaseAmount}
							selectedMembers={selectedMembersToRemove}
							onSelectionChange={setSelectedMembersToRemove}
							onConfirm={handleMembersStep}
							onCancel={handleBackToSeats}
							isLoading={isLoading}
						/>
					)}
				</div>

				{/* Footer - only show for seats step */}
				{currentStep === "seats" && (
					<div className="px-4 py-4 pt-4 border-t">
						<Button
							size="sm"
							variant="outline"
							className="w-full"
							onClick={currentStep === "seats" ? handleSeatsStep : handleCancel}
							disabled={isLoading || newSeats === currentSeats}
						>
							{isLoading ? (
								<Spinner size="xs" />
							) : (
								<>
									{requiresMemberRemoval
										? "Continue to Member Selection"
										: "Update Seats"}
									<ButtonShortcut>⌘S</ButtonShortcut>
								</>
							)}
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
};
