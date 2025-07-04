"use client";

import { EmptyState } from "@/components/reusables/empty-state";
import { useSubscription } from "@/hooks/auth/use-subscription";
import { api, useCachedRichQuery } from "@firebuzz/convex";

import { InviteMemberModal } from "@/components/modals/members/invitation/create-invitation-modal";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Users } from "@firebuzz/ui/icons/lucide";
import { Invitations } from "./invitations";
import { TeamMembers } from "./team-members";

export const Team = () => {
	const { isTeamPlan, isLoading: isSubscriptionLoading } = useSubscription();

	const { data: members, isPending: isMembersLoading } = useCachedRichQuery(
		api.collections.members.queries.getByWorkspace,
		isTeamPlan ? undefined : "skip",
	);

	if (isSubscriptionLoading) {
		return (
			<div className="flex flex-1 justify-center items-center w-full h-full">
				<Spinner size="sm" />
			</div>
		);
	}

	// Not a team plan - show upgrade empty state
	if (!isTeamPlan) {
		return (
			<div className="flex overflow-hidden relative flex-col flex-1 max-h-full">
				<div className="overflow-y-auto flex-1 select-none">
					<EmptyState
						icon={<Users className="size-6" />}
						title="Team collaboration requires upgrade"
						description="Invite team members and collaborate on projects together. Upgrade to a Team plan to unlock team features."
						buttonTitle="Upgrade to Team"
						buttonShortcut="⌘U"
						onClick={() => {
							// TODO: Implement upgrade logic
							console.log("Upgrade to Team clicked");
						}}
					/>
				</div>
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
		<div className="flex flex-col flex-1 h-full max-h-full overflow-y-auto">
			<TeamMembers members={members ?? []} />
			<Invitations />
			{/* Modals */}
			<InviteMemberModal />
		</div>
	);
};
