/**
 * Utilities for parsing and updating Tailwind className strings
 */

import { getTailwindClassesForCategory } from "./tailwind-mappings";

export interface ParsedClasses {
	// Typography
	fontFamily?: string;
	fontSize?: string;
	fontWeight?: string;
	lineHeight?: string;
	letterSpacing?: string;
	textAlign?: string;
	textDecoration?: string;
	fontStyle?: string;

	// Colors
	textColor?: string;
	backgroundColor?: string;
	borderColor?: string;

	// Layout
	display?: string;
	flexDirection?: string;
	justifyContent?: string;
	alignItems?: string;
	gap?: string;
	gridCols?: string;
	gridRows?: string;
	spaceX?: string;
	spaceY?: string;

	// Spacing - Individual sides
	marginTop?: string;
	marginRight?: string;
	marginBottom?: string;
	marginLeft?: string;
	paddingTop?: string;
	paddingRight?: string;
	paddingBottom?: string;
	paddingLeft?: string;
	// Spacing - Axis-based
	marginX?: string; // mx-*
	marginY?: string; // my-*
	paddingX?: string; // px-*
	paddingY?: string; // py-*
	// Spacing - Unified
	margin?: string; // m-*
	padding?: string; // p-*

	// Border - Individual sides
	borderTopWidth?: string; // border-t, border-t-2, etc.
	borderRightWidth?: string; // border-r, border-r-2, etc.
	borderBottomWidth?: string; // border-b, border-b-2, etc.
	borderLeftWidth?: string; // border-l, border-l-2, etc.
	// Border - Axis-based
	borderXWidth?: string; // border-x, border-x-2, etc.
	borderYWidth?: string; // border-y, border-y-2, etc.
	// Border - Unified
	borderWidth?: string; // border, border-2, etc.
	// Border - Other properties
	borderStyle?: string;
	borderColor?: string;
	borderRadius?: string;

	// Appearance
	opacity?: string;
	shadow?: string;

	// Size
	width?: string;
	height?: string;
	minWidth?: string;
	maxWidth?: string;
	minHeight?: string;
	maxHeight?: string;

	// Other classes not categorized
	other: string[];
}

/**
 * Parse a className string into categorized properties
 */
export function parseClassName(className: string): ParsedClasses {
	const classes = className.split(" ").filter(Boolean);

	const parsed: ParsedClasses = {
		other: [],
	};

	for (const cls of classes) {
		// Typography
		if (
			cls.startsWith("font-") &&
			["font-sans", "font-serif", "font-mono"].includes(cls)
		) {
			parsed.fontFamily = cls;
		} else if (
			cls.startsWith("text-") &&
			cls.match(/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/)
		) {
			parsed.fontSize = cls;
		} else if (
			cls.startsWith("font-") &&
			[
				"font-thin",
				"font-extralight",
				"font-light",
				"font-normal",
				"font-medium",
				"font-semibold",
				"font-bold",
				"font-extrabold",
				"font-black",
			].includes(cls)
		) {
			parsed.fontWeight = cls;
		} else if (cls.startsWith("leading-")) {
			parsed.lineHeight = cls;
		} else if (cls.startsWith("tracking-")) {
			parsed.letterSpacing = cls;
		} else if (cls.match(/^text-(left|center|right|justify)$/)) {
			parsed.textAlign = cls;
		} else if (["underline", "line-through", "overline"].includes(cls)) {
			parsed.textDecoration = cls;
		} else if (cls === "italic") {
			parsed.fontStyle = cls;
		}
		// Colors
		else if (
			cls.startsWith("text-") &&
			!cls.match(/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/)
		) {
			parsed.textColor = cls;
		} else if (cls.startsWith("bg-")) {
			parsed.backgroundColor = cls;
		} else if (
			cls.startsWith("border-") &&
			!cls.match(/^border-(\d+|solid|dashed|dotted|double|none)$/)
		) {
			parsed.borderColor = cls;
		}
		// Layout
		else if (
			[
				"block",
				"inline-block",
				"inline",
				"flex",
				"inline-flex",
				"grid",
				"inline-grid",
				"hidden",
			].includes(cls)
		) {
			parsed.display = cls;
		} else if (
			cls.startsWith("flex-") &&
			["flex-row", "flex-row-reverse", "flex-col", "flex-col-reverse"].includes(
				cls,
			)
		) {
			parsed.flexDirection = cls;
		} else if (cls.startsWith("justify-")) {
			parsed.justifyContent = cls;
		} else if (cls.startsWith("items-")) {
			parsed.alignItems = cls;
		} else if (cls.startsWith("gap-")) {
			parsed.gap = cls;
		}
		// Grid
		else if (cls.match(/^grid-cols-(none|subgrid|\d{1,2})$/)) {
			parsed.gridCols = cls;
		} else if (cls.match(/^grid-rows-(none|subgrid|[1-6])$/)) {
			parsed.gridRows = cls;
		}
		// Space between
		else if (cls.match(/^-?space-x-/)) {
			parsed.spaceX = cls;
		} else if (cls.match(/^-?space-y-/)) {
			parsed.spaceY = cls;
		}
		// Spacing - Margin (unified takes priority, then axis, then individual)
		else if (cls.match(/^-?m-/)) {
			parsed.margin = cls;
		} else if (cls.match(/^-?mx-/)) {
			parsed.marginX = cls;
		} else if (cls.match(/^-?my-/)) {
			parsed.marginY = cls;
		} else if (cls.startsWith("mt-") || cls.startsWith("-mt-")) {
			parsed.marginTop = cls;
		} else if (cls.startsWith("mr-") || cls.startsWith("-mr-")) {
			parsed.marginRight = cls;
		} else if (cls.startsWith("mb-") || cls.startsWith("-mb-")) {
			parsed.marginBottom = cls;
		} else if (cls.startsWith("ml-") || cls.startsWith("-ml-")) {
			parsed.marginLeft = cls;
		}
		// Spacing - Padding (unified takes priority, then axis, then individual)
		else if (cls.match(/^p-/)) {
			parsed.padding = cls;
		} else if (cls.match(/^px-/)) {
			parsed.paddingX = cls;
		} else if (cls.match(/^py-/)) {
			parsed.paddingY = cls;
		} else if (cls.startsWith("pt-")) {
			parsed.paddingTop = cls;
		} else if (cls.startsWith("pr-")) {
			parsed.paddingRight = cls;
		} else if (cls.startsWith("pb-")) {
			parsed.paddingBottom = cls;
		} else if (cls.startsWith("pl-")) {
			parsed.paddingLeft = cls;
		}
		// Border - Width (unified takes priority, then axis, then individual)
		else if (cls.match(/^border(-\d+)?$/) && !cls.match(/^border-[trblxy]-/)) {
			parsed.borderWidth = cls;
		} else if (cls.match(/^border-x(-\d+)?$/)) {
			parsed.borderXWidth = cls;
		} else if (cls.match(/^border-y(-\d+)?$/)) {
			parsed.borderYWidth = cls;
		} else if (cls.match(/^border-t(-\d+)?$/)) {
			parsed.borderTopWidth = cls;
		} else if (cls.match(/^border-r(-\d+)?$/)) {
			parsed.borderRightWidth = cls;
		} else if (cls.match(/^border-b(-\d+)?$/)) {
			parsed.borderBottomWidth = cls;
		} else if (cls.match(/^border-l(-\d+)?$/)) {
			parsed.borderLeftWidth = cls;
		}
		// Border - Style
		else if (cls.match(/^border-(solid|dashed|dotted|double|none)$/)) {
			parsed.borderStyle = cls;
		}
		// Border - Radius
		else if (cls.startsWith("rounded")) {
			parsed.borderRadius = cls;
		}
		// Appearance - Opacity
		else if (cls.match(/^opacity-\d+$/)) {
			parsed.opacity = cls;
		}
		// Appearance - Shadow
		else if (cls.match(/^shadow(-none|-xs|-sm|-md|-lg|-xl|-2xl)?$/)) {
			parsed.shadow = cls;
		}
		// Size - Width
		else if (cls.match(/^w-(auto|full|screen|fit|min|max|(\d+\/\d+)|\d+)$/)) {
			parsed.width = cls;
		}
		// Size - Height
		else if (cls.match(/^h-(auto|full|screen|fit|min|max|(\d+\/\d+)|\d+)$/)) {
			parsed.height = cls;
		}
		// Size - Min-Width
		else if (cls.match(/^min-w-(0|full|min|max|fit|\d+)$/)) {
			parsed.minWidth = cls;
		}
		// Size - Max-Width
		else if (
			cls.match(
				/^max-w-(none|xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|full|screen|min|max|fit|\d+)$/,
			)
		) {
			parsed.maxWidth = cls;
		}
		// Size - Min-Height
		else if (cls.match(/^min-h-(0|full|screen|fit|min|max|\d+)$/)) {
			parsed.minHeight = cls;
		}
		// Size - Max-Height
		else if (
			cls.match(/^max-h-(none|full|screen|fit|min|max|(\d+\/\d+)|\d+)$/)
		) {
			parsed.maxHeight = cls;
		}
		// Other
		else {
			parsed.other.push(cls);
		}
	}

	return parsed;
}

/**
 * Remove classes from a specific category
 */
function removeClassesFromCategory(
	classes: string[],
	category: keyof ParsedClasses,
): string[] {
	const categoriesToRemove = getTailwindClassesForCategory(category as string);

	if (categoriesToRemove.length === 0) {
		// Handle special cases not in mappings
		switch (category) {
			case "textColor":
				return classes.filter(
					(cls) =>
						!cls.startsWith("text-") ||
						cls.match(
							/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/,
						),
				);
			case "backgroundColor":
				return classes.filter((cls) => !cls.startsWith("bg-"));
			case "borderColor":
				return classes.filter(
					(cls) =>
						!cls.startsWith("border-") ||
						cls.match(/^border-(\d+|solid|dashed|dotted|double|none|rounded)$/),
				);
			case "margin":
				return classes.filter((cls) => !cls.match(/^-?m-/));
			case "marginX":
				return classes.filter((cls) => !cls.match(/^-?mx-/));
			case "marginY":
				return classes.filter((cls) => !cls.match(/^-?my-/));
			case "marginTop":
				return classes.filter(
					(cls) => !cls.startsWith("mt-") && !cls.startsWith("-mt-"),
				);
			case "marginRight":
				return classes.filter(
					(cls) => !cls.startsWith("mr-") && !cls.startsWith("-mr-"),
				);
			case "marginBottom":
				return classes.filter(
					(cls) => !cls.startsWith("mb-") && !cls.startsWith("-mb-"),
				);
			case "marginLeft":
				return classes.filter(
					(cls) => !cls.startsWith("ml-") && !cls.startsWith("-ml-"),
				);
			case "padding":
				return classes.filter((cls) => !cls.match(/^p-/));
			case "paddingX":
				return classes.filter((cls) => !cls.match(/^px-/));
			case "paddingY":
				return classes.filter((cls) => !cls.match(/^py-/));
			case "paddingTop":
				return classes.filter((cls) => !cls.startsWith("pt-"));
			case "paddingRight":
				return classes.filter((cls) => !cls.startsWith("pr-"));
			case "paddingBottom":
				return classes.filter((cls) => !cls.startsWith("pb-"));
			case "paddingLeft":
				return classes.filter((cls) => !cls.startsWith("pl-"));
			case "borderWidth":
				return classes.filter(
					(cls) =>
						!cls.match(/^border(-\d+)?$/) || cls.match(/^border-[trblxy]-/),
				);
			case "borderXWidth":
				return classes.filter((cls) => !cls.match(/^border-x(-\d+)?$/));
			case "borderYWidth":
				return classes.filter((cls) => !cls.match(/^border-y(-\d+)?$/));
			case "borderTopWidth":
				return classes.filter((cls) => !cls.match(/^border-t(-\d+)?$/));
			case "borderRightWidth":
				return classes.filter((cls) => !cls.match(/^border-r(-\d+)?$/));
			case "borderBottomWidth":
				return classes.filter((cls) => !cls.match(/^border-b(-\d+)?$/));
			case "borderLeftWidth":
				return classes.filter((cls) => !cls.match(/^border-l(-\d+)?$/));
			case "opacity":
				return classes.filter((cls) => !cls.match(/^opacity-\d+$/));
			case "shadow":
				return classes.filter(
					(cls) => !cls.match(/^shadow(-none|-xs|-sm|-md|-lg|-xl|-2xl)?$/),
				);
			case "width":
				return classes.filter(
					(cls) =>
						!cls.match(/^w-(auto|full|screen|fit|min|max|(\d+\/\d+)|\d+)$/),
				);
			case "height":
				return classes.filter(
					(cls) =>
						!cls.match(/^h-(auto|full|screen|fit|min|max|(\d+\/\d+)|\d+)$/),
				);
			case "minWidth":
				return classes.filter(
					(cls) => !cls.match(/^min-w-(0|full|min|max|fit|\d+)$/),
				);
			case "maxWidth":
				return classes.filter(
					(cls) =>
						!cls.match(
							/^max-w-(none|xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|full|screen|min|max|fit|\d+)$/,
						),
				);
			case "minHeight":
				return classes.filter(
					(cls) => !cls.match(/^min-h-(0|full|screen|fit|min|max|\d+)$/),
				);
			case "maxHeight":
				return classes.filter(
					(cls) =>
						!cls.match(/^max-h-(none|full|screen|fit|min|max|(\d+\/\d+)|\d+)$/),
				);
			case "gridCols":
				return classes.filter(
					(cls) => !cls.match(/^grid-cols-(none|subgrid|\d{1,2})$/),
				);
			case "gridRows":
				return classes.filter(
					(cls) => !cls.match(/^grid-rows-(none|subgrid|[1-6])$/),
				);
			case "spaceX":
				return classes.filter((cls) => !cls.match(/^-?space-x-/));
			case "spaceY":
				return classes.filter((cls) => !cls.match(/^-?space-y-/));
			default:
				return classes;
		}
	}

	return classes.filter((cls) => !categoriesToRemove.includes(cls));
}

/**
 * Update className with new property values
 */
export function updateClassName(
	currentClassName: string,
	updates: Partial<ParsedClasses>,
): string {
	let classes = currentClassName.split(" ").filter(Boolean);

	// Process each update
	for (const [key, value] of Object.entries(updates)) {
		if (value === undefined) continue;

		const category = key as keyof ParsedClasses;

		// Remove existing classes from this category
		classes = removeClassesFromCategory(classes, category);

		// Add new class if it's not empty
		if (value && value !== "") {
			if (category === "margin") {
				classes.push(`m-${value}`);
			} else if (category === "marginX") {
				classes.push(`mx-${value}`);
			} else if (category === "marginY") {
				classes.push(`my-${value}`);
			} else if (category === "marginTop") {
				classes.push(`mt-${value}`);
			} else if (category === "marginRight") {
				classes.push(`mr-${value}`);
			} else if (category === "marginBottom") {
				classes.push(`mb-${value}`);
			} else if (category === "marginLeft") {
				classes.push(`ml-${value}`);
			} else if (category === "padding") {
				classes.push(`p-${value}`);
			} else if (category === "paddingX") {
				classes.push(`px-${value}`);
			} else if (category === "paddingY") {
				classes.push(`py-${value}`);
			} else if (category === "paddingTop") {
				classes.push(`pt-${value}`);
			} else if (category === "paddingRight") {
				classes.push(`pr-${value}`);
			} else if (category === "paddingBottom") {
				classes.push(`pb-${value}`);
			} else if (category === "paddingLeft") {
				classes.push(`pl-${value}`);
			} else if (category === "borderWidth") {
				classes.push(value === "1" ? "border" : `border-${value}`);
			} else if (category === "borderXWidth") {
				classes.push(value === "1" ? "border-x" : `border-x-${value}`);
			} else if (category === "borderYWidth") {
				classes.push(value === "1" ? "border-y" : `border-y-${value}`);
			} else if (category === "borderTopWidth") {
				classes.push(value === "1" ? "border-t" : `border-t-${value}`);
			} else if (category === "borderRightWidth") {
				classes.push(value === "1" ? "border-r" : `border-r-${value}`);
			} else if (category === "borderBottomWidth") {
				classes.push(value === "1" ? "border-b" : `border-b-${value}`);
			} else if (category === "borderLeftWidth") {
				classes.push(value === "1" ? "border-l" : `border-l-${value}`);
			} else if (category === "opacity") {
				classes.push(value);
			} else if (category === "shadow") {
				classes.push(value);
			} else if (category === "gridCols") {
				classes.push(value);
			} else if (category === "gridRows") {
				classes.push(value);
			} else if (category === "spaceX") {
				classes.push(`space-x-${value}`);
			} else if (category === "spaceY") {
				classes.push(`space-y-${value}`);
			} else if (category === "width") {
				classes.push(`w-${value}`);
			} else if (category === "height") {
				classes.push(`h-${value}`);
			} else if (category === "minWidth") {
				classes.push(`min-w-${value}`);
			} else if (category === "maxWidth") {
				classes.push(`max-w-${value}`);
			} else if (category === "minHeight") {
				classes.push(`min-h-${value}`);
			} else if (category === "maxHeight") {
				classes.push(`max-h-${value}`);
			} else {
				classes.push(value);
			}
		}
	}

	// Return unique classes
	return [...new Set(classes)].join(" ");
}

/**
 * Extract spacing value from class (e.g., "mt-4" -> "4", "px-2.5" -> "2.5", "m-px" -> "px")
 */
export function extractSpacingValue(className?: string): string {
	if (!className) return "0";
	// Match patterns like: mt-4, px-2.5, m-px, -mt-4
	const match = className.match(/-([a-z0-9.]+)$/);
	return match ? match[1] : "0";
}
