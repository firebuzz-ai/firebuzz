"use client";

import type { ToolSet } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
	ChevronDown,
	ChevronRight,
	GitCommit,
} from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import type { UIToolInvocation } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";

interface ListLandingPageVersionsProps {
	part: UIToolInvocation<ToolSet["listLandingPageVersions"]>;
}

export const ListLandingPageVersions = ({
	part,
}: ListLandingPageVersionsProps) => {
	const [isOpen, setIsOpen] = useState(false);

	const status = useMemo(() => {
		if (part.state === "input-available" || part.state === "input-streaming") {
			return "loading";
		}

		if (part.state === "output-available") {
			return "success";
		}

		return "error";
	}, [part.state]);

	const versions = useMemo(() => {
		if (part?.output?.success && part?.output?.versions) {
			return part.output.versions;
		}
		return [];
	}, [part?.output]);

	const versionCount = versions.length;

	const handleToggle = useCallback(() => {
		setIsOpen((prev) => !prev);
	}, []);

	const message = useMemo(() => {
		if (part?.output?.success && part?.output?.versions) {
			if (versions.length === 0) {
				return (
					<span className="text-xs text-muted-foreground">
						No versions saved yet
					</span>
				);
			}

			return null; // Content will be shown in expandable section
		}

		if (part?.output?.error) {
			return (
				<span className="text-xs text-destructive">
					{part.output.error.message}
				</span>
			);
		}

		return (
			<span className="text-xs text-muted-foreground">Loading versions...</span>
		);
	}, [part, versions.length]);

	// If there's a message (error, loading, or no versions), show it without expandable UI
	if (message) {
		return (
			<div className="overflow-hidden w-full text-xs rounded-md border">
				<div className="flex items-center gap-1.5 px-2 py-1 bg-muted">
					{status === "success" && (
						<div className="bg-emerald-600 rounded-[2px] size-2" />
					)}
					{status === "error" && (
						<div className="bg-red-600 rounded-[2px] size-2" />
					)}
					<span className="text-xs font-medium text-muted-foreground">
						List Versions
					</span>
				</div>
				<div className="p-2">{message}</div>
			</div>
		);
	}

	// Expandable UI for when there are versions
	return (
		<div className="overflow-hidden w-full text-xs rounded-md border">
			{/* Header */}
			<div
				className={cn("flex justify-between items-center px-2 py-1 bg-muted", {
					"border-b": isOpen,
				})}
			>
				<div className="flex gap-1 items-center">
					<Button
						variant="ghost"
						size="sm"
						className="p-0 w-6 h-6"
						onClick={handleToggle}
					>
						{isOpen ? (
							<ChevronDown className="size-3.5" />
						) : (
							<ChevronRight className="size-3.5" />
						)}
					</Button>
					<div className="flex items-center gap-1.5">
						{/* Status Indicator */}
						{status === "success" && (
							<div className="bg-emerald-600 rounded-[2px] size-2" />
						)}
						{status === "error" && (
							<div className="bg-red-600 rounded-[2px] size-2" />
						)}

						{/* Version Count */}
						<span className="text-xs font-medium text-muted-foreground">
							{versionCount} {versionCount === 1 ? "version" : "versions"} found
							in history
						</span>
					</div>
				</div>
			</div>

			{/* Content */}
			<AnimatePresence initial={false}>
				{isOpen && (
					<motion.div
						initial={{ height: 0 }}
						animate={{ height: "auto" }}
						exit={{ height: 0 }}
						className="overflow-hidden"
					>
						<div className="flex flex-col gap-2 p-2">
							{versions.map((version) => (
								<div key={version._id} className="flex gap-2 items-center">
									<Badge variant="outline" className="flex gap-1 items-center">
										<GitCommit className="size-3" />
										{version.number}
									</Badge>
									{version.commitMessage && (
										<span className="text-xs text-muted-foreground">
											{version.commitMessage}
										</span>
									)}
								</div>
							))}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};
