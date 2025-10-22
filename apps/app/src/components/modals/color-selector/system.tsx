import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { cn } from "@firebuzz/ui/lib/utils";
import { useColorSelectorModal } from "@/hooks/ui/use-color-selector-modal";
import { COLOR_CATEGORY_ORDER } from "@/lib/theme/constants";

export const SystemColors = () => {
	const { systemColors, setColor } = useColorSelectorModal();

	// Group colors by category
	const groupedColors = COLOR_CATEGORY_ORDER.map((category) => ({
		category,
		colors: systemColors.filter((c) => c.category === category),
	})).filter((group) => group.colors.length > 0);

	if (systemColors.length === 0) {
		return (
			<div className="flex items-center justify-center flex-1 p-8">
				<div className="text-center text-muted-foreground">
					<div className="mb-2 text-lg font-medium">No system colors</div>
					<p className="text-sm text-muted-foreground/70">
						System colors will appear here when a theme is loaded.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			{/* Colors Grid */}
			<div className="flex-1 overflow-y-auto">
				<div className="p-4 space-y-4">
					{groupedColors.map(({ category, colors }) => (
						<div key={category} className="space-y-2">
							<div className="grid grid-cols-2 gap-2">
								{colors.map((color) => (
									<Tooltip key={color.name}>
										<TooltipTrigger asChild>
											<button
												type="button"
												onClick={() => setColor(color.hexValue)}
												className={cn(
													"group relative flex items-center gap-2 p-2 rounded-md border border-border/40 transition-all duration-200",
													"hover:border-border hover:shadow-sm hover:bg-muted/30",
													"focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 focus:ring-offset-background",
													"active:scale-98 active:duration-75",
												)}
											>
												<div
													className="w-6 h-6 border rounded-sm shadow-sm border-border/40 shrink-0"
													style={{ backgroundColor: color.hexValue }}
												/>
												<div className="flex-1 min-w-0 text-left">
													<div className="text-xs font-medium capitalize truncate text-foreground">
														{color.displayName}
													</div>
													<div className="font-mono text-xs text-muted-foreground">
														{color.hexValue}
													</div>
												</div>
											</button>
										</TooltipTrigger>
										<TooltipContent
											side="top"
											className="text-xs font-medium border bg-popover/95 backdrop-blur-sm border-border/50 w-[--radix-tooltip-trigger-width]"
										>
											<div className="text-left">
												<div className="font-medium capitalize">
													{color.displayName}
												</div>
												<div className="text-muted-foreground">
													{color.description}
												</div>
											</div>
										</TooltipContent>
									</Tooltip>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};
