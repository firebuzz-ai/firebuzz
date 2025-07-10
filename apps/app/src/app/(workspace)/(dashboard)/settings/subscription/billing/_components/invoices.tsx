"use client";

import { api, useCachedQuery } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Copy, Download, FileText } from "@firebuzz/ui/icons/lucide";

export const Invoices = () => {
	const billingData = useCachedQuery(
		api.collections.stripe.customers.queries.getBillingDataByWorkspaceId,
	);

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("en-US", {
			day: "2-digit",
			month: "short",
			year: "2-digit",
		});
	};

	const formatAmount = (amount: number, currency: string) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: currency.toUpperCase(),
		}).format(amount / 100);
	};

	const getStatusVariant = (status: string) => {
		switch (status) {
			case "paid":
				return "emerald";
			case "open":
				return "secondary";
			case "draft":
				return "outline";
			case "uncollectible":
			case "void":
				return "destructive";
			default:
				return "outline";
		}
	};

	const handleDownload = (invoice: {
		invoicePdf?: string;
		hostedInvoiceUrl?: string;
	}) => {
		if (invoice.invoicePdf) {
			window.open(invoice.invoicePdf, "_blank");
		} else if (invoice.hostedInvoiceUrl) {
			window.open(invoice.hostedInvoiceUrl, "_blank");
		}
	};

	const handleCopyInvoiceId = (invoiceId: string) => {
		navigator.clipboard.writeText(invoiceId);
	};

	if (!billingData) {
		return (
			<div className="flex justify-center items-center p-8">
				<Spinner size="sm" />
			</div>
		);
	}

	const { invoices } = billingData;

	return (
		<div className="p-6 space-y-6 w-full">
			{/* Header */}
			<div>
				<h2 className="text-lg font-semibold">Invoice History</h2>
				<p className="text-sm text-muted-foreground">
					Check your past invoices and download it.
				</p>
			</div>

			<div className="space-y-4 max-w-2xl">
				{invoices.length === 0 ? (
					<div className="p-6 text-center rounded-lg border bg-muted/50">
						<FileText className="mx-auto mb-3 size-8 text-muted-foreground" />
						<p className="text-sm text-muted-foreground">
							No invoices found. Invoices will appear here once you have an
							active subscription.
						</p>
					</div>
				) : (
					<div className="space-y-3">
						<div className="text-sm font-medium text-muted-foreground">
							Invoices ({invoices.length})
						</div>

						{invoices.map((invoice) => {
							const invoiceDate =
								invoice.paidAt || invoice.dueDate || invoice.updatedAt;
							const canDownload =
								invoice.invoicePdf || invoice.hostedInvoiceUrl;

							return (
								<div
									key={invoice._id}
									className="flex justify-between items-center p-4 rounded-lg border bg-muted"
								>
									<div className="flex gap-3 items-center">
										<div className="flex gap-2 items-center">
											<Badge variant={getStatusVariant(invoice.status)}>
												{invoice.status.charAt(0).toUpperCase() +
													invoice.status.slice(1)}
											</Badge>
										</div>

										<div className="space-y-1">
											<div className="flex gap-2 items-center">
												<span className="text-sm">
													{invoiceDate && formatDate(invoiceDate)}
												</span>

												<span className="text-sm font-medium">
													{formatAmount(invoice.amountPaid, invoice.currency)}
												</span>

												<div className="flex gap-1 items-center">
													<span className="font-mono text-sm text-muted-foreground">
														{invoice.stripeInvoiceId}
													</span>
													<Tooltip>
														<TooltipTrigger asChild>
															<Button
																variant="ghost"
																size="iconXs"
																onClick={() =>
																	handleCopyInvoiceId(invoice.stripeInvoiceId)
																}
															>
																<Copy className="size-3.5" />
															</Button>
														</TooltipTrigger>
														<TooltipContent>Copy</TooltipContent>
													</Tooltip>
												</div>
											</div>
										</div>
									</div>

									<div className="flex gap-2 items-center">
										{canDownload && (
											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														variant="ghost"
														size="iconXs"
														onClick={() => handleDownload(invoice)}
													>
														<Download className="size-3.5" />
													</Button>
												</TooltipTrigger>
												<TooltipContent>Download</TooltipContent>
											</Tooltip>
										)}
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};
