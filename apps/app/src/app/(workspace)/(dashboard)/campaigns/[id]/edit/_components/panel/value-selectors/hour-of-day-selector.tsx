"use client";

import { Label } from "@firebuzz/ui/components/ui/label";
import { Slider } from "@firebuzz/ui/components/ui/slider";
import { Toggle } from "@firebuzz/ui/components/ui/toggle";
import { Moon, Sun, Sunrise, Sunset } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";

interface HourOfDaySelectorProps {
	label?: string;
	value: number | number[] | [number, number];
	onChange: (value: number | number[] | [number, number]) => void;
	mode?: "single" | "multiple" | "range";
	description?: string;
	required?: boolean;
	showTimeLabels?: boolean;
	showPeriodHighlights?: boolean;
}

const TIME_PERIODS = [
	{
		id: "night",
		label: "Night",
		hours: [0, 1, 2, 3, 4, 5],
		icon: Moon,
		color: "text-blue-500",
	},
	{
		id: "morning",
		label: "Morning",
		hours: [6, 7, 8, 9, 10, 11],
		icon: Sunrise,
		color: "text-amber-500",
	},
	{
		id: "afternoon",
		label: "Afternoon",
		hours: [12, 13, 14, 15, 16, 17],
		icon: Sun,
		color: "text-yellow-500",
	},
	{
		id: "evening",
		label: "Evening",
		hours: [18, 19, 20, 21, 22, 23],
		icon: Sunset,
		color: "text-purple-500",
	},
];

export const HourOfDaySelector = ({
	label,
	value,
	onChange,
	mode = "single",
	description,
	required = false,
	showTimeLabels = true,
	showPeriodHighlights = true,
}: HourOfDaySelectorProps) => {
	const formatHour = (hour: number) => {
		const period = hour < 12 ? "AM" : "PM";
		const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
		return `${displayHour}${period}`;
	};

	const formatTime = (hour: number) => {
		return `${hour.toString().padStart(2, "0")}:00`;
	};

	// Handle different value types
	const getSelectedHours = (): number[] => {
		if (mode === "single") {
			return typeof value === "number" ? [value] : [];
		}
		if (mode === "range" && Array.isArray(value) && value.length === 2) {
			const [start, end] = value;
			const hours = [];
			for (let i = start; i <= end; i++) {
				hours.push(i);
			}
			return hours;
		}
		if (mode === "multiple" && Array.isArray(value)) {
			return value;
		}
		return [];
	};

	const selectedHours = getSelectedHours();

	const handleHourClick = (hour: number) => {
		if (mode === "single") {
			onChange(selectedHours.includes(hour) ? -1 : hour);
		} else if (mode === "multiple") {
			const newHours = selectedHours.includes(hour)
				? selectedHours.filter((h) => h !== hour)
				: [...selectedHours, hour].sort((a, b) => a - b);
			onChange(newHours);
		}
	};

	const handlePeriodClick = (periodHours: number[]) => {
		if (mode === "multiple") {
			const allSelected = periodHours.every((h) => selectedHours.includes(h));
			if (allSelected) {
				const newHours = selectedHours.filter((h) => !periodHours.includes(h));
				onChange(newHours);
			} else {
				const newHours = [...new Set([...selectedHours, ...periodHours])].sort(
					(a, b) => a - b,
				);
				onChange(newHours);
			}
		}
	};

	const handleRangeChange = (values: number[]) => {
		if (values.length === 2) {
			onChange([values[0], values[1]]);
		}
	};

	return (
		<div className="space-y-4">
			{label && (
				<Label>
					{label}
					{required && <span className="ml-1 text-destructive">*</span>}
				</Label>
			)}

			{mode === "range" ? (
				<div className="space-y-4">
					{/* Range slider */}
					<div className="px-3 py-4">
						<Slider
							value={
								Array.isArray(value) && value.length === 2 ? value : [0, 23]
							}
							onValueChange={handleRangeChange}
							min={0}
							max={23}
							step={1}
							className="w-full [&_[role=slider]]:bg-brand [&_[role=slider]]:border-brand [&_[role=slider]]:shadow-md [&_[data-disabled]]:pointer-events-none [&_[data-disabled]]:opacity-50"
						/>
					</div>

					{/* Range display */}
					<div className="flex justify-between items-center px-3 text-sm">
						<div className="text-muted-foreground">
							From:{" "}
							<span className="font-medium text-foreground">
								{formatTime(Array.isArray(value) ? value[0] : 0)}
							</span>
						</div>
						<div className="text-muted-foreground">
							To:{" "}
							<span className="font-medium text-foreground">
								{formatTime(Array.isArray(value) ? value[1] : 23)}
							</span>
						</div>
					</div>

					{/* Hour labels for range */}
					<div className="flex justify-between px-3 text-xs text-muted-foreground">
						<span>00:00</span>
						<span>06:00</span>
						<span>12:00</span>
						<span>18:00</span>
						<span>23:00</span>
					</div>
				</div>
			) : (
				<div className="space-y-3">
					{/* Period quick selects */}
					{showPeriodHighlights && mode === "multiple" && (
						<div className="grid grid-cols-4 gap-2 pb-4 mb-4 border-b">
							{TIME_PERIODS.map((period) => {
								const Icon = period.icon;
								const allSelected = period.hours.every((h) =>
									selectedHours.includes(h),
								);
								return (
									<button
										key={period.id}
										type="button"
										onClick={() => handlePeriodClick(period.hours)}
										className={cn(
											"flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors bg-muted",
											allSelected && "bg-brand/5 text-brand border-brand",
										)}
									>
										<Icon
											className={cn("size-5", !allSelected && period.color)}
										/>
										<span className="text-xs font-medium">{period.label}</span>
										<span className="text-[10px] opacity-70">
											{formatHour(period.hours[0])}-
											{formatHour(period.hours[period.hours.length - 1])}
										</span>
									</button>
								);
							})}
						</div>
					)}

					{/* Hour grid */}
					<div className="grid grid-cols-6 gap-1 rounded-lg bg-muted/30">
						{Array.from({ length: 24 }, (_, index) => {
							const hour = index;
							const isSelected = selectedHours.includes(hour);
							const period = TIME_PERIODS.find((p) => p.hours.includes(hour));
							return (
								<Toggle
									key={`hour-toggle-${hour}`}
									pressed={isSelected}
									onPressedChange={() => handleHourClick(hour)}
									className={cn(
										"h-10 text-xs font-medium transition-all border",
										"data-[state=on]:bg-brand/5 data-[state=on]:text-brand data-[state=on]:border-brand",
										!isSelected &&
											showPeriodHighlights &&
											period &&
											period.color.replace("hover:", ""),
									)}
								>
									<div className="flex flex-col gap-0.5">
										<span className="font-semibold">{hour}</span>
										{showTimeLabels && (
											<span className="text-[9px] opacity-70">
												{formatHour(hour)}
											</span>
										)}
									</div>
								</Toggle>
							);
						})}
					</div>
				</div>
			)}

			{/* Selected hours summary */}
			{selectedHours.length > 0 && mode !== "range" && (
				<div className="text-sm text-muted-foreground">
					<span className="font-medium">Selected hours: </span>
					{selectedHours.length === 24
						? "All day"
						: selectedHours.length > 12
							? `${selectedHours.length} hours selected`
							: selectedHours.map((h) => formatTime(h)).join(", ")}
				</div>
			)}

			{description && (
				<p className="text-sm text-muted-foreground">{description}</p>
			)}
		</div>
	);
};
