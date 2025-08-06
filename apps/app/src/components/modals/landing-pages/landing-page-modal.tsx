"use client";

import { useNewLandingPageModal } from "@/hooks/ui/use-new-landing-page-modal";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { LandingPageForm } from "./landing-page-form";

export const NewLandingPageModal = () => {
	const [state, { closeModal }] = useNewLandingPageModal();

	const isCreate = state?.createLandingPage ?? false;
	const isOpen = isCreate;

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(value) => {
				if (!value) {
					closeModal();
				}
			}}
		>
			<DialogContent
				onOpenAutoFocus={(e) => e.preventDefault()}
				className="sm:max-w-xl w-full flex flex-col !gap-0 !p-0"
			>
				<DialogHeader className="px-4 py-4 border-b">
					<div className="w-full">
						<DialogTitle>Create Landing Page</DialogTitle>
						<DialogDescription>
							Create a new landing page to showcase your content
						</DialogDescription>
					</div>
				</DialogHeader>

				<LandingPageForm
					onSuccess={closeModal}
					defaultCampaignId={state?.campaignId}
				/>
			</DialogContent>
		</Dialog>
	);
};
