"use client";

import { ManageProjectsModal } from "@/components/modals/subscription/manage-projects/modal";
import { ManageSeatsModal } from "@/components/modals/subscription/manage-seats/modal";
import { useSubscription } from "@/hooks/auth/use-subscription";
import { useUser } from "@/hooks/auth/use-user";
import { useManageProjects } from "@/hooks/ui/use-manage-projects";
import { useManageSeats } from "@/hooks/ui/use-manage-seats";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Card, CardContent } from "@firebuzz/ui/components/ui/card";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
  FolderOpen,
  MoreHorizontal,
  Plus,
  Users,
} from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { useMemo } from "react";

export const AddOns = () => {
  const { subscription, isLoading, isCancellingAtPeriodEnd } =
    useSubscription();
  const { user } = useUser();
  const [isManageProjectsOpen, setManageProjectsState] = useManageProjects();
  const [isManageSeatsOpen, setManageSeatsState] = useManageSeats();
  const isAdmin = useMemo(() => {
    return user?.currentRole === "org:admin";
  }, [user]);

  // Get add-ons from subscription items
  const addOns = useMemo(() => {
    if (!subscription?.items) return [];

    return subscription.items
      .filter((item) => item.metadata?.type === "add-on")
      .map((item) => ({
        id: item._id,
        name: getAddOnDisplayName(
          item.metadata?.type === "add-on"
            ? item.metadata?.addonType
            : "extra-project"
        ),
        type:
          item.metadata?.type === "add-on"
            ? item.metadata?.addonType
            : "extra-project",
        quantity: item.quantity,
        price: item.price?.unitAmount ? item.price.unitAmount / 100 : 0,
        interval: item.price?.interval,
        priceId: item.price?._id,
      }));
  }, [subscription]);

  // Helper function to get display name for add-on types
  function getAddOnDisplayName(
    addOnType: "extra-project" | "extra-seat" | "extra-traffic"
  ): string {
    switch (addOnType) {
      case "extra-project":
        return "Extra Projects";
      case "extra-seat":
        return "Extra Seats";
      default:
        return addOnType
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
    }
  }

  // Helper function to get icon for add-on types
  function getAddOnIcon(addOnType: string) {
    switch (addOnType) {
      case "extra-project":
        return FolderOpen;
      case "extra-seat":
        return Users;
      default:
        return Plus;
    }
  }

  const openManageProjectsModal = () => {
    if (isAdmin) {
      setManageProjectsState({ manageProjects: true });
    } else {
      toast.error("You are not authorized to manage projects");
    }
  };

  const openManageSeatsModal = () => {
    if (isAdmin) {
      setManageSeatsState({ manageSeats: true });
    } else {
      toast.error("You are not authorized to manage seats");
    }
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
      {isManageProjectsOpen.manageProjects && <ManageProjectsModal />}
      {isManageSeatsOpen.manageSeats && <ManageSeatsModal />}
      <div className="p-6 space-y-6 w-full">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold">Add-ons</h2>
          <p className="text-sm text-muted-foreground">
            Manage your subscription add-ons.
          </p>
        </div>

        <div className="space-y-6 max-w-2xl">
          {/* Current Limits Overview */}
          <div className="space-y-4">
            <Card className="bg-muted">
              <CardContent className="flex justify-between items-center p-4">
                <div className="flex gap-3 items-center">
                  <div className="flex justify-center items-center p-2 rounded-md border bg-muted size-10">
                    <FolderOpen className="size-4" />
                  </div>
                  <div>
                    <div className="text-base font-bold leading-none">
                      Extra Projects
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Projects help you manage your brands.
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!isAdmin || isCancellingAtPeriodEnd}
                  onClick={openManageProjectsModal}
                >
                  <Plus className="size-3.5" />
                  Add Projects
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-muted">
              <CardContent className="flex justify-between items-center p-4">
                <div className="flex gap-3 items-center">
                  <div className="flex justify-center items-center p-2 rounded-md border bg-muted size-10">
                    <Users className="size-4" />
                  </div>
                  <div>
                    <div className="text-base font-bold leading-none">
                      Extra Seats
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Add more team members to your workspace.
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!isAdmin || isCancellingAtPeriodEnd}
                  onClick={openManageSeatsModal}
                >
                  <Plus className="size-3.5" />
                  Add Seats
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Add-ons List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-medium">
                Active Add-ons{" "}
                <span className="text-xs text-muted-foreground">
                  ({addOns.length})
                </span>
              </h3>
            </div>

            {addOns.length > 0 ? (
              <div className="space-y-3">
                {addOns.map((addOn) => {
                  const Icon = getAddOnIcon(addOn.type);
                  return (
                    <Card key={addOn.id} className="bg-muted">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div className="flex gap-3 items-center">
                            <div className="flex justify-center items-center p-2 rounded-md border bg-muted size-10">
                              <Icon className="size-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {addOn.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Quantity: {addOn.quantity}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-3 items-center">
                            <Badge variant="outline" className="font-medium">
                              ${addOn.price * addOn.quantity}/{addOn.interval}
                            </Badge>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  disabled={!isAdmin || isCancellingAtPeriodEnd}
                                  onClick={
                                    addOn.type === "extra-seat"
                                      ? openManageSeatsModal
                                      : openManageProjectsModal
                                  }
                                  variant="ghost"
                                  size="iconXs"
                                >
                                  <MoreHorizontal className="size-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Manage</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="bg-muted/50">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="flex justify-center mb-3">
                      <div className="p-3 rounded-md border bg-muted">
                        <Plus className="size-6 text-muted-foreground" />
                      </div>
                    </div>
                    <p className="font-medium">No add-ons yet</p>
                    <p className="text-sm text-muted-foreground">
                      Add extra projects or seats to your plan.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
