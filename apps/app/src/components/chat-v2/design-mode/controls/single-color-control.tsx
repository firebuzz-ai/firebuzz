"use client";

import { Button } from "@firebuzz/ui/components/ui/button";
import { Label } from "@firebuzz/ui/components/ui/label";
import { useDesignMode } from "@/hooks/agent/use-design-mode";
import { useColorSelectorModal } from "@/hooks/ui/use-color-selector-modal";
import {
	formatColorName,
	getColorHexValue,
	getColorNameFromClass,
} from "@/lib/design-mode/color-utils";

export interface SingleColorControlProps {
	label: string;
	color?: string;
	onChange: (color: string) => void;
	/**
	 * Prefix for the Tailwind class (e.g., "text", "bg", "border")
	 */
	classPrefix: string;
}

export const SingleColorControl = ({
	label,
	color,
	onChange,
	classPrefix,
}: SingleColorControlProps) => {
	const { getSystemColors } = useDesignMode();
	const { setState: setColorSelectorModalState } = useColorSelectorModal();
	const systemColors = getSystemColors();

	const handleColorClick = () => {
		const hexValue = getColorHexValue(color, systemColors);

		setColorSelectorModalState({
			isOpen: true,
			color: hexValue,
			activeTab: "system" as const,
			systemColors: systemColors.map((c) => ({
				name: c.name,
				displayName: c.displayName,
				hexValue: c.hexValue,
				category: c.category,
				description: c.description,
			})),
			onSelect: (selectedColor: string) => {
				// Find if this is a system color
				const systemColor = systemColors.find(
					(c) => c.hexValue === selectedColor,
				);
				if (systemColor) {
					// Use Tailwind class for system colors
					onChange(`${classPrefix}-${systemColor.name}`);
				} else {
					// Use arbitrary value for custom colors
					onChange(`${classPrefix}-[${selectedColor}]`);
				}
			},
		});
	};

	const colorName = getColorNameFromClass(color);
	const colorHex = getColorHexValue(color, systemColors);

	return (
		<div className="space-y-1.5">
			<Label className="text-xs text-muted-foreground">{label}</Label>
			<Button
				type="button"
				variant="outline"
				onClick={handleColorClick}
				className="flex items-center justify-start w-full h-8 gap-2 px-2 bg-muted"
			>
				{colorHex ? (
					<div
						className="border rounded-sm size-5 shrink-0"
						style={{ backgroundColor: colorHex }}
					/>
				) : (
					<div className="relative border rounded-sm size-5 shrink-0 bg-gradient-to-br from-muted to-muted-foreground/20">
						<div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
							—
						</div>
					</div>
				)}
				<div className="flex-1 min-w-0 text-left">
					<div className="text-xs font-medium capitalize truncate">
						{formatColorName(colorName)}
					</div>
				</div>
			</Button>
		</div>
	);
};
