import { cn } from "@firebuzz/ui/lib/utils";
import { Briefcase, Crown, CupSoda, Rocket, Stars, Target } from "lucide-react";
import { z } from "zod";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./tooltip";

export const iconPickerIcons = {
	briefcase: Briefcase,
	cup: CupSoda,
	rocket: Rocket,
	stars: Stars,
	target: Target,
	crown: Crown,
} as const;

function getZodEnumFromObjectKeys<
	// biome-ignore lint/suspicious/noExplicitAny: generic utility requires flexible object typing
	TI extends Record<string, any>,
	// biome-ignore lint/suspicious/noExplicitAny: type inference from generic record structure
	R extends string = TI extends Record<infer R, any> ? R : never,
>(input: TI): z.ZodEnum<[R, ...R[]]> {
	const [firstKey, ...otherKeys] = Object.keys(input) as [R, ...R[]];
	return z.enum([firstKey, ...otherKeys]);
}

export const iconPickerIconZodEnum = getZodEnumFromObjectKeys(iconPickerIcons);

export type IconPickerIconType = keyof typeof iconPickerIcons;

interface IconPickerProps {
	value?: IconPickerIconType;
	onChange?: (value: IconPickerIconType) => void;
	className?: string;
}

export const IconPicker = ({ value, onChange, className }: IconPickerProps) => {
	return (
		<div className={cn("grid grid-cols-3 gap-2 md:grid-cols-6", className)}>
			<TooltipProvider>
				{Object.entries(iconPickerIcons).map(([name, Icon]) => (
					<Tooltip key={name} delayDuration={0}>
						<TooltipTrigger asChild>
							<button
								type="button"
								className={cn(
									"flex h-8 w-8 items-center justify-center rounded-lg border bg-background transition-all hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
									value === name
										? "border-primary"
										: "border-border hover:border-foreground [&:not(:hover)]:opacity-80",
								)}
								onClick={() => onChange?.(name as IconPickerIconType)}
							>
								<Icon className="h-3.5 w-3.5" />
							</button>
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
