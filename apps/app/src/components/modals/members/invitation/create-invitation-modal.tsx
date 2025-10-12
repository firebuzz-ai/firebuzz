"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { useInviteMemberModal } from "@/hooks/ui/use-invite-member-modal";
import { InvitationForm } from "./invitation-form";

export const InviteMemberModal = () => {
	const [state, setState] = useInviteMemberModal();

	const handleClose = () => {
		setState(null);
	};

	return (
		<Dialog
			open={state?.create ?? false}
			onOpenChange={(value) => {
				setState(
					value
						? {
								create: true,
							}
						: null,
				);
			}}
		>
			<DialogContent
				onOpenAutoFocus={(e) => e.preventDefault()}
				className="sm:max-w-xl w-full flex flex-col !gap-0 !p-0"
			>
				<DialogHeader className="px-4 py-4 border-b">
					<div className="w-full">
						<DialogTitle>Invite Team Member</DialogTitle>
						<DialogDescription>
							Send an invitation to add a new member to your workspace. They'll
							receive an email with instructions to join.
						</DialogDescription>
					</div>
				</DialogHeader>

				<InvitationForm onSuccess={handleClose} />
			</DialogContent>
		</Dialog>
	);
};
