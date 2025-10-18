"use client";

import { useDesignMode } from "@/hooks/agent/use-design-mode";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { IconCursorOff, IconPointer } from "@firebuzz/ui/icons/tabler";
import { cn } from "@firebuzz/ui/lib/utils";

export const DesignModeToggle = () => {
	const { isDesignModeActive, toggleDesignMode } = useDesignMode();

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant={isDesignModeActive ? "default" : "outline"}
					size="iconSm"
					onClick={toggleDesignMode}
					className={cn(
						"rounded-lg",
						isDesignModeActive &&
							"bg-primary text-primary-foreground hover:bg-primary/90",
					)}
					aria-label="Toggle Design Mode"
				>
					{isDesignModeActive ? (
						<IconPointer className="size-4" />
					) : (
						<IconCursorOff className="size-4" />
					)}
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				{isDesignModeActive ? "Exit Design Mode" : "Enter Design Mode"}
			</TooltipContent>
		</Tooltip>
	);
};
