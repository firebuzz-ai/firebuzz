import { cn } from "@firebuzz/ui/lib/utils";
import { Plus } from "lucide-react";
import { type ColorPickerColorType, colorPickerColors } from "./color-picker";
import { type IconPickerIconType, iconPickerIcons } from "./icon-picker";

interface ColoredIconPreviewProps {
	color?: ColorPickerColorType;
	icon?: IconPickerIconType;
	className?: string;
	iconClassName?: string;
}

export const ColoredIconPreview = ({
	color,
	icon,
	className,
	iconClassName,
}: ColoredIconPreviewProps) => {
	const Icon = icon ? iconPickerIcons[icon] : Plus;

	return (
		<div
			className={cn(
				"flex h-9 w-9 items-center justify-center rounded-lg transition-all border border-border",
				color ? colorPickerColors[color].class : "bg-muted",
				className,
			)}
		>
			<Icon
				className={cn(
					"h-5 w-5",
					color ? "text-white" : "text-muted-foreground",
					iconClassName,
				)}
			/>
		</div>
	);
};
