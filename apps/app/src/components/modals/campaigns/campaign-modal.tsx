"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { useNewCampaignModal } from "@/hooks/ui/use-new-campaign-modal";
import { CampaignForm } from "./campaign-form";

export const NewCampaignModal = () => {
	const [state, { closeModal }] = useNewCampaignModal();

	const isCreate = state?.createCampaign ?? false;
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
						<DialogTitle>Create Campaign</DialogTitle>
						<DialogDescription>
							Create a new campaign to manage your marketing efforts
						</DialogDescription>
					</div>
				</DialogHeader>

				<CampaignForm
					onSuccess={closeModal}
					defaultProjectId={state?.projectId}
				/>
			</DialogContent>
		</Dialog>
	);
};
