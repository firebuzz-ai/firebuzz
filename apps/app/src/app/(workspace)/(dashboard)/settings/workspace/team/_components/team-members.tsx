"use client";

import { useSubscription } from "@/hooks/auth/use-subscription";
import { useInviteMemberModal } from "@/hooks/ui/use-invite-member-modal";
import type { Doc } from "@firebuzz/convex";
import { MemberListItem } from "./member-list-item";

export const TeamMembers = ({
	members,
}: {
	members: (Doc<"members"> & {
		user: Doc<"users"> | null;
	})[];
}) => {
	const { seatLimit } = useSubscription();
	const [, setInviteModal] = useInviteMemberModal();

	return (
		<div className="p-6 space-y-6 border-b">
			{/* Header */}
			<div>
				<h1 className="text-lg font-semibold">Team</h1>
				<p className="text-sm text-muted-foreground">
					See all team members and their roles or invite new members.
				</p>
			</div>

			{/* All Members Section */}
			<div className="space-y-2 max-w-2xl">
				<div className="flex justify-between items-center">
					<h2 className="font-medium">
						Seats{" "}
						<span className="text-sm text-muted-foreground">
							({members?.length || 0}/{seatLimit})
						</span>
					</h2>
				</div>

				<div className="space-y-2">
					{members && members.length > 0 ? (
						members.map((member) => (
							<MemberListItem key={member._id} member={member} />
						))
					) : (
						<div className="py-4 text-sm text-muted-foreground">
							No team members yet.{" "}
							<button
								type="button"
								onClick={() => setInviteModal({ create: true })}
								className="text-foreground hover:underline"
							>
								Invite New Member
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
