"use client";
import { useNewDomainModal } from "@/hooks/ui/use-new-domain-modal";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { DomainForm } from "./domain-form";

export const NewDomainModal = () => {
	const [state, setState] = useNewDomainModal();

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
				className="sm:max-w-lg w-full flex flex-col !gap-0 !p-0"
			>
				<DialogHeader className="px-4 py-4 border-b">
					<div className="w-full">
						<DialogTitle>Add Custom Domain</DialogTitle>
						<DialogDescription>
							Add a custom domain to your workspace for your landing pages.
						</DialogDescription>
					</div>
				</DialogHeader>

				<DomainForm onSuccess={handleClose} />
			</DialogContent>
		</Dialog>
	);
};
