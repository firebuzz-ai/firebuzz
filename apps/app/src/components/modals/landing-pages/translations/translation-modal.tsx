"use client";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { Languages } from "@firebuzz/ui/icons/lucide";
import { useNewTranslationModal } from "@/hooks/ui/use-new-translation-modal";
import { TranslationForm } from "./translation-form";

export const TranslationModal = () => {
	const [state, { closeModal }] = useNewTranslationModal();

	if (!state?.createTranslation || !state.originalLandingPageId) {
		return null;
	}

	return (
		<Dialog open={state.createTranslation} onOpenChange={closeModal}>
			<DialogContent className="max-w-xl max-h-[90vh] p-0">
				<DialogHeader className="flex flex-row gap-3 items-center p-6 pb-0">
					<div className="p-2 rounded-lg border bg-brand/10 border-brand text-brand">
						<Languages className="size-4" />
					</div>
					<div>
						<DialogTitle>Create Translation</DialogTitle>
						<p className="text-sm text-muted-foreground">
							Create a new language variant for this landing page
						</p>
					</div>
				</DialogHeader>
				<TranslationForm
					originalLandingPageId={state.originalLandingPageId}
					onSuccess={closeModal}
				/>
			</DialogContent>
		</Dialog>
	);
};
