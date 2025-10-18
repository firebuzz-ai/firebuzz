"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { useRenameLandingPageModal } from "@/hooks/ui/use-rename-landing-page-modal";
import { RenameLandingPageForm } from "./rename-form";

export const RenameLandingPageModal = () => {
	const [state, setState] = useRenameLandingPageModal();

	const isOpen = !!state;

	const handleClose = () => {
		setState(null);
	};

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
				className="sm:max-w-md w-full flex flex-col !gap-0 !p-0"
			>
				<DialogHeader className="px-4 py-4 border-b">
					<div className="w-full">
						<DialogTitle>Rename Landing Page</DialogTitle>
						<DialogDescription>
							Update the name of your landing page
						</DialogDescription>
					</div>
				</DialogHeader>

				{state && (
					<RenameLandingPageForm
						landingPageId={state.landingPageId}
						currentTitle={state.currentTitle}
						onSuccess={handleClose}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
};
