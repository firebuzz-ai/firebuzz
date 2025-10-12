import type { UIMessage } from "@firebuzz/convex";
import { Button } from "@firebuzz/ui/components/ui/button";
import { ChevronDown, ChevronRight, Clock } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import type {
	CSSProperties,
	Dispatch,
	ElementType,
	SetStateAction,
} from "react";
import { memo, useMemo, useState } from "react";
import { Markdown } from "../markdown";

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
	content: string;

	isOver: boolean;
	setMessages: Dispatch<SetStateAction<UIMessage[]>>;
}

export const Reasoning = ({ content, setMessages, isOver }: ReasoningProps) => {
	const [isVisible, setIsVisible] = useState(false);

	const formattedTime = useMemo(() => {
		const tokenSize = content.length;
		const thinkingTime = tokenSize * 0.005; // 0.005 seconds per token
		return `${thinkingTime.toFixed(1)}s`;
	}, [content]);

	return (
		<div className="w-full overflow-hidden border rounded-md">
			{/* Header */}
			<div
				className={cn(
					"flex items-center justify-between px-3 py-2 bg-muted/30",
					{ "border-b": isVisible },
				)}
			>
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="sm"
						className="w-6 h-6 p-0"
						onClick={() => setIsVisible(!isVisible)}
					>
						{isVisible ? (
							<ChevronDown className="size-3.5" />
						) : (
							<ChevronRight className="size-3.5" />
						)}
					</Button>
					<div className="flex items-center gap-1.5">
						<TextShimmer
							as="span"
							duration={1.5}
							className="text-sm italic font-medium"
							active={!isOver}
						>
							Thinking
						</TextShimmer>
					</div>
				</div>

				<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<Clock className="size-3.5" />
					<span>{formattedTime}</span>
				</div>
			</div>

			{/* Content */}
			<AnimatePresence initial={false}>
				{isVisible && (
					<motion.div
						initial={{ height: 0 }}
						animate={{ height: "auto" }}
						exit={{ height: 0 }}
						className="overflow-hidden"
					>
						<div className="p-3 text-sm text-muted-foreground">
							<Markdown setMessages={setMessages}>{content}</Markdown>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};
