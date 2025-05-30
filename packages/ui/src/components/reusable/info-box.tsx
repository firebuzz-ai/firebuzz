import { type VariantProps, cva } from "class-variance-authority";
import { CircleAlert, CircleCheck, CircleX, Info } from "lucide-react";
import * as React from "react";
import { cn } from "../../lib/utils";
const infoBoxVariants = cva(
	"flex items-center gap-3 rounded-lg border p-3 border text-sm text-muted-foreground",
	{
		variants: {
			variant: {
				default: "[&>div>svg]:text-muted-foreground",
				info: "[&>div>svg]:text-blue-500",
				warning: "[&>div>svg]:text-amber-500",
				destructive: "[&>div>svg]:text-red-500",
				success: "[&>div>svg]:text-green-500",
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
				<div className="p-1.5 rounded-md bg-muted border border-border">
					{icon || <Icon className="size-4 shrink-0" />}
				</div>

				<div>{children}</div>
			</div>
		);
	},
);

InfoBox.displayName = "InfoBox";
