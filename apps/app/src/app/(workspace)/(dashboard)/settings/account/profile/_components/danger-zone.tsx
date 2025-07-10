"use client";

import { DeletionDialog } from "@/components/modals/confirmation/deletion-dialog";
import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { Button } from "@firebuzz/ui/components/ui/button";
import { useState } from "react";

export const AccountDangerZone = () => {
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const handleDeleteAccount = async () => {
		try {
			setIsDeleting(true);
			// TODO: Implement account deletion logic
			console.log("Deleting account...");
			await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate API call
			setIsDeleteDialogOpen(false);
		} catch (error) {
			console.error("Failed to delete account:", error);
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
