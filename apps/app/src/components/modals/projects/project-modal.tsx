"use client";

import { useProjectModal } from "@/hooks/ui/use-project-modal";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { ProjectForm } from "./project-form";

export const ProjectModal = () => {
	const [state, setState] = useProjectModal();

	const handleClose = () => {
		setState(null);
	};

	const isCreate = state?.create ?? false;
	const isEdit = !!state?.edit;
	const isOpen = isCreate || isEdit;

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
						<DialogTitle>
							{isCreate ? "Create Project" : "Edit Project"}
						</DialogTitle>
						<DialogDescription>
							{isCreate
								? "Add a new project to manage your content and campaigns"
								: "Update your project details"}
						</DialogDescription>
					</div>
				</DialogHeader>

				<ProjectForm
					onSuccess={handleClose}
					project={state?.edit?.project}
					mode={isCreate ? "create" : "edit"}
				/>
			</DialogContent>
		</Dialog>
	);
};
