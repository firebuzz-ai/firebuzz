import { cn } from "@firebuzz/ui/lib/utils";
import type { HTMLAttributes } from "react";

export function BaseNode({
	className,
	selected,
	externallyHovered,
	...props
}: HTMLAttributes<HTMLDivElement> & {
	selected?: boolean;
	externallyHovered?: boolean;
}) {
	return (
		<div
			{...props}
			className={cn(
				"relative rounded-md shadow-sm focus:outline-none",
				"border transition-colors duration-200", // Smooth border color transition
				selected
					? "border-brand bg-muted"
					: externallyHovered
						? "border-brand/50 bg-muted" // Lighter brand color for external hover
						: "border-border bg-muted",
				className,
			)}
			// biome-ignore lint/a11y/noNoninteractiveTabindex: flow diagram node needs tabIndex for keyboard navigation
			tabIndex={0}
		/>
	);
}

BaseNode.displayName = "BaseNode";
