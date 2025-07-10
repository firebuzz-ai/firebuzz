"use client";

import { useOrganizationList } from "@clerk/nextjs";
import type { UserOrganizationInvitationResource } from "@clerk/types";
import { api, useMutation } from "@firebuzz/convex";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@firebuzz/ui/components/ui/avatar";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Building, CheckCheck } from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { useCallback, useState } from "react";

export const WorkspaceInvitations = () => {
	const [isJoining, setIsJoining] = useState(false);

	const updateUserCurrentWorkspace = useMutation(
		api.collections.users.mutations.updateCurrentWorkspaceByExternalId,
	);

	const { userInvitations, userMemberships } = useOrganizationList({
		userInvitations: {
			infinite: true,
			status: "pending",
			pageSize: 10,
		},
		userMemberships: true,
	});

	const handleAcceptInvitation = useCallback(
		async (invitation: UserOrganizationInvitationResource) => {
			try {
				setIsJoining(true);
				toast.loading("Accepting invitation...", { id: "accept-invitation" });

				await invitation.accept();

				if (userMemberships?.revalidate) {
					const membershipPromise = userMemberships.revalidate();
					const updatePromise = updateUserCurrentWorkspace({
						currentWorkspaceExternalId: invitation.publicOrganizationData.id,
					});

					await Promise.all([membershipPromise, updatePromise]);
				}

				toast.success("Invitation accepted!", { id: "accept-invitation" });
				setIsJoining(false);
			} catch (error) {
				console.error("Error accepting invitation:", error);
				toast.error("Failed to accept invitation", { id: "accept-invitation" });
				setIsJoining(false);
			}
		},
		[userMemberships, updateUserCurrentWorkspace],
	);

	return (
		<div className="p-6 space-y-6">
			<div>
				<h1 className="text-lg font-semibold">Workspace Invitations</h1>
				<p className="text-sm text-muted-foreground">
					Accept invitations to join new workspaces.
				</p>
			</div>

			<div className="space-y-2 max-w-2xl">
				<div className="flex justify-between items-center">
					<h2 className="font-medium">
						Pending Invitations{" "}
						<span className="text-sm text-muted-foreground">
							({userInvitations?.data?.length || 0})
						</span>
					</h2>
				</div>

				<div className="space-y-2">
					{userInvitations?.data && userInvitations.data.length > 0 ? (
						userInvitations.data.map((invitation) => (
							<div
								key={invitation.id}
								className="flex justify-between items-center px-4 py-3 rounded-lg border transition-colors bg-card hover:bg-muted/50"
							>
								<div className="flex gap-3 items-center">
									<Avatar className="border size-8">
										<AvatarImage
											src={invitation.publicOrganizationData.imageUrl}
											alt={invitation.publicOrganizationData.name}
										/>
										<AvatarFallback className="bg-primary/10">
											{invitation.publicOrganizationData.name?.[0]?.toUpperCase() || (
												<Building className="size-4" />
											)}
										</AvatarFallback>
									</Avatar>

									<div className="flex flex-col min-w-0 leading-none">
										<span className="text-sm font-medium truncate">
											{invitation.publicOrganizationData.name}
										</span>
										<span className="text-xs truncate text-muted-foreground">
											Invited by {invitation.publicOrganizationData.name}
										</span>
									</div>
								</div>

								<div className="flex gap-2 items-center">
									<Badge variant="outline" className="text-xs">
										Pending
									</Badge>
									<Button
										size="sm"
										onClick={() => handleAcceptInvitation(invitation)}
										disabled={isJoining}
									>
										{isJoining ? (
											<div className="flex gap-2 items-center">
												<Spinner size="xs" />
												Accepting...
											</div>
										) : (
											<>
												<CheckCheck className="size-3.5" />
												Accept
											</>
										)}
									</Button>
								</div>
							</div>
						))
					) : (
						<div className="p-4 py-8 leading-none text-center rounded-lg border bg-muted">
							<p>No pending invitations</p>
							<p className="text-sm text-muted-foreground">
								You don't have any workspace invitations at the moment.
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
