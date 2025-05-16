"use client";

import { workbenchStateAtom } from "@/lib/workbench/atoms";
import { CornerDownRight } from "@firebuzz/ui/icons/lucide";
import { useAtomValue } from "jotai";
import { AnimatePresence, motion } from "motion/react";

export function Loading() {
	const workbenchState = useAtomValue(workbenchStateAtom);

	const stateMessages = {
		initializing: "Initializing...",
		"project-mounted": "Mounting Project...",
		"dependencies-installed": "Installing Dependencies...",
		"dev-server-running": "Starting Dev Server...",
		ready: "Loading Preview...",
		error: "Error Occurred",
	};

	// Calculate progress based on state
	const progressMap = {
		initializing: 0,
		"project-mounted": 20,
		"dependencies-installed": 60,
		"dev-server-running": 80,
		ready: 100,
	};

	const currentProgress =
		progressMap[workbenchState as keyof typeof progressMap];
	const currentMessage =
		stateMessages[workbenchState as keyof typeof stateMessages];

	if (workbenchState === "error") {
		return (
			<div className="absolute inset-0 bg-muted flex flex-col items-center justify-center gap-6">
				<motion.div className="text-sm text-destructive mt-2">
					Check console for details
				</motion.div>
			</div>
		);
	}

	return (
		<div className="absolute inset-0 bg-muted flex flex-col items-center justify-center">
			<div className="flex flex-col gap-2 pb-10">
				<div className="w-64 h-2 bg-muted-foreground/20 rounded-sm overflow-hidden relative">
					{/* Bars */}
					<div className="absolute inset-0 flex items-start justify-evenly">
						<div className="w-px h-full bg-primary/10" />
						<div className="w-px h-full bg-primary/10" />
						<div className="w-px h-full bg-primary/10" />
						<div className="w-px h-full bg-primary/10" />
						<div className="w-px h-full bg-primary/10" />
					</div>
					<motion.div
						className="h-full bg-brand"
						initial={{ width: 0 }}
						animate={{ width: `${currentProgress}%` }}
						transition={{ duration: 0.3, ease: "easeInOut" }}
					/>
				</div>
				<div className="flex items-center gap-2 text-muted-foreground">
					<CornerDownRight className="size-3" />
					<AnimatePresence mode="wait">
						<motion.div
							key={currentMessage}
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 10 }}
							transition={{ duration: 0.2 }}
							className="text-sm font-medium"
						>
							{currentMessage}
						</motion.div>
					</AnimatePresence>
				</div>
			</div>
		</div>
	);
}
