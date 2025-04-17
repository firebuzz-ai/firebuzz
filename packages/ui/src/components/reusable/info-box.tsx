import { type VariantProps, cva } from "class-variance-authority";
import { CircleAlert, CircleCheck, CircleX, Info } from "lucide-react";
import * as React from "react";
import { cn } from "../../lib/utils";

const infoBoxVariants = cva(
	"flex items-center gap-2 rounded-md border px-2 py-1 text-xs bg-muted border-border text-muted-foreground",
	{
		variants: {
			variant: {
				default: "[&>svg]:text-muted-foreground",
				info: "[&>svg]:text-blue-500",
				warning: "[&>svg]:text-amber-500",
				destructive: "[&>svg]:text-red-500",
				success: "[&>svg]:text-green-500",
			},
		},
		defaultVariants: {
			variant: "default",
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
	({ className, variant = "default", icon, children, ...props }, ref) => {
		const Icon = variantIcons[variant || "default"];

		return (
			<div
				ref={ref}
				className={cn(infoBoxVariants({ variant }), className)}
				{...props}
			>
				{icon || <Icon className="h-3 w-3 shrink-0" />}
				<div>{children}</div>
			</div>
		);
	},
);

InfoBox.displayName = "InfoBox";
