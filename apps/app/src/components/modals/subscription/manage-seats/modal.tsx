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
  const { subscription, seatLimit, extraSeatsCount, interval } =
    useSubscription();
  const { currentWorkspace } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<ModalStep>("seats");
  const [selectedMembersToRemove, setSelectedMembersToRemove] = useState<
    string[]
  >([]);

  // Get available seat add-on products
  const { data: availableProducts } = useCachedRichQuery(
    api.collections.stripe.products.queries.getAddOnProducts,
    {}
  );

  // Get current members to check actual member count
  const { data: members } = useCachedRichQuery(
    api.collections.members.queries.getByWorkspace,
    !currentWorkspace ? "skip" : undefined
  );

  // Current seat count from subscription (total seats including extra)
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

  // New extra seat count state (just the extra seats, not total)
  const [newExtraSeats, setNewExtraSeats] = useState(extraSeatsCount);

  // Base seats from plan
  const baseSeatCount = useMemo(() => {
    if (!subscription?.items) return 1;
    const mainPlanItem = subscription.items.find(
      (item) =>
        item.metadata?.type === "subscription" &&
        item.metadata?.isShadow !== "true"
    );
    const mainProduct = mainPlanItem?.product;
    const seats =
      mainProduct?.metadata?.type === "subscription"
        ? mainProduct?.metadata?.seats || 1
        : 1;
    return Number(seats);
  }, [subscription]);

  // Get seat add-on pricing from available products
  const seatAddOnProduct = useMemo(() => {
    const product = availableProducts?.find(
      (product) =>
        product.metadata?.type === "add-on" &&
        product.metadata?.addonType === "extra-seat"
    );
    return product;
  }, [availableProducts]);

  const subscriptionIntervalPrice = useMemo(() => {
    if (!seatAddOnProduct?.prices) return null;
    return seatAddOnProduct.prices.find(
      (price) => price.interval === interval && price.active
    );
  }, [seatAddOnProduct, interval]);

  const extraSeatPrice = useMemo(() => {
    if (!subscriptionIntervalPrice?.unitAmount) return 0;
    return subscriptionIntervalPrice.unitAmount / 100;
  }, [subscriptionIntervalPrice]);

  const currentExtraSeatPrice = useMemo(() => {
    return extraSeatPrice * extraSeatsCount;
  }, [extraSeatPrice, extraSeatsCount]);

  const newExtraSeatPrice = useMemo(() => {
    return extraSeatPrice * newExtraSeats;
  }, [extraSeatPrice, newExtraSeats]);

  const priceDifference = useMemo(() => {
    return newExtraSeatPrice - currentExtraSeatPrice;
  }, [newExtraSeatPrice, currentExtraSeatPrice]);

  // Total seats calculation
  const newTotalSeats = useMemo(() => {
    return baseSeatCount + newExtraSeats;
  }, [baseSeatCount, newExtraSeats]);

  const isDecreasing = useMemo(() => {
    return newTotalSeats < currentSeats;
  }, [newTotalSeats, currentSeats]);

  const requiresMemberRemoval = useMemo(() => {
    return isDecreasing && newTotalSeats < currentMemberCount;
  }, [isDecreasing, newTotalSeats, currentMemberCount]);

  const decreaseAmount = useMemo(() => {
    return requiresMemberRemoval ? currentMemberCount - newTotalSeats : 0;
  }, [requiresMemberRemoval, currentMemberCount, newTotalSeats]);

  const updateExtraSeats = useAction(api.lib.stripe.updateExtraSeats);
  const removeMember = useMutation(
    api.collections.members.mutations.handleRemoveMember
  );

  // Reset state when modal opens
  useEffect(() => {
    if (state.manageSeats) {
      setNewExtraSeats(extraSeatsCount);
      setCurrentStep("seats");
      setSelectedMembersToRemove([]);
    }
  }, [state.manageSeats, extraSeatsCount]);

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
    }
  );

  const handleSeatsStep = async () => {
    if (newExtraSeats === extraSeatsCount) {
      toast.error("No changes made to extra seat count.", {
        description: "Please adjust the number of extra seats.",
        id: "manage-seats",
      });
      return;
    }

    if (newExtraSeats < 0) {
      toast.error("Cannot have negative extra seats.", {
        description: "Please select a valid number of extra seats.",
        id: "manage-seats",
      });
      return;
    }

    if (newTotalSeats < 1) {
      toast.error("Minimum 1 seat required.", {
        description: "You must have at least the base plan seats.",
        id: "manage-seats",
      });
      return;
    }

    // If decreasing seats and requires member removal, go to member selection
    if (requiresMemberRemoval) {
      setCurrentStep("members");
      return;
    }

    // Update extra seats directly
    try {
      setIsLoading(true);

      await updateExtraSeats({
        newExtraSeatCount: newExtraSeats,
      });

      toast.success("Extra seats updated successfully!", {
        description: `${newTotalSeats} seat${newTotalSeats > 1 ? "s" : ""} available.`,
        id: "manage-seats",
      });

      setState(null);
    } catch (error) {
      console.error(error);
      if (error instanceof ConvexError) {
        toast.error("Failed to update extra seats.", {
          description: error.data,
          id: "manage-seats",
        });
      } else {
        toast.error("Failed to update extra seats.", {
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

      // Update extra seats after removing members
      await updateExtraSeats({
        newExtraSeatCount: newExtraSeats,
      });

      toast.success("Members removed and extra seats updated!", {
        description: `${newTotalSeats} seat${newTotalSeats > 1 ? "s" : ""} available, ${selectedMembersToRemove.length} member${selectedMembersToRemove.length > 1 ? "s" : ""} removed.`,
        id: "manage-seats",
      });

      setState(null);
    } catch (error) {
      console.error(error);
      if (error instanceof ConvexError) {
        toast.error("Failed to remove members and update extra seats.", {
          description: error.data,
          id: "manage-seats",
        });
      } else {
        toast.error("Failed to remove members and update extra seats.", {
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
                  ? "Manage Extra Seats"
                  : "Select Members to Remove"}
              </DialogTitle>
            </div>
            <DialogDescription>
              {currentStep === "seats"
                ? "Add or remove extra seats beyond your base plan."
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
                    <span className="text-sm font-medium">Base Plan Seats</span>
                    <span className="text-sm">{baseSeatCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Current Extra Seats
                    </span>
                    <span className="text-sm">{extraSeatsCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Seats</span>
                    <span className="text-sm">{currentSeats}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Current Members</span>
                    <span className="text-sm">{currentMemberCount}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Price per Extra Seat
                    </span>
                    <span className="text-sm">
                      ${extraSeatPrice.toFixed(2)}/{interval}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Current Total</span>
                    <span className="text-sm font-semibold">
                      ${currentExtraSeatPrice.toFixed(2)}/{interval}
                    </span>
                  </div>
                </div>
              </div>

              {/* Seat Selector */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Extra Seats</span>
                  <div className="flex gap-3 items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newValue = Math.max(0, newExtraSeats - 1);
                        setNewExtraSeats(newValue);
                      }}
                      disabled={newExtraSeats <= 0 || isLoading}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-lg font-semibold min-w-[2ch] text-center">
                      {newExtraSeats}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newValue = newExtraSeats + 1;
                        setNewExtraSeats(newValue);
                      }}
                      disabled={isLoading}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Total seats: {newTotalSeats} ({baseSeatCount} base +{" "}
                  {newExtraSeats} extra)
                </div>
              </div>

              {/* Price Summary */}
              <div className="p-4 space-y-2 rounded-lg border">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">New Total</span>
                  <span className="text-sm font-semibold">
                    ${newExtraSeatPrice.toFixed(2)}/{interval}
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
                    reducing to {newTotalSeats} total seats.
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
                    {newTotalSeats} seats available.
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
              disabled={isLoading || newExtraSeats === extraSeatsCount}
            >
              {isLoading ? (
                <Spinner size="xs" />
              ) : (
                <>
                  {requiresMemberRemoval
                    ? "Continue to Member Selection"
                    : "Update Extra Seats"}
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
