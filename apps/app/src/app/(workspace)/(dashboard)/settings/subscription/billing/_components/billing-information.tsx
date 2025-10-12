"use client";

import { api, useAction, useCachedQuery } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Label } from "@firebuzz/ui/components/ui/label";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
	Building,
	CheckCircle,
	Circle,
	ExternalLink,
	Loader2,
	Receipt,
	XCircle,
} from "@firebuzz/ui/icons/lucide";
import { useState } from "react";
import { useWorkspace } from "@/hooks/auth/use-workspace";

export const BillingInformation = () => {
	const { currentWorkspace } = useWorkspace();
	const [isCreatingSession, setIsCreatingSession] = useState(false);

	const billingData = useCachedQuery(
		api.collections.stripe.customers.queries.getBillingDataByWorkspaceId,
	);

	const createPortalSession = useAction(
		api.lib.stripe.createPaymentMethodPortalSession,
	);

	const handleManageBillingInfo = async () => {
		if (!currentWorkspace?._id) return;

		setIsCreatingSession(true);
		try {
			const portalUrl = await createPortalSession();

			// Redirect to Stripe portal
			window.location.href = portalUrl;
		} catch (error) {
			console.error("Failed to create portal session:", error);
		} finally {
			setIsCreatingSession(false);
		}
	};

	const formatAddress = (address: {
		line1?: string;
		line2?: string;
		city?: string;
		state?: string;
		postal_code?: string;
		country?: string;
	}) => {
		if (!address) return "";

		const parts = [
			address.line1,
			address.line2,
			address.city,
			address.state,
			address.postal_code,
			address.country,
		].filter(Boolean);

		return parts.join(", ");
	};

	const formatTaxIdType = (type: string) => {
		return type.toUpperCase().replace(/_/g, " ");
	};

	const getVerificationIcon = (status: string) => {
		switch (status) {
			case "verified":
				return <CheckCircle className="size-3.5 text-emerald-500" />;
			case "pending":
				return <Loader2 className="size-3.5 text-yellow-500" />;
			case "unverified":
				return <XCircle className="size-3.5 text-red-500" />;
			default:
				return <Circle className="size-3.5 text-muted-foreground" />;
		}
	};

	if (!billingData) {
		return (
			<div className="flex justify-center items-center p-8">
				<Spinner size="sm" />
			</div>
		);
	}

	const { customer, taxIds } = billingData;
	const address = customer?.address ?? {};
	const formattedAddress = formatAddress(address || {});

	return (
		<div className="p-6 space-y-6 w-full border-b">
			{/* Header */}
			<div>
				<h2 className="text-lg font-semibold">Billing Information</h2>
				<p className="text-sm text-muted-foreground">
					Check your past invoices and download it.
				</p>
			</div>

			<div className="space-y-6 max-w-2xl">
				{/* Customer Information */}
				<div className="space-y-4">
					<div className="flex gap-2 items-center text-sm font-medium text-muted-foreground">
						<Building className="size-4" />
						Customer Details
					</div>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="customer-name">Name</Label>
							<Input
								id="customer-name"
								value={customer?.name || ""}
								placeholder="No name provided"
								readOnly
								className="bg-muted"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="customer-email">Email</Label>
							<Input
								id="customer-email"
								value={customer?.email || ""}
								placeholder="No email provided"
								readOnly
								className="bg-muted"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="customer-phone">Phone</Label>
							<Input
								id="customer-phone"
								value={customer?.phone || ""}
								placeholder="No phone provided"
								readOnly
								className="bg-muted"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="customer-country">Country</Label>
							<Input
								id="customer-country"
								value={address?.country || ""}
								placeholder="No country provided"
								readOnly
								className="bg-muted"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="customer-address">Billing Address</Label>
						<Textarea
							id="customer-address"
							value={formattedAddress}
							placeholder="No billing address provided"
							readOnly
							className="bg-muted min-h-[80px] resize-none"
						/>
					</div>
				</div>

				{/* Tax IDs */}
				<div className="space-y-4">
					<div className="text-sm font-medium text-muted-foreground">
						Tax IDs ({taxIds.length})
					</div>

					{taxIds.length === 0 ? (
						<div className="p-6 text-center rounded-lg border bg-muted/50">
							<Receipt className="mx-auto mb-3 size-8 text-muted-foreground" />
							<p className="text-sm text-muted-foreground">
								No tax IDs found. Add a tax ID for compliance and tax reporting.
							</p>
						</div>
					) : (
						<div className="space-y-3">
							{taxIds.map((taxId) => (
								<div
									key={taxId._id}
									className="flex justify-between items-center p-4 rounded-lg border bg-muted"
								>
									<div className="flex gap-3 items-center">
										<div className="p-2 rounded-md border bg-background">
											<Receipt className="size-4" />
										</div>

										<div className="space-y-1">
											<div className="flex gap-2 items-center">
												<span className="text-sm font-medium text-primary">
													{taxId.value}
												</span>
												<Badge variant="outline">
													{taxId.type ? formatTaxIdType(taxId.type) : "Unknown"}
												</Badge>
											</div>
										</div>
									</div>
									{taxId.verification?.status && (
										<Tooltip>
											<TooltipTrigger className="flex justify-center items-center rounded-md border cursor-default size-6">
												{getVerificationIcon(taxId.verification.status)}
											</TooltipTrigger>
											<TooltipContent className="capitalize">
												Verification Status: {taxId.verification.status}
											</TooltipContent>
										</Tooltip>
									)}
								</div>
							))}
						</div>
					)}
				</div>

				{/* Manage Button */}
				<div className="pt-2 w-full">
					<Button
						variant="outline"
						size="sm"
						onClick={handleManageBillingInfo}
						disabled={isCreatingSession}
						className="flex gap-2 items-center w-full"
					>
						{isCreatingSession ? (
							<Spinner size="xs" />
						) : (
							<>
								<span>Manage Billing Information</span>
								<ExternalLink className="size-3.5" />
							</>
						)}
					</Button>
				</div>
			</div>
		</div>
	);
};
