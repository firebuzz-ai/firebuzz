"use client";

import { useConfigureProjectDomainModal } from "@/hooks/ui/use-configure-project-domain-modal";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { ConfigureProjectDomainForm } from "./configure-project-domain-form";

export const ConfigureProjectDomainModal = () => {
	const [modal, setModal] = useConfigureProjectDomainModal();

	const handleClose = () => {
		setModal({
			configure: false,
			domain: null,
		});
	};

	if (!modal.domain) {
		return null;
	}

	return (
		<Dialog
			open={modal.configure}
			onOpenChange={(value) => {
				if (!value) {
					handleClose();
				}
			}}
		>
			<DialogContent
				onOpenAutoFocus={(e) => e.preventDefault()}
				className="sm:max-w-xl w-full flex flex-col !gap-0 !p-0"
			>
				<DialogHeader className="px-4 py-4 border-b">
					<div className="w-full">
						<DialogTitle>Configure Project Domain</DialogTitle>
						<DialogDescription>
							Update your project domain subdomain settings
						</DialogDescription>
					</div>
				</DialogHeader>

				<ConfigureProjectDomainForm
					domain={modal.domain}
					onClose={handleClose}
				/>
			</DialogContent>
		</Dialog>
	);
};
