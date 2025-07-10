"use client";

import { DeletionDialog } from "@/components/modals/confirmation/deletion-dialog";
import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { Button } from "@firebuzz/ui/components/ui/button";
import { useState } from "react";

export const DangerZone = () => {
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const handleDeleteWorkspace = async () => {
		try {
			setIsDeleting(true);
			// TODO: Implement workspace deletion logic
			console.log("Deleting workspace...");
			await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate API call
			setIsDeleteDialogOpen(false);
		} catch (error) {
			console.error("Failed to delete workspace:", error);
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
						Delete your workspace and all its data.
					</p>
				</div>

				<Button
					variant="destructive"
					size="sm"
					className="w-full"
					onClick={() => setIsDeleteDialogOpen(true)}
				>
					Delete Workspace
				</Button>

				<InfoBox variant="destructive">
					<p>
						Deleting your workspace will remove all your data and cannot be
						recovered.
					</p>
				</InfoBox>
			</div>

			<DeletionDialog
				isOpen={isDeleteDialogOpen}
				onClose={() => setIsDeleteDialogOpen(false)}
				onConfirm={handleDeleteWorkspace}
				title="Delete Workspace"
				description="Are you sure you want to delete this workspace?"
				confirmationText="DELETE MY WORKSPACE"
				isLoading={isDeleting}
			/>
		</div>
	);
};
