import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "@firebuzz/ui/lib/utils";

const badgeVariants = cva(
	"inline-flex max-w-fit items-center cursor-default rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
	{
		variants: {
			variant: {
				default:
					"border-transparent bg-primary text-primary-foreground hover:bg-primary/80",

				secondary:
					"border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
				destructive:
					"border-destructive bg-destructive/20 text-destructive hover:text-destructive-foreground hover:bg-destructive/80",
				outline: "text-foreground",
				emerald:
					"border-emerald-500 bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30",
				brand:
					"border-brand bg-brand/20 text-brand-foreground text-brand hover:bg-brand/30",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

export interface BadgeProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
	return (
		<div className={cn(badgeVariants({ variant }), className)} {...props} />
	);
}

export { Badge, badgeVariants };
