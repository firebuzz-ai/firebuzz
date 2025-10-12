"use client";

import { ReadonlyInputWithClipboard } from "@firebuzz/ui/components/reusable/readonly-input-with-clipboard";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { Label } from "@firebuzz/ui/components/ui/label";
import { useConfigureDomainModal } from "@/hooks/ui/use-configure-domain-modal";

export const ConfigureDomainModal = () => {
	const [state, setState] = useConfigureDomainModal();

	const domain = state?.domain;
	const isOpen = state?.isOpen ?? false;

	const handleClose = () => {
		setState(null);
	};

	if (!domain) return null;

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-2xl w-full flex flex-col !gap-0 !p-0">
				<DialogHeader className="px-4 py-4 border-b">
					<div className="w-full">
						<DialogTitle>Configure Domain</DialogTitle>
						<DialogDescription>
							Configure DNS settings for <strong>{domain.hostname}</strong>
						</DialogDescription>
					</div>
				</DialogHeader>

				<div className="">
					{/* Verification Record */}
					{domain.verificationRecord.map((record) => (
						<div
							key={record.name}
							className="flex flex-col gap-4 items-stretch p-4 border-b last:border-b-0"
						>
							<div className="flex gap-4 items-center">
								<div className="flex flex-col gap-2">
									<Label htmlFor="cname-name">Type</Label>
									<Badge
										className="h-8 uppercase text-brand bg-muted"
										variant="outline"
									>
										{record.type}
									</Badge>
								</div>
								<div className="flex flex-col flex-1 gap-2">
									<Label htmlFor="cname-name">Name</Label>
									<div className="relative">
										<ReadonlyInputWithClipboard value={record.name} />
									</div>
								</div>

								<div className="flex flex-col flex-1 gap-2">
									<Label htmlFor="cname-value">Value</Label>
									<div className="relative">
										<ReadonlyInputWithClipboard value={record.value} />
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
};
