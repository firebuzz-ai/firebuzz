/**
 * Utilities for converting between database font schema and design mode font format
 */

import type { Infer } from "convex/values";
import type { fontSchema } from "./schema";

type FontRecord = Infer<typeof fontSchema>;

/**
 * Design mode font format (simple key-value pairs)
 */
export interface DesignModeFonts {
	sans: string;
	serif: string;
	mono: string;
}

/**
 * Convert database font array to design mode format
 * Example:
 *   [{ family: "sans", name: "Inter", type: "google" }]
 *   -> { sans: "Inter", serif: "Georgia", mono: "JetBrains Mono" }
 */
export function fontsToDesignMode(fonts?: FontRecord[]): DesignModeFonts {
	const defaults: DesignModeFonts = {
		sans: "Inter",
		serif: "Georgia",
		mono: "JetBrains Mono",
	};

	if (!fonts || fonts.length === 0) {
		return defaults;
	}

	const result: DesignModeFonts = { ...defaults };

	for (const font of fonts) {
		if (
			font.family === "sans" ||
			font.family === "serif" ||
			font.family === "mono"
		) {
			result[font.family] = font.name;
		}
	}

	return result;
}

/**
 * Convert design mode font format to database font array
 * Example:
 *   { sans: "Inter", serif: "Georgia", mono: "Fira Code" }
 *   -> [
 *        { family: "sans", name: "Inter", type: "google" },
 *        { family: "serif", name: "Georgia", type: "system" },
 *        { family: "mono", name: "Fira Code", type: "google" }
 *      ]
 */
export function fontsFromDesignMode(fonts: DesignModeFonts): FontRecord[] {
	return [
		{
			family: "sans" as const,
			name: fonts.sans,
			type: inferFontType(fonts.sans),
		},
		{
			family: "serif" as const,
			name: fonts.serif,
			type: inferFontType(fonts.serif),
		},
		{
			family: "mono" as const,
			name: fonts.mono,
			type: inferFontType(fonts.mono),
		},
	];
}

/**
 * Infer font type based on font name
 * This is a simple heuristic - you may want to enhance this with a proper font database
 */
function inferFontType(fontName: string): "google" | "system" | "custom" {
	// Common system fonts
	const systemFonts = [
		"Arial",
		"Helvetica",
		"Times New Roman",
		"Times",
		"Courier New",
		"Courier",
		"Verdana",
		"Georgia",
		"Palatino",
		"Garamond",
		"Bookman",
		"Comic Sans MS",
		"Trebuchet MS",
		"Impact",
		"Lucida Console",
		"Monaco",
		"Consolas",
	];

	if (systemFonts.includes(fontName)) {
		return "system";
	}

	// If it contains a URL or file path, it's custom
	if (
		fontName.includes("http") ||
		fontName.includes(".woff") ||
		fontName.includes(".ttf")
	) {
		return "custom";
	}

	// Default to Google Fonts (most common for web)
	return "google";
}
