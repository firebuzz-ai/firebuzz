"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as React from "react";

import { cn } from "@firebuzz/ui/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipPortal = TooltipPrimitive.Portal;

const TooltipContent = React.forwardRef<
	React.ElementRef<typeof TooltipPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, hidden, ...props }, ref) => (
	<TooltipPortal>
		<TooltipPrimitive.Content
			ref={ref}
			sideOffset={sideOffset}
			hidden={hidden}
			className={cn(
				"z-50 relative overflow-hidden rounded-md border dark:bg-muted bg-background flex items-center px-3 py-1.5 text-xs text-popover-foreground dark:shadow-sm shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
				className,
			)}
			{...props}
		/>
	</TooltipPortal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

const TooltipShortcut = ({ children }: { children: React.ReactNode }) => {
	return (
		<kbd className="-me-1 ml-1 inline-flex h-5 max-h-full items-center rounded border px-1 bg-secondary/10 font-[inherit] text-[0.625rem] font-medium">
			{children}
		</kbd>
	);
};

export {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipShortcut,
	TooltipTrigger,
};
