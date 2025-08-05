"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "@firebuzz/ui/lib/utils";

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
  "overflow-hidden relative w-full h-2 rounded-full grow",
  {
    variants: {
      variant: {
        default: "bg-secondary",
        brand: "bg-brand/20",
        secondary: "bg-secondary",
        destructive: "bg-destructive/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
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
  "block w-5 h-5 rounded-full border-2 shadow-md transition-colors bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-primary",
        brand: "border-brand",
        secondary: "border-secondary-foreground",
        destructive: "border-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>,
    VariantProps<typeof sliderVariants> {}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, variant, ...props }, ref) => {
  // Determine if this is a range slider (has multiple values)
  const values = props.value || props.defaultValue || [];
  const isRange = Array.isArray(values) && values.length > 1;

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "flex relative items-center w-full select-none touch-none",
        sliderVariants({ variant }),
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className={cn(trackVariants({ variant }))}>
        <SliderPrimitive.Range className={cn(rangeVariants({ variant }))} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className={cn(thumbVariants({ variant }))} />
      {isRange && (
        <SliderPrimitive.Thumb className={cn(thumbVariants({ variant }))} />
      )}
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider, sliderVariants };
