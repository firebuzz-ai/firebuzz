import { type VariantProps, cva } from "class-variance-authority";
import { CircleAlert, CircleCheck, CircleX, Info } from "lucide-react";
import * as React from "react";
import { cn } from "../../lib/utils";
const infoBoxVariants = cva(
	"flex gap-3 rounded-lg border p-3 border text-sm text-muted-foreground",
	{
		variants: {
			variant: {
				// Target any nested svg so additional icon wrappers still receive color
				default: "[&_svg]:text-muted-foreground",
				info: "[&_svg]:text-blue-500",
				warning: "[&_svg]:text-amber-500",
				destructive: "[&_svg]:text-red-500",
				success: "[&_svg]:text-emerald-500",
			},
			iconPlacement: {
				left: "flex-row items-start",
				right: "flex-row-reverse items-start",
				top: "flex-col items-start",
				bottom: "flex-col-reverse items-start",
			},
		},

		defaultVariants: {
			variant: "default",
			iconPlacement: "left",
		},
	},
);

interface InfoBoxProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof infoBoxVariants> {
	icon?: React.ReactNode;
}

const variantIcons = {
	default: Info,
	info: Info,
	warning: CircleAlert,
	destructive: CircleX,
	success: CircleCheck,
};

export const InfoBox = React.forwardRef<HTMLDivElement, InfoBoxProps>(
	(
		{ className, variant = "default", icon, children, iconPlacement, ...props },
		ref,
	) => {
		const Icon = variantIcons[variant || "default"];
		const contentRef = React.useRef<HTMLDivElement | null>(null);
		const [isSingleLine, setIsSingleLine] = React.useState<boolean>(false);

		// Detect if the content fits in a single line to center-align with the icon.
		// Only applies for horizontal placements (left/right).
		React.useEffect(() => {
			if (!contentRef.current) return;

			const el = contentRef.current;

			const measure = () => {
				const rect = el.getBoundingClientRect();
				const style = window.getComputedStyle(el);
				const lineHeightPx = Number.parseFloat(style.lineHeight);
				const fallbackLineHeight = 20; // conservative fallback for 'normal'
				const lineHeight = Number.isFinite(lineHeightPx)
					? lineHeightPx
					: fallbackLineHeight;

				const lines = rect.height / (lineHeight || 1);
				setIsSingleLine(lines <= 1.2);
			};

			measure();

			const ro = new ResizeObserver(() => measure());
			ro.observe(el);

			const onResize = () => measure();
			window.addEventListener("resize", onResize);

			return () => {
				ro.disconnect();
				window.removeEventListener("resize", onResize);
			};
		}, []);

		return (
			<div
				ref={ref}
				className={cn(
					infoBoxVariants({ variant, iconPlacement }),
					(iconPlacement === "left" || iconPlacement === "right") &&
						isSingleLine &&
						"items-center",
					className,
				)}
				{...props}
			>
				<div className="p-1.5 rounded-md bg-muted border border-border">
					{icon || <Icon className="size-4 shrink-0" />}
				</div>

				<div ref={contentRef}>{children}</div>
			</div>
		);
	},
);

InfoBox.displayName = "InfoBox";
