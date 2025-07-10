"use client";

import { useInviteMemberModal } from "@/hooks/ui/use-invite-member-modal";
import { api, useCachedRichQuery } from "@firebuzz/convex";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { ChevronLeft, ChevronRight } from "@firebuzz/ui/icons/lucide";
import { useState } from "react";
import { InvitationListItem } from "./invitation-list-item";

export const Invitations = () => {
	const [, setInviteModal] = useInviteMemberModal();
	const [cursor, setCursor] = useState<string | null>(null);
	const [previousCursors, setPreviousCursors] = useState<string[]>([]);

	const { data: invitations, isPending: isLoading } = useCachedRichQuery(
		api.collections.invitations.queries.getPaginated,
		{
			paginationOpts: { numItems: 5, cursor },
			sortOrder: "desc",
		},
	);

	const acceptedInvitations = invitations?.page.filter(
		(invitation) => invitation.status === "accepted",
	);

	const handleNext = () => {
		if (invitations?.continueCursor) {
			setPreviousCursors((prev) => [...prev, cursor ?? ""]);
			setCursor(invitations.continueCursor);
		}
	};

	const handlePrevious = () => {
		if (previousCursors.length > 0) {
			const newCursors = [...previousCursors];
			const previousCursor = newCursors.pop();
			setPreviousCursors(newCursors);
			setCursor(previousCursor === "" ? null : (previousCursor ?? null));
		}
	};

	const canGoNext =
		invitations && !invitations.isDone && invitations.continueCursor;
	const canGoPrevious = previousCursors.length > 0;

	// Determine if we're in a paginated state (have navigated from first page)
	const isInPaginatedState = canGoPrevious;

	// Determine if there are no invitations at all vs no invitations on current page
	const hasNoInvitationsAtAll =
		!isInPaginatedState &&
		invitations?.page.length === 0 &&
		invitations?.isDone;
	const hasNoInvitationsOnCurrentPage =
		isInPaginatedState && invitations?.page.length === 0;

	if (isLoading) {
		return (
			<div className="flex flex-1 justify-center items-center w-full h-full">
				<Spinner size="sm" />
			</div>
		);
	}

	return (
		<div className="p-6 space-y-6 border-b">
			{/* Header */}
			<div>
				<h1 className="text-lg font-semibold">Invitations</h1>
				<p className="text-sm text-muted-foreground">
					See all invitations and their status.
				</p>
			</div>

			{/* Content */}
			<div className="space-y-2 max-w-2xl">
				<div className="flex justify-between items-center">
					<h2 className="font-medium">
						Invitations{" "}
						<span className="text-sm text-muted-foreground">
							({acceptedInvitations?.length || 0} accepted)
						</span>
					</h2>
				</div>

				<div className="space-y-2">
					{/* State 1: No invitations exist at all */}
					{hasNoInvitationsAtAll ? (
						<Button
							variant="outline"
							size="sm"
							className="w-full bg-muted hover:bg-muted/50"
							onClick={() => setInviteModal({ create: true })}
						>
							Invite Member <ButtonShortcut>⌘N</ButtonShortcut>
						</Button>
					) : (
						/* State 2: Invitations exist (show pagination controls) */
						<>
							{/* Show invitations if any on current page */}
							{invitations?.page.map((invitation) => (
								<InvitationListItem
									key={invitation._id}
									invitation={invitation}
								/>
							))}

							{/* Show message if no invitations on current page due to pagination */}
							{hasNoInvitationsOnCurrentPage && (
								<div className="p-4 py-8 leading-none text-center rounded-lg border bg-muted">
									<p>No more invitations on this page.</p>
									<p className="text-sm text-muted-foreground">
										Please go back to see previous invitations.
									</p>
								</div>
							)}
						</>
					)}
				</div>

				{/* Pagination Controls - Show when invitations exist and we have navigation options */}
				{!hasNoInvitationsAtAll && (canGoNext || canGoPrevious) && (
					<div className="flex gap-2 justify-between items-center pt-4">
						<Button
							variant="outline"
							size="sm"
							onClick={handlePrevious}
							disabled={!canGoPrevious}
						>
							<ChevronLeft className="w-4 h-4" />
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleNext}
							disabled={!canGoNext}
						>
							Next
							<ChevronRight className="w-4 h-4" />
						</Button>
					</div>
				)}
			</div>
		</div>
	);
};
