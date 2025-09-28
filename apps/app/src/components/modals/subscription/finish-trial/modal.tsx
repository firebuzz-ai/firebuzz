"use client";

import { useSubscription } from "@/hooks/auth/use-subscription";
import { api, useAction } from "@firebuzz/convex";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Crown, Sparkles, Zap } from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

interface FinishTrialModalProps {
	isOpen: boolean;
	onClose: () => void;
	planName: string;
}

export const FinishTrialModal = ({
	isOpen,
	onClose,
	planName,
}: FinishTrialModalProps) => {
	const [isLoading, setIsLoading] = useState(false);
	const { subscription } = useSubscription();
	const finishTrial = useAction(api.lib.stripe.finishTrialImmediately);

	const currentPlanItem = subscription?.items.find(
		(item) =>
			item.metadata?.type === "subscription" &&
			item.metadata?.isShadow !== "true",
	);

	const formattedPrice = currentPlanItem?.price?.unitAmount
		? `$${(currentPlanItem.price.unitAmount / 100).toFixed(2)}`
		: "Free";

	const interval = subscription?.interval || "month";

	useHotkeys(
		"meta+s",
		async () => {
			await handleConfirm();
		},
		{
			preventDefault: true,
			enabled: isOpen,
		},
	);

	const handleConfirm = async () => {
		try {
			setIsLoading(true);
			await finishTrial();
			toast.success("Successfully upgraded to full access!", {
				description: "Welcome to your premium plan with unlimited features.",
			});
			onClose();
		} catch (error) {
			console.error("Failed to finish trial:", error);
			toast.error("Failed to end trial. Please try again.", {
				description: "Please check your payment method and try again.",
			});
		} finally {
			setIsLoading(false);
		}
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
						<DialogTitle>Upgrade to Full Access</DialogTitle>
						<DialogDescription>
							Ready to unlock the full power? Start your premium journey today.
						</DialogDescription>
					</div>
				</DialogHeader>

				<div className="px-4 py-6 space-y-6">
					{/* Upgrade Benefits */}
					<div className="space-y-4">
						<div className="p-4 rounded-lg border bg-muted">
							<div className="space-y-3">
								<div className="flex gap-3 items-start">
									<div className="p-1 rounded-md border">
										<Zap className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
									</div>

									<div>
										<h4 className="text-sm font-medium">Immediate Access</h4>
										<p className="text-xs text-muted-foreground">
											Get instant access to all premium features and unlimited
											usage
										</p>
									</div>
								</div>
								<div className="flex gap-3 items-start">
									<div className="p-1 rounded-md border">
										<Sparkles className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
									</div>

									<div>
										<h4 className="text-sm font-medium">Priority Support</h4>
										<p className="text-xs text-muted-foreground">
											Get priority customer support and faster response times
										</p>
									</div>
								</div>
								<div className="flex gap-3 items-start">
									<div className="p-1 rounded-md border">
										<Crown className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
									</div>

									<div>
										<h4 className="text-sm font-medium">Premium Features</h4>
										<p className="text-xs text-muted-foreground">
											Access to advanced tools and unlimited project creation
										</p>
									</div>
								</div>
							</div>
						</div>

						{/* Billing Information */}
						<div className="p-4 rounded-lg border">
							<div className="space-y-2">
								<div className="flex justify-between items-center">
									<span className="text-sm font-medium">Plan</span>
									<span className="text-sm">{planName}</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm font-medium">Billing</span>
									<span className="text-sm font-semibold">
										{formattedPrice}/{interval}
									</span>
								</div>
								<div className="pt-2 border-t">
									<p className="text-xs text-muted-foreground">
										Your {interval}ly billing cycle will start today. You'll be
										charged {formattedPrice} immediately.
									</p>
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
							className="flex-1 h-8"
							onClick={handleConfirm}
							disabled={isLoading}
						>
							{isLoading ? (
								<Spinner size="xs" />
							) : (
								<>
									Upgrade Now
									<ButtonShortcut>⌘S</ButtonShortcut>
								</>
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
