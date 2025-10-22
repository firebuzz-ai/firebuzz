"use client";

import { Button } from "@firebuzz/ui/components/ui/button";
import { Label } from "@firebuzz/ui/components/ui/label";
import { useDesignModeTheme } from "@/components/providers/agent/design-mode";
import { useColorSelectorModal } from "@/hooks/ui/use-color-selector-modal";
import {
	formatColorName,
	getColorHexValue,
	getColorNameFromClass,
} from "@/lib/design-mode/color-utils";

export interface ColorControlsProps {
	textColor?: string;
	backgroundColor?: string;
	onTextColorChange: (color: string) => void;
	onBackgroundColorChange: (color: string) => void;
}

export const ColorControls = ({
	textColor,
	backgroundColor,
	onTextColorChange,
	onBackgroundColorChange,
}: ColorControlsProps) => {
	const { getSystemColors } = useDesignModeTheme();
	const { setState: setColorSelectorModalState } = useColorSelectorModal();
	const systemColors = getSystemColors();

	const handleTextColorClick = () => {
		const hexValue = getColorHexValue(textColor, systemColors);

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
					onTextColorChange(`text-${systemColor.name}`);
				} else {
					// Use arbitrary value for custom colors
					onTextColorChange(`text-[${selectedColor}]`);
				}
			},
		});
	};

	const handleBackgroundColorClick = () => {
		const hexValue = getColorHexValue(backgroundColor, systemColors);

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
					onBackgroundColorChange(`bg-${systemColor.name}`);
				} else {
					// Use arbitrary value for custom colors
					onBackgroundColorChange(`bg-[${selectedColor}]`);
				}
			},
		});
	};

	const textColorName = getColorNameFromClass(textColor);
	const textColorHex = getColorHexValue(textColor, systemColors);

	const backgroundColorName = getColorNameFromClass(backgroundColor);
	const backgroundColorHex = getColorHexValue(backgroundColor, systemColors);

	return (
		<div className="space-y-3">
			{/* Text Color */}
			<div className="space-y-1.5">
				<Label className="text-xs text-muted-foreground">Text Color</Label>
				<Button
					type="button"
					variant="outline"
					onClick={handleTextColorClick}
					className="flex items-center justify-start w-full h-8 gap-2 px-2 bg-muted"
				>
					{textColorHex ? (
						<div
							className="border rounded-sm size-5 shrink-0"
							style={{ backgroundColor: textColorHex }}
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
							{formatColorName(textColorName)}
						</div>
					</div>
				</Button>
			</div>

			{/* Background Color */}
			<div className="space-y-1.5">
				<Label className="text-xs text-muted-foreground">
					Background Color
				</Label>
				<Button
					type="button"
					variant="outline"
					onClick={handleBackgroundColorClick}
					className="flex items-center justify-start w-full h-8 gap-2 px-2 bg-muted"
				>
					{backgroundColorHex ? (
						<div
							className="border rounded-sm size-5 shrink-0"
							style={{ backgroundColor: backgroundColorHex }}
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
							{formatColorName(backgroundColorName)}
						</div>
					</div>
				</Button>
			</div>
		</div>
	);
};
