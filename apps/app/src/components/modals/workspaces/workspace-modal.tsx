"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { useNewWorkspaceModal } from "@/hooks/ui/use-new-workspace-modal";
import { WorkspaceForm } from "./workspace-form";

export const NewWorkspaceModal = () => {
	const [state, setState] = useNewWorkspaceModal();

	const handleClose = () => {
		setState(null);
	};

	const isCreate = state?.create ?? false;
	const isOpen = isCreate;

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(value) => {
				if (!value) {
					setState(null);
				}
			}}
		>
			<DialogContent
				onOpenAutoFocus={(e) => e.preventDefault()}
				className="sm:max-w-xl w-full flex flex-col !gap-0 !p-0"
			>
				<DialogHeader className="px-4 py-4 border-b">
					<div className="w-full">
						<DialogTitle>Create Workspace</DialogTitle>
						<DialogDescription>
							Add a new workspace to organize your projects and teams
						</DialogDescription>
					</div>
				</DialogHeader>

				<WorkspaceForm onSuccess={handleClose} />
			</DialogContent>
		</Dialog>
	);
};
