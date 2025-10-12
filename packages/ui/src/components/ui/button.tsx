import { cn } from "@firebuzz/ui/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const buttonVariants = cva(
	"inline-flex items-center group justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground hover:bg-primary/90",
				brand: "bg-brand text-brand-foreground hover:bg-brand/90",
				destructive:
					"bg-destructive/20 border border-destructive text-destructive hover:bg-destructive/90 hover:text-destructive-foreground",
				outline:
					"border bg-background hover:bg-muted hover:text-accent-foreground",
				secondary:
					"bg-secondary text-secondary-foreground hover:bg-secondary/80",
				ghost:
					"hover:bg-muted/80 border border-transparent hover:text-accent-foreground",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				default: "h-10 px-4 py-2",
				sm: "h-8 rounded-md px-3 py-1",
				lg: "h-11 rounded-md px-8",
				icon: "h-10 w-10",
				iconSm: "h-8 w-8 p-1",
				iconXs: "h-6 w-6 p-1",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, ...props }, ref) => {
		const Comp = asChild ? Slot : "button";
		return (
			<Comp
				data-variant={variant ?? "default"}
				className={cn(buttonVariants({ variant, size, className }))}
				ref={ref}
				{...props}
			/>
		);
	},
);
Button.displayName = "Button";

const ButtonShortcut = ({ children }: { children: React.ReactNode }) => {
	return (
		<kbd
			className="-me-1 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium
      group-data-[variant=default]:border-secondary/20 group-data-[variant=default]:bg-secondary/10 group-data-[variant=default]:text-primary-foreground/70
      group-data-[variant=brand]:border-primary/10 group-data-[variant=brand]:bg-primary/5 group-data-[variant=brand]:text-brand-foreground/70
      group-data-[variant=outline]:border-border group-data-[variant=outline]:bg-background/80
      group-data-[variant=secondary]:border-primary/10 group-data-[variant=secondary]:bg-primary/5 group-data-[variant=secondary]:text-secondary-foreground/70
      group-data-[variant=ghost]:border-muted group-data-[variant=ghost]:bg-muted/50
      group-data-[variant=destructive]:border-destructive/20 group-data-[variant=destructive]:bg-destructive/10 group-data-[variant=destructive]:text-destructive/80
      group-data-[variant=link]:border-primary/20 group-data-[variant=link]:bg-primary/5 group-data-[variant=link]:text-primary/80
    "
		>
			{children}
		</kbd>
	);
};

export { Button, ButtonShortcut, buttonVariants };
