"use client";

import type { LandingPageUIMessage } from "@firebuzz/convex";
import { TextShimmer } from "@firebuzz/ui/components/reusable/text-shimmer";
import { Button } from "@firebuzz/ui/components/ui/button";
import { ChevronDown, ChevronRight } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { memo, useCallback, useMemo, useState } from "react";
import { getToolName } from "../utils/group-tool-calls";
import { MessagePart } from "./message-part";

interface ToolGroupProps {
	parts: LandingPageUIMessage["parts"][number][];
	startIndex: number;
}

export const ToolGroup = memo(function ToolGroup({
	parts,
	startIndex,
}: ToolGroupProps) {
	const [isOpen, setIsOpen] = useState(false);

	const groupStatus = useMemo(() => {
		// Check if any part is currently streaming/loading
		const hasLoading = parts.some((part) => {
			if ("state" in part) {
				return (
					part.state === "input-available" || part.state === "input-streaming"
				);
			}
			return false;
		});

		if (hasLoading) {
			return "loading";
		}

		// Check if any part has an error
		const hasError = parts.some((part) => {
			if (
				"state" in part &&
				part.state === "output-available" &&
				"output" in part &&
				part.output
			) {
				return (
					typeof part.output === "object" &&
					"success" in part.output &&
					!part.output.success
				);
			}
			return false;
		});

		if (hasError) {
			return "error";
		}

		return "success";
	}, [parts]);

	const activeToolCall = useMemo(() => {
		// Find the first loading/streaming tool call
		return parts.find((part) => {
			if ("state" in part) {
				return (
					part.state === "input-available" || part.state === "input-streaming"
				);
			}
			return false;
		});
	}, [parts]);

	const activeToolName = useMemo(() => {
		if (activeToolCall) {
			return getToolName(activeToolCall.type);
		}
		return null;
	}, [activeToolCall]);

	const isStreaming = groupStatus === "loading";

	// Filter parts for display in collapsible content - exclude active tool if it's streaming
	const displayParts = useMemo(() => {
		if (isStreaming && activeToolCall) {
			// Don't show the active streaming tool in the content since it's in the header
			return parts.filter((part) => part !== activeToolCall);
		}
		return parts;
	}, [parts, isStreaming, activeToolCall]);

	const handleToggle = useCallback(() => {
		setIsOpen((prev) => !prev);
	}, []);

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
						{groupStatus === "success" && (
							<div className="bg-emerald-600 rounded-[2px] size-2" />
						)}
						{groupStatus === "error" && (
							<div className="bg-red-600 rounded-[2px] size-2" />
						)}

						{/* Tool Name and Count */}
						{isStreaming && activeToolName ? (
							<TextShimmer
								as="span"
								duration={1.5}
								className="text-xs italic font-medium"
								active={true}
							>
								{activeToolName}
							</TextShimmer>
						) : (
							<span className="text-xs font-medium text-muted-foreground">
								{parts.length} tool {parts.length === 1 ? "call" : "calls"}
							</span>
						)}
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
							{displayParts.map((part, index) => {
								// Find original index in parts array
								const originalIndex = parts.indexOf(part);
								return (
									<MessagePart
										key={`${part.type}-${startIndex + originalIndex}`}
										part={part}
										partIndex={startIndex + originalIndex}
									/>
								);
							})}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
});
