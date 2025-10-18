"use client";

import { TextShimmer } from "@firebuzz/ui/components/reusable/text-shimmer";
import { Button } from "@firebuzz/ui/components/ui/button";
import { ChevronDown, ChevronRight } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import type { ReasoningUIPart } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { memo, useMemo } from "react";
import { MarkdownRenderer } from "../../markdown/markdown-renderer";
import { useReasoningContext } from "../utils/reasoning-context";

interface ReasoningProps {
	part: ReasoningUIPart;
	partIndex: number;
}

export const Reasoning = memo(({ part, partIndex }: ReasoningProps) => {
	const context = useReasoningContext();
	const isExpanded = context?.expandedReasoningIndex === partIndex;

	const text = part.text || "_Thinking_";
	const isStreaming = part.state === "streaming";

	const thinkingTime = useMemo(() => {
		const tokenSize = text.length;
		const seconds = Math.round(tokenSize * 0.005);
		return seconds;
	}, [text]);

	const handleToggle = () => {
		if (context) {
			context.setExpandedReasoningIndex(isExpanded ? null : partIndex);
		}
	};

	return (
		<div className="overflow-hidden w-full text-xs rounded-md border">
			{/* Header */}
			<div
				className={cn("flex justify-between items-center px-2 py-1 bg-muted", {
					"border-b": isExpanded,
				})}
			>
				<div className="flex gap-1 items-center">
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
					<div className="flex items-center gap-1.5">
						{isStreaming ? (
							<TextShimmer
								as="span"
								duration={1.5}
								className="text-xs italic font-medium"
								active={true}
							>
								Thinking
							</TextShimmer>
						) : (
							<span className="text-xs font-medium text-muted-foreground">
								Thought for {thinkingTime}{" "}
								{thinkingTime === 1 ? "second" : "seconds"}
							</span>
						)}
					</div>
				</div>
			</div>

			{/* Content */}
			<AnimatePresence initial={false}>
				{isExpanded && (
					<motion.div
						initial={{ height: 0 }}
						animate={{ height: "auto" }}
						exit={{ height: 0 }}
						className="overflow-hidden"
					>
						<div className="p-3 text-xs text-muted-foreground">
							<MarkdownRenderer content={text} />
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
});
