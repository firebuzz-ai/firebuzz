"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "next-themes";

import { DottedGridBackground } from "@firebuzz/ui/components/reusable/dotted-grid-background";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Check, ChevronRight, ChevronsRight } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";

interface FlowNodeProps {
	node: { id: number; title: string; subtitle: string };
	isLast?: boolean;
	isActive?: boolean;
	isNext?: boolean;
	isPrevious?: boolean;
}

const FlowNode = ({
	node,
	isLast = false,
	isActive = false,
	isNext = false,
	isPrevious = false,
}: FlowNodeProps) => {
	return (
		<div className="flex flex-col items-center w-full">
			{/* Node */}
			<div
				className={cn(
					"overflow-hidden relative rounded-md border transition-all duration-300 ease-in-out w-[280px] h-[80px] bg-background border-border",
					isActive ? "scale-100" : "scale-90",
				)}
			>
				{/* Animated Border Trail for Active Node */}
				{isActive && (
					<div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]">
						<motion.div
							className="absolute rounded-full opacity-80 aspect-square bg-brand"
							style={{
								offsetPath: "rect(0 auto auto 0 round 6px)",
							}}
							animate={{
								offsetDistance: ["0%", "100%"],
								width: [32, 16, 16, 32, 16, 16, 32],
								height: [32, 16, 16, 32, 16, 16, 32],
							}}
							transition={{
								repeat: Number.POSITIVE_INFINITY,
								duration: 4,
								ease: "linear",
								times: [0, 0.25, 0.375, 0.5, 0.75, 0.875, 1],
							}}
						/>

						{/* Glow effect */}
						<motion.div
							className="absolute rounded-full opacity-40 blur-sm aspect-square bg-brand"
							style={{
								offsetPath: "rect(0 auto auto 0 round 6px)",
							}}
							animate={{
								offsetDistance: ["0%", "100%"],
								width: [40, 24, 24, 40, 24, 24, 40],
								height: [40, 24, 24, 40, 24, 24, 40],
							}}
							transition={{
								repeat: Number.POSITIVE_INFINITY,
								duration: 4,
								ease: "linear",
								times: [0, 0.25, 0.375, 0.5, 0.75, 0.875, 1],
							}}
						/>
					</div>
				)}

				{/* Header */}
				<div
					className={cn(
						"flex relative z-10 gap-2 items-center px-3 h-8 border-b border-border",
						isActive ? "bg-muted" : "bg-muted/50",
					)}
				>
					<div className="flex justify-center items-center w-3 h-full">
						<AnimatePresence mode="wait">
							{isActive && (
								<motion.div
									key={`${node.id}-active`}
									initial={{ opacity: 0, y: -10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{
										opacity: 0,
										y: 10,
										transition: { duration: 0.2, ease: "easeInOut" },
									}}
								>
									<Spinner size="xs" className="mb-0.5 fill-brand" />
								</motion.div>
							)}
							{isNext && (
								<motion.div
									key={`${node.id}-next`}
									initial={{ opacity: 0, y: -10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: 10 }}
									transition={{ duration: 0.2, ease: "easeInOut" }}
								>
									<ChevronsRight className="size-3 text-brand" />
								</motion.div>
							)}
							{isPrevious && (
								<motion.div
									key={`${node.id}-previous`}
									initial={{ opacity: 0, y: -10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: 10 }}
									transition={{ duration: 0.2, ease: "easeInOut" }}
								>
									<Check className="text-emerald-500 size-3" />
								</motion.div>
							)}
						</AnimatePresence>
					</div>
					<div
						className={cn(
							"text-xs font-semibold truncate transition-colors duration-300 ease-in-out",
							isActive ? "text-foreground" : "text-muted-foreground",
						)}
					>
						{node.title}
					</div>
				</div>

				{/* Content */}
				<div className="relative z-10 p-3 h-[48px] flex items-start">
					<p
						className={cn(
							"text-xs leading-relaxed transition-colors duration-300 ease-in-out",
							isActive ? "text-muted-foreground" : "text-muted-foreground/60",
						)}
					>
						{node.subtitle}
					</p>
				</div>
			</div>

			{/* Spacing and chevron connectors to next node */}
			{!isLast && (
				<div className="flex relative flex-col justify-center items-center py-8">
					{/* Chevron connectors */}
					<div className="flex flex-col gap-3 justify-center items-center h-24">
						{Array.from({ length: 4 }).map((_, index) => (
							<motion.div
								key={`chevron-${node.id}-${index}`}
								animate={{
									y: [0, -4, 0],
									opacity: [0.3, 1, 0.3],
								}}
								transition={{
									duration: 1.5,
									repeat: Number.POSITIVE_INFINITY,
									ease: "easeInOut",
									delay: index * 0.2, // Stagger the animation
								}}
							>
								<ChevronRight
									className={cn(
										"size-4 rotate-90 transition-colors duration-300 ease-in-out",
										isActive || isPrevious
											? "text-brand"
											: "text-muted-foreground",
										isPrevious && "text-emerald-500",
									)}
								/>
							</motion.div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

export const OnboardingFlowPreview = ({
	step = 1,
	steps,
}: {
	step: number;
	steps: { id: number; title: string; subtitle: string }[];
}) => {
	const { resolvedTheme } = useTheme();

	// Calculate slide offset for smooth sliding effect
	const nodeHeight = 80;
	const spacingHeight = 64; // py-8 = 32px top + 32px bottom
	const lineHeight = 96; // h-24 = 96px
	const totalNodeHeight = nodeHeight + spacingHeight + lineHeight; // 240px

	// Calculate offset to show the target node in the MIDDLE of the viewport
	// Step 1: show node 1 in middle (with empty space above, node 2 below)
	// Step 2: show node 2 in middle (node 1 above, node 3 below)
	// Step 3: show node 3 in middle (node 2 above, node 4 below)

	// The middle position in a 3-node viewport is at totalNodeHeight (240px from top)
	const middlePosition = totalNodeHeight;

	// The target node (step) position in the full container
	const targetNodePosition = (step - (steps.length - 1) / 2) * totalNodeHeight;

	// Calculate offset to center the target node in the middle position
	const slideOffset = middlePosition - targetNodePosition;

	return (
		<div className="overflow-hidden relative w-full h-full">
			{/* Dotted Grid Background */}
			<DottedGridBackground isDark={resolvedTheme === "dark"} />

			{/* Viewport Container */}
			<div
				className="flex relative justify-center items-center mx-auto w-full h-full"
				style={{ zIndex: 2 }}
			>
				<div
					className="flex overflow-hidden relative justify-center items-center w-full h-full"
					style={{
						maxWidth: "320px",
						height: `${totalNodeHeight * 3}px`, // Fixed height for exactly 3 nodes
					}}
				>
					{/* Sliding Container with ALL nodes */}
					<motion.div
						initial={{ y: 780 }}
						animate={{
							y: slideOffset,
						}}
						transition={{
							duration: 0.6,
							ease: "easeInOut",
						}}
						className="flex flex-col items-center w-full"
					>
						{/* Render ALL nodes */}
						{steps.map((node, index) => (
							<FlowNode
								key={node.id}
								node={node}
								isLast={index === steps.length - 1}
								isActive={index + 1 === step}
								isNext={index + 1 === step + 1}
								isPrevious={index + 1 === step - 1}
							/>
						))}
					</motion.div>
				</div>
			</div>

			{/* Fade-out Gradient Overlay */}
			<div
				className="absolute inset-0 pointer-events-none"
				style={{
					background: `
            radial-gradient(ellipse at center, transparent 30%, hsl(var(--muted) / 0.3) 70%, hsl(var(--muted) / 0.8) 100%),
            linear-gradient(to top, hsl(var(--muted) / 0.9) 0%, transparent 20%),
            linear-gradient(to bottom, hsl(var(--muted) / 0.9) 0%, transparent 20%),
            linear-gradient(to left, hsl(var(--muted) / 0.9) 0%, transparent 20%),
            linear-gradient(to right, hsl(var(--muted) / 0.9) 0%, transparent 20%)
          `,
					zIndex: 10,
				}}
			/>
		</div>
	);
};
