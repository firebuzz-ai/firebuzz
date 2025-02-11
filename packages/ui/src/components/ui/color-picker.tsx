import { cn } from "@firebuzz/ui/lib/utils";
import { z } from "zod";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./tooltip";

export const colorPickerColors = {
	sky: { value: "#0EA5E9", class: "bg-sky-500" },
	violet: { value: "#8B5CF6", class: "bg-violet-500" },
	fuchsia: { value: "#d946ef", class: "bg-fuchsia-500" },
	amber: { value: "#f59e0b", class: "bg-amber-500" },
	emerald: { value: "#10b981", class: "bg-emerald-500" },
	indigo: { value: "#6366f1", class: "bg-indigo-500" },
} as const;

function getZodEnumFromObjectKeys<
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	TI extends Record<string, any>,
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	R extends string = TI extends Record<infer R, any> ? R : never,
>(input: TI): z.ZodEnum<[R, ...R[]]> {
	const [firstKey, ...otherKeys] = Object.keys(input) as [R, ...R[]];
	return z.enum([firstKey, ...otherKeys]);
}

export const colorPickerColorZodEnum =
	getZodEnumFromObjectKeys(colorPickerColors);

export type ColorPickerColorType = keyof typeof colorPickerColors;

interface ColorPickerProps {
	value?: ColorPickerColorType;
	onChange?: (value: ColorPickerColorType) => void;
	className?: string;
}

export const ColorPicker = ({
	value,
	onChange,
	className,
}: ColorPickerProps) => {
	return (
		<div className={cn("flex items-center gap-2 flex-1", className)}>
			<TooltipProvider>
				{Object.entries(colorPickerColors).map(([name, color]) => (
					<Tooltip key={name} delayDuration={0}>
						<TooltipTrigger asChild>
							<button
								type="button"
								className={cn(
									"h-6 w-6 rounded-lg ring-offset-background transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
									color.class,
									value === name
										? "ring-2 ring-ring ring-offset-2"
										: "hover:scale-105 [&:not(:hover)]:opacity-50",
								)}
								onClick={() => onChange?.(name as ColorPickerColorType)}
							/>
						</TooltipTrigger>
						<TooltipContent align="center" side="top" sideOffset={10}>
							<p className="capitalize">{name}</p>
						</TooltipContent>
					</Tooltip>
				))}
			</TooltipProvider>
		</div>
	);
};
