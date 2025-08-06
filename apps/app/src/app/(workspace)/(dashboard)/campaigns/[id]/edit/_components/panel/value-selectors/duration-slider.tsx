"use client";

import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Label } from "@firebuzz/ui/components/ui/label";
import { Slider } from "@firebuzz/ui/components/ui/slider";
import { cn } from "@firebuzz/ui/lib/utils";
import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";

interface DurationSliderProps {
	label: string;
	value: number;
	min: number;
	max: number;
	step?: number;
	unit: "minutes" | "days";
	description?: string;
	onChange: (value: number) => void;
	className?: string;
}

export const DurationSlider = ({
	label,
	value,
	min,
	max,
	step = 1,
	unit,
	description,
	onChange,
	className,
}: DurationSliderProps) => {
	const [localValue, setLocalValue] = useState(value);

	// Debounce the onChange to avoid excessive network calls
	const debouncedOnChange = useDebouncedCallback(
		(newValue: number) => {
			onChange(newValue);
		},
		300, // 300ms delay
	);

	// Update localValue when the external value changes
	if (value !== localValue && !debouncedOnChange.isPending()) {
		setLocalValue(value);
	}

	const formatValue = (val: number) => {
		if (unit === "minutes") {
			if (val === 1) return "1 minute";
			if (val < 60) return `${val} minutes`;

			const hours = Math.floor(val / 60);
			const remainingMinutes = val % 60;

			if (remainingMinutes === 0) {
				return hours === 1 ? "1 hour" : `${hours} hours`;
			}

			return `${hours}h ${remainingMinutes}m`;
		}

		return val === 1 ? "1 day" : `${val} days`;
	};

	const handleValueChange = (values: number[]) => {
		const clampedValue = Math.max(min, Math.min(max, values[0]));
		setLocalValue(clampedValue);
		debouncedOnChange(clampedValue);
	};

	return (
		<div className={cn("space-y-3", className)}>
			<div className="flex justify-between items-center">
				<Label className="text-sm font-medium">{label}</Label>
				<Badge variant="outline" className="text-xs">
					{formatValue(localValue)}
				</Badge>
			</div>

			<div className="px-1">
				<Slider
					value={[localValue]}
					onValueChange={handleValueChange}
					min={min}
					max={max}
					step={step}
					className="w-full"
				/>

				{/* Range indicators */}
				<div className="flex justify-between mt-2 text-xs text-muted-foreground">
					<span>{formatValue(min)}</span>
					<span>{formatValue(max)}</span>
				</div>
			</div>

			{description && (
				<p className="text-xs leading-relaxed text-muted-foreground">
					{description}
				</p>
			)}
		</div>
	);
};
