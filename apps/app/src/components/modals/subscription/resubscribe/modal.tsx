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

interface ResubscribeModalProps {
	isOpen: boolean;
	onClose: () => void;
	planName: string;
}

export const ResubscribeModal = ({
	isOpen,
	onClose,
	planName,
}: ResubscribeModalProps) => {
	const [isLoading, setIsLoading] = useState(false);
	const { subscription } = useSubscription();
	const resubscribe = useAction(api.lib.stripe.resubscribe);

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
			await resubscribe();
			toast.success("Successfully resubscribed!", {
				description: "Welcome back! Your subscription is now active.",
			});
			onClose();
		} catch (error) {
			console.error("Failed to resubscribe:", error);
			toast.error("Failed to resubscribe. Please try again.", {
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
						<DialogTitle>Welcome Back to {planName}</DialogTitle>
						<DialogDescription>
							Ready to continue your journey? Resubscribe to regain full access.
						</DialogDescription>
					</div>
				</DialogHeader>

				<div className="px-4 py-6 space-y-6">
					{/* Resubscribe Benefits */}
					<div className="space-y-4">
						<div className="p-4 rounded-lg border bg-muted">
							<div className="space-y-3">
								<div className="flex gap-3 items-start">
									<div className="p-1 rounded-md border">
										<Zap className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
									</div>

									<div>
										<h4 className="text-sm font-medium">Instant Restoration</h4>
										<p className="text-xs text-muted-foreground">
											Get immediate access to all your previous features and
											data
										</p>
									</div>
								</div>
								<div className="flex gap-3 items-start">
									<div className="p-1 rounded-md border">
										<Sparkles className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
									</div>

									<div>
										<h4 className="text-sm font-medium">
											Everything Preserved
										</h4>
										<p className="text-xs text-muted-foreground">
											All your projects, settings, and data remain exactly as
											you left them
										</p>
									</div>
								</div>
								<div className="flex gap-3 items-start">
									<div className="p-1 rounded-md border">
										<Crown className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
									</div>

									<div>
										<h4 className="text-sm font-medium">Current Pricing</h4>
										<p className="text-xs text-muted-foreground">
											Continue with the latest pricing and feature updates
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
										charged {formattedPrice} immediately using your saved
										payment method.
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
									Resubscribe Now
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
