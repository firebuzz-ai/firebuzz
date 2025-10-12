"use client";

import { api, useAction } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { AlertTriangle, Calendar, Shield } from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { useState } from "react";
import { useSubscription } from "@/hooks/auth/use-subscription";

interface CancelSubscriptionModalProps {
	isOpen: boolean;
	onClose: () => void;
	planName: string;
}

export const CancelSubscriptionModal = ({
	isOpen,
	onClose,
	planName,
}: CancelSubscriptionModalProps) => {
	const [isLoading, setIsLoading] = useState(false);
	const { isTrial, currentPeriodEnd } = useSubscription();
	const cancelSubscription = useAction(api.lib.stripe.cancelSubscription);

	const handleConfirm = async () => {
		try {
			setIsLoading(true);
			await cancelSubscription();
			toast.success(
				isTrial
					? "Trial cancelled successfully"
					: "Subscription cancelled successfully",
				{
					description: isTrial
						? "You'll keep access until your trial ends and won't be charged."
						: "You'll keep access until the end of your current billing period.",
				},
			);
			onClose();
		} catch (error) {
			console.error("Failed to cancel subscription:", error);
			toast.error(
				isTrial
					? "Failed to cancel trial. Please try again."
					: "Failed to cancel subscription. Please try again.",
			);
		} finally {
			setIsLoading(false);
		}
	};

	const formatEndDate = () => {
		if (!currentPeriodEnd) return "Unknown";
		return new Date(currentPeriodEnd).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	if (!isOpen) return null;

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(value) => {
				if (!value) onClose();
			}}
		>
			<DialogContent
				onOpenAutoFocus={(e) => e.preventDefault()}
				className="sm:max-w-lg w-full flex flex-col !gap-0 !p-0"
			>
				<DialogHeader className="px-4 py-4 border-b">
					<div className="w-full">
						<DialogTitle className="flex gap-2 items-center">
							{isTrial ? "Cancel Trial" : "Cancel Subscription"}
						</DialogTitle>
						<DialogDescription>
							{isTrial
								? "Are you sure you want to cancel your trial?"
								: "Are you sure you want to cancel your subscription?"}
						</DialogDescription>
					</div>
				</DialogHeader>

				<div className="px-4 py-6 space-y-6">
					{/* Current Plan Info */}
					<div className="p-4 rounded-lg border">
						<div className="space-y-2">
							<div className="flex justify-between items-center">
								<span className="text-sm font-medium">Current Plan</span>
								<div className="flex gap-2 items-center">
									<Badge variant="outline" className="bg-muted">
										{planName}
									</Badge>{" "}
									{isTrial && (
										<span className="text-xs text-muted-foreground">Trial</span>
									)}
								</div>
							</div>

							{currentPeriodEnd && (
								<div className="flex justify-between items-center">
									<span className="text-sm font-medium">
										{isTrial ? "Trial Ends" : "Current Period Ends"}
									</span>
									<Badge variant="outline" className="bg-muted">
										{formatEndDate()}
									</Badge>
								</div>
							)}
						</div>
					</div>

					{/* What happens after cancellation */}
					<div className="space-y-4">
						<div className="p-4 rounded-lg border bg-muted">
							<div className="space-y-3">
								<div className="flex gap-3 items-start">
									<div className="p-1 rounded-md border">
										<Calendar className="flex-shrink-0 size-3.5 text-muted-foreground" />
									</div>
									<div>
										<h4 className="text-sm font-medium">
											Access Until Period End
										</h4>
										<p className="text-xs text-muted-foreground">
											{isTrial
												? "You'll keep full access until your trial period ends"
												: "You'll keep full access until the end of your current billing period"}
										</p>
									</div>
								</div>
								<div className="flex gap-3 items-start">
									<div className="p-1 rounded-md border">
										<Shield className="flex-shrink-0 size-3.5 text-muted-foreground" />
									</div>
									<div>
										<h4 className="text-sm font-medium">
											{isTrial ? "No Charges" : "No Future Charges"}
										</h4>
										<p className="text-xs text-muted-foreground">
											{isTrial
												? "You won't be charged when your trial ends"
												: "You won't be charged for any future billing periods"}
										</p>
									</div>
								</div>
								<div className="flex gap-3 items-start">
									<div className="p-1 rounded-md border">
										<AlertTriangle className="size-3.5 text-muted-foreground flex-shrink-0" />
									</div>
									<div>
										<h4 className="text-sm font-medium">Data Preserved</h4>
										<p className="text-xs text-muted-foreground">
											Your projects and data will be preserved. You can
											resubscribe anytime.
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="px-4 py-4 border-t">
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							className="flex-1"
							onClick={onClose}
							disabled={isLoading}
						>
							Keep {isTrial ? "Trial" : "Subscription"}
						</Button>
						<Button
							variant="destructive"
							size="sm"
							className="flex-1 group"
							onClick={handleConfirm}
							disabled={isLoading}
						>
							{isLoading ? (
								<Spinner size="xs" />
							) : isTrial ? (
								"Cancel Trial"
							) : (
								"Cancel Subscription"
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
