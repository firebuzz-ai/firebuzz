"use client";

import { Button } from "@firebuzz/ui/components/ui/button";
import { ChevronDown, ChevronRight } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import type { ReasoningUIPart } from "ai";
import { AnimatePresence, motion } from "motion/react";
import type { CSSProperties, ElementType } from "react";
import { memo, useMemo } from "react";
import { MarkdownRenderer } from "../../markdown/markdown-renderer";
import { useReasoningContext } from "../../providers/reasoning-provider";

interface TextShimmerProps {
	children: string;
	as?: ElementType;
	className?: string;
	duration?: number;
	spread?: number;
	active?: boolean;
}

const TextShimmer = memo(
	({
		children,
		as: Component = "span",
		className,
		duration = 2,
		spread = 2,
		active = true,
	}: TextShimmerProps) => {
		const MotionComponent = motion(Component as ElementType);

		const dynamicSpread = useMemo(() => {
			return children.length * spread;
		}, [children, spread]);

		return (
			<MotionComponent
				className={cn(
					"relative inline-block bg-[length:250%_100%,auto] bg-clip-text",
					"text-transparent [--base-color:#a1a1aa] [--base-gradient-color:#000]",
					"[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]",
					"dark:[--base-color:#71717a] dark:[--base-gradient-color:#ffffff] dark:[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))]",
					className,
				)}
				initial={{ backgroundPosition: "100% center" }}
				animate={{ backgroundPosition: "0% center" }}
				transition={{
					repeat: active ? Number.POSITIVE_INFINITY : 0,
					duration,
					ease: "linear",
				}}
				style={
					{
						"--spread": `${dynamicSpread}px`,
						backgroundImage:
							"var(--bg), linear-gradient(var(--base-color), var(--base-color))",
					} as CSSProperties
				}
			>
				{children}
			</MotionComponent>
		);
	},
);

interface ReasoningProps {
	part: ReasoningUIPart;
	partIndex: number;
}

export const Reasoning = ({ part, partIndex }: ReasoningProps) => {
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
		<div className="overflow-hidden w-full rounded-md border">
			{/* Header */}
			<div
				className={cn(
					"flex justify-between items-center px-3 py-2 bg-muted/30",
					{
						"border-b": isExpanded,
					},
				)}
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
								className="text-sm italic font-medium"
								active={true}
							>
								Thinking
							</TextShimmer>
						) : (
							<span className="text-sm font-medium">
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
						<div className="p-3 text-sm text-muted-foreground">
							<MarkdownRenderer content={text} />
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};
