"use client";

import { useAuth } from "@clerk/nextjs";
import { api, ConvexError, useMutation } from "@firebuzz/convex";
import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { Button } from "@firebuzz/ui/components/ui/button";
import { toast } from "@firebuzz/ui/lib/utils";
import { useState } from "react";
import { DeletionDialog } from "@/components/modals/confirmation/deletion-dialog";
import { useRouterContext } from "@/components/providers/workspace/router";

export const AccountDangerZone = () => {
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const { setIsCheckDone } = useRouterContext();
	const { signOut } = useAuth();

	const deleteUserMutation = useMutation(
		api.collections.users.mutations.deleteUserFromClerk,
	);

	const handleDeleteAccount = async () => {
		try {
			setIsDeleting(true);

			await deleteUserMutation();

			await signOut();

			setIsCheckDone(false); // Show global loading indicator

			setIsDeleteDialogOpen(false);
		} catch (error) {
			console.error("Failed to delete account:", error);
			if (error instanceof ConvexError) {
				toast.error(error.data);
			}
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<div className="p-6 w-full border-b max-h-min">
			<div className="space-y-6 max-w-xl">
				{/* Header */}
				<div>
					<h1 className="text-lg font-semibold">Danger Zone</h1>
					<p className="text-sm text-muted-foreground">
						Delete your account and all your data.
					</p>
				</div>

				<Button
					variant="destructive"
					size="sm"
					className="w-full"
					onClick={() => setIsDeleteDialogOpen(true)}
				>
					Delete Account
				</Button>

				<InfoBox variant="destructive">
					<p>
						Deleting your account will remove all your data, workspaces, and
						cannot be recovered. This action affects all workspaces you own.
					</p>
				</InfoBox>
			</div>

			<DeletionDialog
				isOpen={isDeleteDialogOpen}
				onClose={() => setIsDeleteDialogOpen(false)}
				onConfirm={handleDeleteAccount}
				title="Delete Account"
				description="Are you sure you want to delete your account?"
				confirmationText="DELETE MY ACCOUNT"
				isLoading={isDeleting}
			/>
		</div>
	);
};
