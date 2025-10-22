"use client";

import { cn } from "@firebuzz/ui/lib/utils";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Badge } from "./badge";

const sliderVariants = cva("", {
	variants: {
		variant: {
			default: "",
			brand: "",
			secondary: "",
			destructive: "",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});

const trackVariants = cva(
	"overflow-hidden relative w-full h-1.5 rounded-full grow",
	{
		variants: {
			variant: {
				default: "bg-primary/20",
				brand: "bg-brand/20",
				secondary: "bg-secondary",
				destructive: "bg-destructive/20",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

const rangeVariants = cva("absolute h-full", {
	variants: {
		variant: {
			default: "bg-primary",
			brand: "bg-brand",
			secondary: "bg-secondary-foreground",
			destructive: "bg-destructive",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});

const thumbVariants = cva(
	"block w-4 h-4 rounded-full border shadow-sm transition-colors bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				default: "border-primary/50",
				brand: "border-brand/50",
				secondary: "border-secondary-foreground/50",
				destructive: "border-destructive/50",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

const labelBadgeVariants = cva(
	"absolute left-1/2 -translate-x-1/2 -translate-y-1/2 -top-5 pointer-events-none",
	{
		variants: {
			variant: {
				default: "",
				brand: "",
				secondary: "bg-secondary-foreground text-secondary",
				destructive: "bg-destructive text-destructive-foreground",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

const arrowVariants = cva(
	"absolute border-[6px] left-1/2 -translate-x-1/2 border-transparent top-full",
	{
		variants: {
			variant: {
				default: "border-t-primary",
				brand: "border-t-brand",
				secondary: "border-t-secondary-foreground",
				destructive: "border-t-destructive",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

export interface SliderWithLabelProps
	extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>,
		VariantProps<typeof sliderVariants> {
	/**
	 * Format function to customize the label display
	 * @param value - Current slider value
	 * @returns Formatted string to display in the label
	 */
	formatLabel?: (value: number) => string;
	/**
	 * Whether to show the label on the thumb
	 * @default true
	 */
	showLabel?: boolean;
	/**
	 * Whether to show the arrow pointer on the label
	 * @default true
	 */
	showArrow?: boolean;
	/**
	 * Custom className for the label badge
	 */
	labelClassName?: string;
	/**
	 * Custom className for the arrow
	 */
	arrowClassName?: string;
}

const SliderWithLabel = React.forwardRef<
	React.ElementRef<typeof SliderPrimitive.Root>,
	SliderWithLabelProps
>(
	(
		{
			className,
			variant,
			formatLabel = (value) => `${value}%`,
			showLabel = true,
			showArrow = true,
			labelClassName,
			arrowClassName,
			...props
		},
		ref,
	) => {
		const [internalValue, setInternalValue] = React.useState(
			props.defaultValue || [30],
		);

		// Use controlled value if provided, otherwise use internal state
		const currentValue = props.value || internalValue;
		const handleValueChange = (value: number[]) => {
			if (!props.value) {
				setInternalValue(value);
			}
			props.onValueChange?.(value);
		};

		// Determine if this is a range slider (has multiple values)
		const isRange = Array.isArray(currentValue) && currentValue.length > 1;

		return (
			<SliderPrimitive.Root
				ref={ref}
				className={cn(
					"flex relative items-center w-full select-none touch-none",
					sliderVariants({ variant }),
					className,
				)}
				{...props}
				value={currentValue}
				onValueChange={handleValueChange}
			>
				<SliderPrimitive.Track className={cn(trackVariants({ variant }))}>
					<SliderPrimitive.Range className={cn(rangeVariants({ variant }))} />
				</SliderPrimitive.Track>

				{/* First thumb (or only thumb for single value) */}
				<SliderPrimitive.Thumb className={cn(thumbVariants({ variant }))}>
					{showLabel && (
						<Badge
							className={cn(
								labelBadgeVariants({ variant }),
								labelClassName,
							)}
						>
							<span>{formatLabel(currentValue[0])}</span>
							{showArrow && (
								<div
									className={cn(arrowVariants({ variant }), arrowClassName)}
								/>
							)}
						</Badge>
					)}
				</SliderPrimitive.Thumb>

				{/* Second thumb for range slider */}
				{isRange && (
					<SliderPrimitive.Thumb className={cn(thumbVariants({ variant }))}>
						{showLabel && (
							<Badge
								className={cn(
									labelBadgeVariants({ variant }),
									labelClassName,
								)}
							>
								<span>{formatLabel(currentValue[1])}</span>
								{showArrow && (
									<div
										className={cn(arrowVariants({ variant }), arrowClassName)}
									/>
								)}
							</Badge>
						)}
					</SliderPrimitive.Thumb>
				)}
			</SliderPrimitive.Root>
		);
	},
);
SliderWithLabel.displayName = "SliderWithLabel";

export { SliderWithLabel };
