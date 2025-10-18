import { cn } from "@firebuzz/ui/lib/utils";
import { motion } from "motion/react";
import {
	type CSSProperties,
	type ElementType,
	memo,
	useMemo,
	useRef,
	useEffect,
} from "react";

interface TextShimmerProps {
	children: string;
	as?: ElementType;
	className?: string;
	duration?: number;
	spread?: number;
	active?: boolean;
}

export const TextShimmer = memo(
	function TextShimmer({
		children,
		as: Component = "span",
		className,
		duration = 2,
		spread = 2,
		active = true,
	}: TextShimmerProps) {
		const MotionComponent = motion(Component as ElementType);
		const animationRef = useRef<HTMLElement>(null);

		// Memoize style to prevent recreation
		const style = useMemo(
			() =>
				({
					"--spread": `${children.length * spread}px`,
					backgroundImage:
						"var(--bg), linear-gradient(var(--base-color), var(--base-color))",
				}) as CSSProperties,
			[children.length, spread],
		);

		// Memoize transition to prevent recreation
		const transition = useMemo(
			() => ({
				repeat: active ? Number.POSITIVE_INFINITY : 0,
				duration,
				ease: "linear" as const,
			}),
			[active, duration],
		);

		// Stop animation when component unmounts to prevent memory leaks
		useEffect(() => {
			return () => {
				// Cleanup function to ensure animations are stopped
				if (animationRef.current) {
					const element = animationRef.current;
					// Cancel any ongoing animations
					element.getAnimations?.().forEach((animation) => {
						animation.cancel();
					});
				}
			};
		}, []);

		return (
			<MotionComponent
				ref={animationRef}
				className={cn(
					"relative inline-block bg-[length:250%_100%,auto] bg-clip-text",
					"text-transparent [--base-color:#a1a1aa] [--base-gradient-color:#000]",
					"[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]",
					"dark:[--base-color:#71717a] dark:[--base-gradient-color:#ffffff] dark:[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))]",
					className,
				)}
				initial={{ backgroundPosition: "100% center" }}
				animate={active ? { backgroundPosition: "0% center" } : undefined}
				transition={transition}
				style={style}
			>
				{children}
			</MotionComponent>
		);
	},
);
