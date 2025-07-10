"use client";

import { DeletionDialog } from "@/components/modals/confirmation/deletion-dialog";
import { useSubscription } from "@/hooks/auth/use-subscription";
import { api, useAction } from "@firebuzz/convex";

import { toast } from "@firebuzz/ui/lib/utils";
import { useState } from "react";

interface CancelSubscriptionDialogProps {
	isOpen: boolean;
	onClose: () => void;
	planName: string;
}

export const CancelSubscriptionDialog = ({
	isOpen,
	onClose,
	planName,
}: CancelSubscriptionDialogProps) => {
	const [isLoading, setIsLoading] = useState(false);
	const { isTrial } = useSubscription();
	const cancelSubscription = useAction(api.lib.stripe.cancelSubscription);

	const handleConfirm = async () => {
		try {
			setIsLoading(true);
			await cancelSubscription();
			toast.success(
				isTrial
					? "Trial cancelled successfully"
					: "Subscription cancelled successfully",
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

	const getDescription = () => {
		if (isTrial) {
			return `Are you sure you want to cancel your ${planName} trial? You will keep access until your trial period ends and won't be charged when it expires.`;
		}
		return `Are you sure you want to cancel your ${planName} subscription? You will lose access to all paid features at the end of your current billing period.`;
	};

	const getConfirmationText = () => {
		return isTrial ? "cancel trial" : "cancel subscription";
	};

	return (
		<DeletionDialog
			isOpen={isOpen}
			onClose={onClose}
			onConfirm={handleConfirm}
			title={isTrial ? "Cancel Trial" : "Cancel Subscription"}
			description={getDescription()}
			confirmationText={getConfirmationText()}
			isLoading={isLoading}
		/>
	);
};
