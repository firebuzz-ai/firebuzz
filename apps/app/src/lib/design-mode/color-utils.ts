/**
 * Shared color utility functions for design mode
 * Used across color-controls, border-controls, and other components
 */

export interface SystemColor {
	name: string;
	displayName: string;
	hexValue: string;
	category: string;
	description: string;
}

/**
 * Convert kebab-case to camelCase
 * Example: "muted-foreground" -> "mutedForeground"
 */
export const kebabToCamel = (str: string): string => {
	return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
};

/**
 * Extract color name from Tailwind class
 * Example: "text-primary" -> "primary", "bg-[#ff0000]" -> "#ff0000"
 */
export const getColorNameFromClass = (colorClass?: string): string => {
	if (!colorClass) return "None";

	// Handle arbitrary values like text-[#ff0000]
	if (colorClass.includes("[")) {
		const match = colorClass.match(/\[([^\]]+)\]/);
		return match ? match[1] : "Custom";
	}

	// Extract color from class like "text-primary" or "bg-blue-500"
	const parts = colorClass.split("-");
	if (parts.length >= 2) {
		// Remove prefix (text, bg, border) and return kebab-case
		return parts.slice(1).join("-");
	}

	return colorClass;
};

/**
 * Get hex value for a color class by looking up in system colors
 * Example: "text-primary" -> "#000000" (from theme)
 */
export const getColorHexValue = (
	colorClass?: string,
	systemColors: SystemColor[] = [],
): string | undefined => {
	if (!colorClass) return undefined;

	// Handle arbitrary values
	if (colorClass.includes("[")) {
		const match = colorClass.match(/\[([^\]]+)\]/);
		return match ? match[1] : undefined;
	}

	// Extract color name in kebab-case (e.g., "muted-foreground")
	const colorNameKebab = getColorNameFromClass(colorClass);

	// Convert to camelCase to match theme object keys (e.g., "mutedForeground")
	const colorNameCamel = kebabToCamel(colorNameKebab);

	// Look up in system colors by camelCase name
	const systemColor = systemColors.find((c) => c.name === colorNameCamel);
	if (systemColor) {
		return systemColor.hexValue;
	}

	return undefined;
};

/**
 * Format color name for display (remove hyphens, will be capitalized by CSS)
 * Example: "muted-foreground" -> "muted foreground"
 */
export const formatColorName = (name: string): string => {
	return name.replace(/-/g, " ");
};
