"use client";

import { type Doc, api, useAction } from "@firebuzz/convex";
import { Avatar, AvatarFallback } from "@firebuzz/ui/components/ui/avatar";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Clock, Mail, Settings, Trash, User } from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { useState } from "react";

interface InvitationListItemProps {
	invitation: Doc<"invitations">;
}

export const InvitationListItem = ({ invitation }: InvitationListItemProps) => {
	const isAdmin = invitation.role === "org:admin";
	const [isRevoking, setIsRevoking] = useState(false);
	const [isResending, setIsResending] = useState(false);
	const revokeAction = useAction(api.lib.clerk.revokeOrganizationInvitation);
	const resendAction = useAction(api.lib.clerk.resendOrganizationInvitation);

	const handleResendInvite = async () => {
		try {
			setIsResending(true);
			await resendAction({ invitationId: invitation.externalId });
			toast.success("Invite resent successfully", {
				description: "The invite has been resent to the user",
			});
		} catch (error) {
			toast.error("Failed to resend invite", {
				description: "Please try again",
			});
			console.error(error);
		} finally {
			setIsResending(false);
		}
	};

	const handleRevokeInvite = async () => {
		try {
			setIsRevoking(true);
			await revokeAction({ invitationId: invitation.externalId });
			toast.success("Invite revoked successfully", {
				description: "The invite has been revoked",
			});
		} catch (error) {
			toast.error("Failed to revoke invite", {
				description: "Please try again",
			});
			console.error(error);
		} finally {
			setIsRevoking(false);
		}
	};

	const getStatusBadge = () => {
		switch (invitation.status) {
			case "pending":
				return (
					<Badge variant="outline" className="text-xs">
						<Clock className="mr-1 size-3" />
						Pending
					</Badge>
				);
			case "accepted":
				return (
					<Badge variant="emerald" className="text-xs">
						Accepted
					</Badge>
				);
			case "revoked":
				return (
					<Badge variant="destructive" className="text-xs">
						Revoked
					</Badge>
				);
			default:
				return null;
		}
	};

	return (
		<div className="flex justify-between items-center px-4 py-3 rounded-lg border transition-colors bg-muted bg-card hover:bg-muted/50">
			<div className="flex gap-3 items-center">
				<Avatar className="size-8">
					<AvatarFallback className="bg-primary/10">
						<User className="size-4" />
					</AvatarFallback>
				</Avatar>

				<div className="flex flex-col min-w-0 leading-none">
					<div className="text-sm font-medium leading-none truncate">
						{invitation.email}
					</div>
					<div className="text-xs text-muted-foreground">
						Invited on{" "}
						{new Date(invitation._creationTime).toLocaleDateString("en-US", {
							month: "short",
							day: "numeric",
							year: "numeric",
							hour: "2-digit",
							minute: "2-digit",
						})}
					</div>
				</div>
			</div>

			<div className="flex gap-3 items-center">
				<Badge variant={isAdmin ? "brand" : "outline"} className="text-xs">
					{isAdmin ? "Admin" : "Member"}
				</Badge>

				{getStatusBadge()}

				{invitation.status === "pending" && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="sm" className="p-0 w-8 h-8">
								<Settings className="size-3.5" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent side="bottom" align="end">
							<DropdownMenuItem
								disabled={isResending}
								onClick={handleResendInvite}
							>
								{isResending ? (
									<Spinner size="xs" />
								) : (
									<Mail className="size-3.5" />
								)}
								Resend Invite
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								disabled={isRevoking}
								onClick={handleRevokeInvite}
								className="text-destructive focus:text-destructive"
							>
								{isRevoking ? (
									<Spinner size="xs" />
								) : (
									<Trash className="size-3.5" />
								)}
								Revoke Invite
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>
		</div>
	);
};
