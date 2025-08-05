"use client";

import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	CheckCheck,
	Circle,
	MailWarning,
	XCircle,
} from "@firebuzz/ui/icons/lucide";
import { AnimatePresence, motion } from "motion/react";
import type { SaveStatus } from "../../hooks/ui/use-auto-save";

interface SaveStatusProps {
	status: SaveStatus;
}

export const SaveStatusBadge = ({ status }: SaveStatusProps) => {
	const getStatusConfig = () => {
		switch (status) {
			case "idle":
				return {
					text: "All Saved",
					show: false,
					icon: <CheckCheck className="text-emerald-600 size-3" />,
				};
			case "pending":
				return {
					text: "Pending Changes",
					show: true,
					icon: <MailWarning className="text-yellow-600 size-3" />,
				};
			case "saving":
				return {
					text: "Saving...",
					show: true,
					icon: <Spinner size="xs" />,
				};
			case "saved":
				return {
					text: "Saved",
					show: true,
					icon: <CheckCheck className="text-emerald-600 size-3" />,
				};
			case "error":
				return {
					text: "Save Failed",
					show: true,
					icon: <XCircle className="text-red-600 size-3" />,
				};
			default:
				return {
					text: "Unknown",
					show: true,
					icon: <Circle className="text-muted-foreground size-3" />,
				};
		}
	};

	const statusConfig = getStatusConfig();

	return (
		<AnimatePresence>
			{statusConfig.show && (
				<motion.div
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0, scale: 0.9 }}
					transition={{ duration: 0.2 }}
				>
					<Badge
						variant="outline"
						className="flex gap-2 items-center bg-muted text-muted-foreground border-border"
					>
						{statusConfig.icon}
						{statusConfig.text}
					</Badge>
				</motion.div>
			)}
		</AnimatePresence>
	);
};
