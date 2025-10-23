"use client";

import { Button } from "@firebuzz/ui/components/ui/button";
import { Check, X } from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useDesignModeState } from "@/components/providers/agent/design-mode";

export const DesignModeActionMenu = () => {
	const { isDesignModeActive, totalChangeCount, resetTheme, applyChanges } =
		useDesignModeState();

	const [isApplying, setIsApplying] = useState(false);
	const [isDiscarding, setIsDiscarding] = useState(false);

	const hasChanges = totalChangeCount > 0;

	const handleDiscard = async () => {
		try {
			setIsDiscarding(true);
			await resetTheme();
			toast.success("Changes discarded");
		} catch (error) {
			console.error("[Action Menu] Failed to discard:", error);
			toast.error("Failed to discard changes");
		} finally {
			setIsDiscarding(false);
		}
	};

	const handleApply = async () => {
		try {
			setIsApplying(true);
			await applyChanges();
			toast.success("Changes applied successfully");
		} catch (error) {
			console.error("[Action Menu] Failed to apply changes:", error);
			toast.error("Failed to apply changes");
		} finally {
			setIsApplying(false);
		}
	};

	// Only show when design mode is active and there are changes
	if (!isDesignModeActive || !hasChanges) return null;

	return (
		<AnimatePresence>
			<div className="flex absolute right-0 bottom-0 left-0 z-50 justify-center items-center pb-6 pointer-events-none">
				<motion.div
					initial={{ y: 100, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: 100, opacity: 0 }}
					transition={{
						type: "spring",
						stiffness: 300,
						damping: 30,
					}}
					className="pointer-events-auto"
				>
					<div className="flex gap-3 items-center px-4 py-3 rounded-full border shadow-lg bg-muted">
						{/* Change count badge */}
						<div className="flex gap-2 items-center px-3 py-1 rounded-full bg-blue-500/10">
							<div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
							<span className="text-sm font-medium text-blue-500">
								{totalChangeCount}{" "}
								{totalChangeCount === 1 ? "change" : "changes"}
							</span>
						</div>

						{/* Divider */}
						<div className="w-px h-6 bg-border" />

						{/* Actions */}
						<div className="flex gap-2 items-center">
							<Button
								variant="ghost"
								size="sm"
								onClick={handleDiscard}
								disabled={isDiscarding || isApplying}
								className="gap-1 h-8 rounded-full"
							>
								<X className="size-3.5" />
								Discard
							</Button>

							<Button
								variant="default"
								size="sm"
								onClick={handleApply}
								disabled={isApplying}
								className="gap-1 h-8 bg-blue-500 rounded-full hover:bg-blue-500/90"
							>
								<Check className="size-3.5" />
								{isApplying ? "Applying..." : "Apply"}
							</Button>
						</div>
					</div>
				</motion.div>
			</div>
		</AnimatePresence>
	);
};
