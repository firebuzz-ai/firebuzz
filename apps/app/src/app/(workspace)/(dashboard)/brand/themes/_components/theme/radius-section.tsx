"use client";

import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@firebuzz/ui/components/ui/form";
import { Slider } from "@firebuzz/ui/components/ui/slider";
import { cn } from "@firebuzz/ui/lib/utils";
import { RADIUS_OPTIONS } from "@/lib/theme/constants";

// SVG component for radius visualization
const RadiusIcon = ({ radius }: { radius: string }) => {
	// Handle numeric values and convert to SVG border radius
	const getRadiusValue = (radiusValue: string) => {
		if (radiusValue === "0") return "0";
		if (radiusValue === "0.5rem") return "2";
		if (radiusValue === "1rem") return "3";
		if (radiusValue === "1.5rem") return "4";
		if (radiusValue === "2rem") return "5";

		// For custom values, parse and scale appropriately
		if (radiusValue.includes("rem")) {
			const numValue = Number.parseFloat(radiusValue.replace("rem", ""));
			return Math.max(0, Math.min(6, numValue * 2)).toString();
		}

		return "3"; // Default fallback
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

interface RadiusSectionProps {
	// biome-ignore lint/suspicious/noExplicitAny: Control type not available from form library
	control: any; // Control from form hook
	// biome-ignore lint/suspicious/noExplicitAny: SetValue type not available from form library
	setValue: any; // SetValue function from form hook
	isLoading: boolean;
}

export const RadiusSection = ({
	control,
	setValue,
	isLoading,
}: RadiusSectionProps) => {
	// Convert slider value (0-3) to rem string
	const convertSliderToRem = (value: number) => `${value}rem`;

	// Convert rem string to slider value (0-3)
	const convertRemToSlider = (remValue: string) => {
		const numValue = Number.parseFloat(remValue.replace("rem", ""));
		return Math.max(0, Math.min(3, numValue));
	};

	return (
		<div className="px-4 py-8 space-y-6">
			<div>
				<h2 className="text-lg font-medium">Border Radius</h2>
				<p className="text-sm text-muted-foreground">
					Configure the roundness of corners for your theme
				</p>
			</div>
			<div className="space-y-4">
				<FormField
					control={control}
					name="lightTheme.radius"
					render={({ field }) => {
						const currentSliderValue = convertRemToSlider(field.value);

						return (
							<FormItem>
								<FormLabel>Corner Roundness</FormLabel>
								<FormControl>
									<div className="space-y-4">
										{/* Preset options */}
										<div className="grid grid-cols-2 gap-3">
											{RADIUS_OPTIONS.map((option, index) => (
												<button
													key={option.value}
													type="button"
													onClick={() => {
														field.onChange(option.value);
														// Also update dark theme to keep them in sync
														setValue("darkTheme.radius", option.value, {
															shouldDirty: true,
															shouldTouch: true,
														});
													}}
													className={cn(
														"flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 text-left",
														"hover:border-border hover:bg-muted/30",
														"focus:outline-none focus:ring-0",
														// Make XLarge (last item) span full width
														index === RADIUS_OPTIONS.length - 1
															? "col-span-full"
															: "",
														field.value === option.value
															? "border-brand bg-brand/5 hover:border-brand/50 hover:bg-brand/10 text-brand"
															: "border-border/40 text-foreground",
													)}
													disabled={isLoading}
												>
													<RadiusIcon radius={option.value} />
													<div className="flex-1 min-w-0">
														<div className="text-sm font-medium">
															{option.label}
														</div>
														<div
															className={cn(
																"text-xs text-muted-foreground",
																field.value === option.value
																	? "text-brand/50"
																	: "text-muted-foreground",
															)}
														>
															{option.description}
														</div>
													</div>
												</button>
											))}
										</div>

										{/* Always visible slider for fine-tuning */}
										<div
											className={cn(
												"p-4 space-y-3 border rounded-lg bg-muted/20",
											)}
										>
											<div className="flex items-center justify-between">
												<div className="text-sm font-medium text-foreground">
													Fine-tune Radius
												</div>
												<span className="text-xs text-muted-foreground">
													{field.value}
												</span>
											</div>
											<Slider
												value={[currentSliderValue]}
												onValueChange={(values) => {
													const newValue = values[0];
													const remValue = convertSliderToRem(newValue);
													field.onChange(remValue);
													setValue("darkTheme.radius", remValue, {
														shouldDirty: true,
														shouldTouch: true,
													});
												}}
												min={0}
												max={3}
												step={0.05}
												className="w-full"
												disabled={isLoading}
											/>
											<div className="flex justify-between text-xs text-muted-foreground">
												<span>0rem</span>
												<span>3rem</span>
											</div>
										</div>
									</div>
								</FormControl>

								<FormMessage />
							</FormItem>
						);
					}}
				/>
			</div>
		</div>
	);
};
