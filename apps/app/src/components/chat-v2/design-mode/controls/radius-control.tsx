"use client";

import { RADIUS_OPTIONS } from "@/lib/theme/constants";
import { Label } from "@firebuzz/ui/components/ui/label";
import { SliderWithLabel } from "@firebuzz/ui/components/ui/slider-with-label";
import { cn } from "@firebuzz/ui/lib/utils";

// SVG component for radius visualization
const RadiusIcon = ({ radius }: { radius: string }) => {
	const getRadiusValue = (radiusValue: string) => {
		if (radiusValue === "0") return "0";
		if (radiusValue === "0.5rem") return "2";
		if (radiusValue === "1rem") return "3";
		if (radiusValue === "1.5rem") return "4";
		if (radiusValue === "2rem") return "5";

		if (radiusValue.includes("rem")) {
			const numValue = Number.parseFloat(radiusValue.replace("rem", ""));
			return Math.max(0, Math.min(6, numValue * 2)).toString();
		}

		return "3";
	};

	const borderRadius = getRadiusValue(radius);

	return (
		<svg
			width="24"
			height="16"
			viewBox="0 0 24 16"
			fill="none"
			className="shrink-0"
		>
			<rect
				x="2"
				y="2"
				width="20"
				height="12"
				rx={borderRadius}
				ry={borderRadius}
				fill="var(--brand)"
				stroke="currentColor"
				strokeWidth="1"
			/>
		</svg>
	);
};

interface RadiusControlProps {
	currentRadius: string;
	onRadiusChange: (radius: string) => void;
	isLoading: boolean;
}

export const RadiusControl = ({
	currentRadius,
	onRadiusChange,
	isLoading,
}: RadiusControlProps) => {
	// Convert slider value (0-3) to rem string
	const convertSliderToRem = (value: number) => `${value}rem`;

	// Convert rem string to slider value (0-3)
	const convertRemToSlider = (remValue: string) => {
		const numValue = Number.parseFloat(remValue.replace("rem", ""));
		return Math.max(0, Math.min(3, numValue));
	};

	const currentSliderValue = convertRemToSlider(currentRadius);

	return (
		<div className="px-2 py-4 space-y-4 border-b">
			<div>
				<h3 className="text-sm font-medium">Border Radius</h3>
				<p className="text-xs text-muted-foreground">
					Configure the roundness of corners
				</p>
			</div>

			<div className="space-y-4">
				{/* Preset options */}
				<div className="grid grid-cols-2 gap-4">
					{RADIUS_OPTIONS.map((option, index) => (
						<button
							key={option.value}
							type="button"
							onClick={() => onRadiusChange(option.value)}
							className={cn(
								"flex items-center gap-3 p-3 rounded-lg border bg-muted transition-all duration-200 text-left",
								"hover:border-border hover:bg-muted/30",
								"focus:outline-none focus:ring-0",
								index === RADIUS_OPTIONS.length - 1 ? "col-span-full" : "",
								currentRadius === option.value &&
									"border-primary bg-primary/5 hover:border-primary/50 hover:bg-primary/10 text-primary",
							)}
							disabled={isLoading}
						>
							<RadiusIcon radius={option.value} />
							<div className="flex-1 min-w-0">
								<div className="text-sm font-medium">{option.label}</div>
								<div
									className={cn(
										"text-xs text-muted-foreground",
										currentRadius === option.value
											? "text-primary/50"
											: "text-muted-foreground",
									)}
								>
									{option.description}
								</div>
							</div>
						</button>
					))}
				</div>

				{/* Slider for fine-tuning */}
				<div className="p-4 space-y-3 rounded-lg border bg-muted">
					<div className="flex justify-between items-center">
						<Label className="text-sm font-medium text-foreground">
							Fine-tune Radius
						</Label>
					</div>
					<SliderWithLabel
						value={[currentSliderValue]}
						onValueChange={(values) => {
							const newValue = values[0];
							const remValue = convertSliderToRem(newValue);
							onRadiusChange(remValue);
						}}
						min={0}
						max={3}
						step={0.05}
						className="w-full"
						disabled={isLoading}
						formatLabel={(value) => `${value.toFixed(2)}rem`}
					/>
					<div className="flex justify-between text-xs text-muted-foreground">
						<span>0rem</span>
						<span>3rem</span>
					</div>
				</div>
			</div>
		</div>
	);
};
