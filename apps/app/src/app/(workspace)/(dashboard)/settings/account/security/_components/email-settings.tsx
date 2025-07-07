"use client";

import { useAddEmailModal } from "@/hooks/ui/use-add-email-modal";
import { useUser } from "@clerk/nextjs";
import type { EmailAddressResource } from "@clerk/types";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Card, CardContent } from "@firebuzz/ui/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
  CheckCheck,
  Mail,
  MoreHorizontal,
  Plus,
  Shield,
  Trash,
  XCircle,
} from "@firebuzz/ui/icons/lucide";
import { useState } from "react";
import { AddEmailModal } from "./add-email-modal";

export const EmailSettings = () => {
  const { user, isLoaded } = useUser();
  const [, setAddEmailModal] = useAddEmailModal();
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  const handleRemoveEmail = async (emailAddress: EmailAddressResource) => {
    if (!user || emailAddress.id === user.primaryEmailAddressId) return;

    setIsRemoving(emailAddress.id);
    try {
      await emailAddress.destroy();
      await user.reload();
    } catch (error) {
      console.error("Error removing email:", error);
    } finally {
      setIsRemoving(null);
    }
  };

  const handleSetPrimary = async (emailAddress: EmailAddressResource) => {
    if (!user || emailAddress.verification.status !== "verified") return;

    try {
      await user.update({ primaryEmailAddressId: emailAddress.id });
    } catch (error) {
      console.error("Error setting primary email:", error);
    }
  };

  const handleResendVerification = async (
    emailAddress: EmailAddressResource
  ) => {
    try {
      await emailAddress.prepareVerification({ strategy: "email_code" });
      // You would typically show a verification modal here
    } catch (error) {
      console.error("Error resending verification:", error);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center p-6">
        <Spinner size="sm" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="p-6 space-y-6 w-full border-b">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Email addresses</h2>
          <p className="text-sm text-muted-foreground">
            Manage your email addresses and verification status.
          </p>
        </div>
      </div>

      {/* Email List */}
      <div className="space-y-3 max-w-xl">
        {user.emailAddresses.map((emailAddress) => {
          const isVerified = emailAddress.verification.status === "verified";
          const isPrimary = emailAddress.id === user.primaryEmailAddressId;
          const isCurrentlyRemoving = isRemoving === emailAddress.id;

          return (
            <Card
              key={emailAddress.id}
              className="transition-all duration-200 hover:shadow-md bg-muted"
            >
              <CardContent className="p-4">
                <div className="space-y-3 w-full min-w-0">
                  {/* Top */}
                  <div className="flex gap-3 items-center">
                    <div className="flex gap-1 items-center">
                      <div className="p-1 rounded-md border bg-muted">
                        <Mail className="text-muted-foreground size-3.5" />
                      </div>
                      <Tooltip>
                        <TooltipTrigger className="p-1 rounded-md border bg-muted">
                          {isVerified ? (
                            <CheckCheck className="size-3.5 text-emerald-500" />
                          ) : (
                            <XCircle className="size-3.5 text-amber-500" />
                          )}
                        </TooltipTrigger>
                        <TooltipContent>
                          {isVerified ? "Verified" : "Unverified"}
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Email Info */}
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex gap-2 items-center">
                        <h3
                          className="text-sm font-medium truncate"
                          title={emailAddress.emailAddress}
                        >
                          {emailAddress.emailAddress}
                        </h3>
                      </div>
                    </div>

                    {/* Right Part */}
                    <div className="flex gap-2 items-center">
                      <Badge
                        variant={isPrimary ? "brand" : "outline"}
                        className="text-xs"
                      >
                        {isPrimary ? "Primary" : "Secondary"}
                      </Badge>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="iconXs"
                            disabled={isCurrentlyRemoving}
                          >
                            {isCurrentlyRemoving ? (
                              <Spinner size="xs" />
                            ) : (
                              <MoreHorizontal className="size-3.5" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="bottom" align="end">
                          <DropdownMenuItem
                            disabled={isPrimary || isCurrentlyRemoving}
                            onClick={() => handleSetPrimary(emailAddress)}
                          >
                            <Shield className="size-3.5" />
                            Set as primary
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={isCurrentlyRemoving || isVerified}
                            onClick={() =>
                              handleResendVerification(emailAddress)
                            }
                          >
                            <Mail className="size-3.5" />
                            Resend verification
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={isCurrentlyRemoving || isPrimary}
                            onClick={() => handleRemoveEmail(emailAddress)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash className="size-3.5" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setAddEmailModal({ create: true })}
        >
          <Plus className="size-3.5" />
          Add email
        </Button>
      </div>

      <AddEmailModal />
    </div>
  );
};
