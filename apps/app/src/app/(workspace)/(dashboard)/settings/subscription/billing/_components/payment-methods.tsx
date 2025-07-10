"use client";

import { api, useAction, useCachedQuery } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	Amex,
	Dinners,
	Discover,
	GenericCard,
	JCB,
	Master,
	Visa,
} from "@firebuzz/ui/icons/card";
import { ExternalLink } from "@firebuzz/ui/icons/lucide";
import { useState } from "react";

export const PaymentMethods = () => {
	const [isCreatingSession, setIsCreatingSession] = useState(false);

	const billingData = useCachedQuery(
		api.collections.stripe.customers.queries.getBillingDataByWorkspaceId,
	);

	const createPortalSession = useAction(
		api.lib.stripe.createPaymentMethodPortalSession,
	);

	const handleManagePaymentMethods = async () => {
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

	const formatExpiryDate = (month: number, year: number) => {
		return `${month.toString().padStart(2, "0")} / ${year.toString().slice(-2)}`;
	};

	const getCardIcon = (brand?: string) => {
		if (!brand) return GenericCard;

		switch (brand.toLowerCase()) {
			case "amex":
			case "american_express":
				return Amex;
			case "diners":
			case "diners_club":
				return Dinners;
			case "discover":
				return Discover;
			case "jcb":
				return JCB;
			case "mastercard":
				return Master;
			case "visa":
				return Visa;
			default:
				return GenericCard;
		}
	};

	if (!billingData) {
		return (
			<div className="flex justify-center items-center p-8">
				<Spinner size="sm" />
			</div>
		);
	}

	const { paymentMethods } = billingData;

	return (
		<div className="p-6 space-y-6 w-full border-b">
			{/* Header */}
			<div>
				<h2 className="text-lg font-semibold">Payment Methods</h2>
				<p className="text-sm text-muted-foreground">
					Check your payment methods and manage it.
				</p>
			</div>

			{/* Payment Methods List */}
			<div className="space-y-4 max-w-2xl">
				{paymentMethods.length === 0 ? (
					<div className="p-6 text-center rounded-lg border bg-muted/50">
						<div className="mx-auto mb-3 size-8 text-muted-foreground">
							<GenericCard />
						</div>

						<p className="text-sm text-muted-foreground">
							No payment methods found. Add a payment method to manage your
							subscription.
						</p>
					</div>
				) : (
					<div className="space-y-3">
						<div className="text-sm font-medium text-muted-foreground">
							Cards ({paymentMethods.length})
						</div>

						{paymentMethods.map((method) => {
							const CardIcon = getCardIcon(method.card?.brand);

							return (
								<div
									key={method._id}
									className="flex justify-between items-center p-4 rounded-lg border bg-muted"
								>
									<div className="flex gap-3 items-center">
										<div className="flex justify-center items-center p-2 w-12 h-8 rounded-md border bg-background">
											<CardIcon />
										</div>

										<div className="space-y-1">
											<div className="flex gap-2 items-center">
												<span className="text-sm font-medium">
													•••• •••• •••• {method.card?.last4}
												</span>

												{method.isDefault && (
													<Badge variant="brand">Default</Badge>
												)}
											</div>

											{method.card?.expMonth && method.card?.expYear && (
												<div className="text-xs text-muted-foreground">
													Expires at{" "}
													{formatExpiryDate(
														method.card.expMonth,
														method.card.expYear,
													)}
												</div>
											)}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}

				{/* Manage Button */}
				<div className="pt-2 w-full">
					<Button
						variant="outline"
						size="sm"
						onClick={handleManagePaymentMethods}
						disabled={isCreatingSession}
						className="flex gap-2 items-center w-full"
					>
						{isCreatingSession ? (
							<Spinner size="xs" />
						) : (
							<>
								<span>Manage Payment Methods</span>
								<ExternalLink className="size-3.5" />
							</>
						)}
					</Button>
				</div>
			</div>
		</div>
	);
};
