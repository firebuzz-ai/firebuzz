/**
 * Utilities for theme management in design mode
 */

import type { ThemeFormType } from "@/app/(workspace)/(dashboard)/brand/themes/_components/theme/form";

/**
 * Convert theme form values to CSS variables
 */
export function themeToVariables(
	theme: ThemeFormType,
	mode: "light" | "dark",
): Record<string, string> {
	const themeData = mode === "light" ? theme.lightTheme : theme.darkTheme;

	const variables: Record<string, string> = {};

	// Color variables - convert camelCase to kebab-case
	for (const [key, value] of Object.entries(themeData)) {
		if (key === "radius") continue; // Handle separately

		// Convert camelCase to kebab-case
		const kebabKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
		variables[`--${kebabKey}`] = value;
	}

	// Radius (only in light theme)
	if (mode === "light" && theme.lightTheme.radius) {
		variables["--radius"] = theme.lightTheme.radius;
	}

	// Font family variables (always in light mode, not duplicated in dark)
	if (mode === "light" && theme.fonts) {
		variables["--font-sans"] = theme.fonts.sans;
		variables["--font-serif"] = theme.fonts.serif;
		variables["--font-mono"] = theme.fonts.mono;
	}

	return variables;
}

/**
 * Send theme update to iframe
 * Sends both light and dark theme variables + font information
 */
export function sendThemeToIframe(
	iframeRef: React.RefObject<HTMLIFrameElement | null>,
	theme: ThemeFormType,
) {
	if (!iframeRef.current?.contentWindow) {
		return;
	}

	// Send both light and dark variables - CSS will use the appropriate one based on .dark class
	const lightVariables = themeToVariables(theme, "light");
	const darkVariables = themeToVariables(theme, "dark");

	iframeRef.current.contentWindow.postMessage(
		{
			type: "FB_UPDATE_THEME",
			theme: {
				lightVariables,
				darkVariables,
			},
		},
		"*",
	);
}
