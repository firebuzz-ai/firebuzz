import {
	Background as BackgroundComponent,
	BackgroundVariant,
} from "@xyflow/react";

export const Background = ({
	variant = BackgroundVariant.Dots,
	gap = 10,
	size = 1,
	color = "hsla(var(--primary) / 0.3)",
}: {
	variant?: BackgroundVariant;
	gap?: number;
	size?: number;
	color?: string;
}) => {
	return (
		<BackgroundComponent
			variant={variant}
			gap={gap}
			size={size}
			color={color}
		/>
	);
};
