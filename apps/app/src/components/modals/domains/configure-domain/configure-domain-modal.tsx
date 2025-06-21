"use client";

import { useConfigureDomainModal } from "@/hooks/ui/use-configure-domain-modal";
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

				<div className="p-4 space-y-6">
					{/* CNAME Configuration */}
					<div className="space-y-4">
						<div className="text-sm text-muted-foreground">
							Add this{" "}
							<Badge className="text-brand" variant="outline">
								CNAME
							</Badge>{" "}
							record to your <Badge variant="outline">DNS</Badge> provider to
							point your domain to our service.
						</div>

						<div className="flex gap-4 items-center">
							<div className="flex-1 space-y-2">
								<Label htmlFor="cname-name">Name</Label>
								<div className="relative">
									<ReadonlyInputWithClipboard value={domain.hostname} />
								</div>
							</div>

							<div className="flex-1 space-y-2">
								<Label htmlFor="cname-value">Value</Label>
								<div className="relative">
									<ReadonlyInputWithClipboard value="customers.frbzz.com" />
								</div>
							</div>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
