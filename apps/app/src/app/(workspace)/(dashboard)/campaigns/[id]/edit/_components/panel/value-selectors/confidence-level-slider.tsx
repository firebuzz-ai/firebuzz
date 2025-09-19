"use client";

import { Badge } from "@firebuzz/ui/components/ui/badge";
import { cn } from "@firebuzz/ui/lib/utils";

interface ConfidenceLevelSliderProps {
	value: 90 | 95 | 99;
	onValueChange: (value: 90 | 95 | 99) => void;
	disabled?: boolean;
	className?: string;
}

const confidenceLevels = [
	{
		value: 90,
		label: "90%",
		description: "Moderate - faster results, higher risk of false positives",
		color: "bg-primary",
	},
	{
		value: 95,
		label: "95%",
		description: "Standard - balanced approach, industry standard",
		color: "bg-blue-500",
	},
	{
		value: 99,
		label: "99%",
		description: "High - slower results, minimal risk of false positives",
		color: "bg-emerald-600",
	},
] as const;

export const ConfidenceLevelSlider = ({
	value,
	onValueChange,
	disabled = false,
	className,
}: ConfidenceLevelSliderProps) => {
	const currentLevel =
		confidenceLevels.find((level) => level.value === value) ||
		confidenceLevels[1];

	// Map confidence levels to slider positions (0, 1, 2)
	const getSliderPosition = (confidenceValue: 90 | 95 | 99) => {
		switch (confidenceValue) {
			case 90:
				return 0;
			case 95:
				return 1;
			case 99:
				return 2;
			default:
				return 1;
		}
	};

	const getConfidenceFromPosition = (position: number): 90 | 95 | 99 => {
		if (position < 0.5) return 90;
		if (position < 1.5) return 95;
		return 99;
	};

	const handleSliderChange = (values: number[]) => {
		const position = values[0];
		const newConfidence = getConfidenceFromPosition(position);
		onValueChange(newConfidence);
	};

	return (
		<div className={cn("space-y-4", className)}>
			{/* Header with current selection */}
			<div className="flex justify-between items-center">
				<span className="text-sm font-medium">Confidence Level</span>
				<Badge variant="outline" className="bg-muted">
					{currentLevel.label}
				</Badge>
			</div>

			{/* Slider */}
			<div className="space-y-3">
				<div className="relative">
					{/* Custom slider track */}
					<div className="w-full h-2 rounded-full bg-muted">
						{/* Fill based on current position */}
						<div
							className={cn(
								"h-full rounded-full transition-all duration-200",
								currentLevel.color,
							)}
							style={{
								width: `${(getSliderPosition(value) / 2) * 100}%`,
							}}
						/>
					</div>

					{/* Slider thumb */}
					<input
						type="range"
						min={0}
						max={2}
						step={1}
						value={getSliderPosition(value)}
						onChange={(e) =>
							handleSliderChange([Number.parseInt(e.target.value)])
						}
						disabled={disabled}
						className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer disabled:cursor-not-allowed"
					/>

					{/* Custom thumb indicator */}
					<div
						className={cn(
							"absolute top-1/2 w-5 h-5 rounded-full border-2 border-background shadow-md transition-all duration-200 transform -translate-y-1/2 -translate-x-1/2 pointer-events-none",
							currentLevel.color,
							disabled && "opacity-50",
						)}
						style={{
							left: `${(getSliderPosition(value) / 2) * 100}%`,
						}}
					/>
				</div>

				{/* Level indicators */}
				<div className="relative">
					<div className="flex justify-between">
						{confidenceLevels.map((level) => (
							<div
								key={level.value}
								className={cn(
									"flex flex-col items-center transition-opacity",
									level.value === value ? "opacity-100" : "opacity-50",
								)}
							>
								<div className="text-xs font-medium text-center">
									{level.label}
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Description */}
			<div className="p-3 rounded-lg bg-muted">
				<p className="text-xs text-muted-foreground leading-relaxed">
					<span
						className={cn(
							"font-medium",
							currentLevel.color.replace("bg-", "text-"),
						)}
					>
						{currentLevel.description.split(" - ")[0]}
					</span>
					{currentLevel.description.split(" - ")[1] && " - "}
					{currentLevel.description.split(" - ")[1]}
				</p>
			</div>
		</div>
	);
};
