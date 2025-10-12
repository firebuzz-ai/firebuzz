"use client";

import type { ToolSet } from "@firebuzz/convex";
import { TextShimmer } from "@firebuzz/ui/components/reusable/text-shimmer";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
	ChevronDown,
	ChevronRight,
	GitCommit,
	RotateCcw,
} from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import type { UIToolInvocation } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { useLandingPageContext } from "../../providers/landing-page-provider";

interface SaveVersionProps {
	part: UIToolInvocation<ToolSet["saveLandingPageVersion"]>;
}

export const SaveVersion = ({ part }: SaveVersionProps) => {
	const { currentVersionId } = useLandingPageContext();
	const [isExpanded, setIsExpanded] = useState(false);

	const isStreaming = useMemo(() => {
		return part.state === "input-available" || part.state === "input-streaming";
	}, [part.state]);

	const hasOutput = useMemo(() => {
		return part.state === "output-available";
	}, [part.state]);

	const isCurrent = useMemo(() => {
		if (!part?.output?.versionId || !currentVersionId) return false;
		return part.output.versionId === currentVersionId;
	}, [part?.output?.versionId, currentVersionId]);

	const handleToggle = () => {
		if (hasOutput && part?.output?.success) {
			setIsExpanded(!isExpanded);
		}
	};

	const handleRestore = () => {
		// TODO: Implement restore functionality
		console.log("Restore version:", part?.output?.versionId);
	};

	// While streaming/saving
	if (isStreaming) {
		return (
			<div className="overflow-hidden w-full rounded-md border">
				<div className="flex justify-between items-center px-3 py-2 bg-muted/30">
					<div className="flex gap-1.5 items-center">
						<TextShimmer
							as="span"
							duration={1.5}
							className="text-sm italic font-medium"
							active={true}
						>
							Saving
						</TextShimmer>
					</div>
				</div>
			</div>
		);
	}

	// After completion - success
	if (hasOutput && part?.output?.success && part?.output?.versionNumber) {
		const description = part.input?.description;
		const commitMessage = part.input?.commitMessage;
		const hasDescription = Boolean(description);

		return (
			<div
				className={cn("relative overflow-hidden w-full rounded-md border", {
					"border-l-4 border-l-brand": isCurrent,
				})}
			>
				{/* Current Badge */}
				{isCurrent && (
					<div className="absolute top-2 right-2">
						<Badge
							variant="secondary"
							className="bg-brand/10 text-brand border-brand/20"
						>
							Current
						</Badge>
					</div>
				)}

				{/* Header */}
				<div
					className={cn(
						"flex justify-between items-center px-3 py-2 bg-muted/30",
						{
							"border-b": isExpanded && hasDescription,
						},
					)}
				>
					<div className="flex gap-2 items-center flex-1">
						{hasDescription && (
							<Button
								variant="ghost"
								size="sm"
								className="p-0 w-6 h-6"
								onClick={handleToggle}
							>
								{isExpanded ? (
									<ChevronDown className="size-3.5" />
								) : (
									<ChevronRight className="size-3.5" />
								)}
							</Button>
						)}
						<div className="flex gap-2 items-center flex-1">
							<Badge variant="outline" className="flex gap-1 items-center">
								<GitCommit className="w-3 h-3" />
								Version {part.output.versionNumber}
							</Badge>
							{commitMessage && (
								<span className="text-xs text-muted-foreground">
									{commitMessage}
								</span>
							)}
						</div>
						{!isCurrent && (
							<Button
								variant="ghost"
								size="sm"
								className="px-2 h-7 text-xs"
								onClick={handleRestore}
							>
								<RotateCcw className="mr-1 w-3 h-3" />
								Restore
							</Button>
						)}
					</div>
				</div>

				{/* Content - Description */}
				{hasDescription && (
					<AnimatePresence initial={false}>
						{isExpanded && (
							<motion.div
								initial={{ height: 0 }}
								animate={{ height: "auto" }}
								exit={{ height: 0 }}
								className="overflow-hidden"
							>
								<div className="p-3 text-sm text-muted-foreground">
									{description}
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				)}
			</div>
		);
	}

	// Error state
	if (part?.output?.error) {
		return (
			<div className="overflow-hidden w-full rounded-md border border-destructive/50">
				<div className="flex justify-between items-center px-3 py-2 bg-destructive/10">
					<div className="flex gap-2 items-center">
						<span className="text-sm font-medium">Save Version Failed</span>
					</div>
				</div>
				<div className="p-3 text-sm text-destructive">
					{part.output.error.message}
				</div>
			</div>
		);
	}

	// Fallback
	return null;
};
