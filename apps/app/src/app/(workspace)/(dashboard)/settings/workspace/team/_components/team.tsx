"use client";

import { api, useCachedRichQuery } from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";

import { InviteMemberModal } from "@/components/modals/members/invitation/create-invitation-modal";
import { useSubscription } from "@/hooks/auth/use-subscription";
import { Invitations } from "./invitations";
import { TeamMembers } from "./team-members";

export const Team = () => {
	const { isLoading: isSubscriptionLoading } = useSubscription();

	const { data: members, isPending: isMembersLoading } = useCachedRichQuery(
		api.collections.members.queries.getByWorkspace,
	);

	if (isSubscriptionLoading) {
		return (
			<div className="flex flex-1 justify-center items-center w-full h-full">
				<Spinner size="sm" />
			</div>
		);
	}

	// Loading state
	if (isMembersLoading) {
		return (
			<div className="flex flex-1 justify-center items-center w-full h-full">
				<Spinner size="sm" />
			</div>
		);
	}

	return (
		<div className="flex overflow-y-auto flex-col flex-1 h-full max-h-full">
			<TeamMembers members={members ?? []} />
			<Invitations />
			{/* Modals */}
			<InviteMemberModal />
		</div>
	);
};
