/**
 * Tailwind Mappings for v0-Style Visual Editor
 * Maps UI controls to Tailwind utility classes
 */

export interface Option<T = string> {
	label: string;
	value: T;
}

// ============================================
// Typography Mappings
// ============================================

export const FONT_FAMILY_OPTIONS: Option[] = [
	{ label: "Sans", value: "font-sans" },
	{ label: "Serif", value: "font-serif" },
	{ label: "Mono", value: "font-mono" },
];

export const FONT_SIZE_OPTIONS: Option[] = [
	{ label: "Extra Small", value: "text-xs" },
	{ label: "Small", value: "text-sm" },
	{ label: "Base", value: "text-base" },
	{ label: "Large", value: "text-lg" },
	{ label: "Extra Large", value: "text-xl" },
	{ label: "2XL", value: "text-2xl" },
	{ label: "3XL", value: "text-3xl" },
	{ label: "4XL", value: "text-4xl" },
	{ label: "5XL", value: "text-5xl" },
	{ label: "6XL", value: "text-6xl" },
	{ label: "7XL", value: "text-7xl" },
	{ label: "8XL", value: "text-8xl" },
	{ label: "9XL", value: "text-9xl" },
];

export const FONT_WEIGHT_OPTIONS: Option[] = [
	{ label: "Thin", value: "font-thin" },
	{ label: "Extra Light", value: "font-extralight" },
	{ label: "Light", value: "font-light" },
	{ label: "Normal", value: "font-normal" },
	{ label: "Medium", value: "font-medium" },
	{ label: "Semibold", value: "font-semibold" },
	{ label: "Bold", value: "font-bold" },
	{ label: "Extra Bold", value: "font-extrabold" },
	{ label: "Black", value: "font-black" },
];

export const LINE_HEIGHT_OPTIONS: Option[] = [
	{ label: "0.75rem", value: "leading-3" },
	{ label: "1rem", value: "leading-4" },
	{ label: "1.25rem", value: "leading-5" },
	{ label: "1.5rem", value: "leading-6" },
	{ label: "1.75rem", value: "leading-7" },
	{ label: "2rem", value: "leading-8" },
	{ label: "2.25rem", value: "leading-9" },
	{ label: "2.5rem", value: "leading-10" },
];

export const LETTER_SPACING_OPTIONS: Option[] = [
	{ label: "-0.05em", value: "tracking-tighter" },
	{ label: "-0.025em", value: "tracking-tight" },
	{ label: "0em", value: "tracking-normal" },
	{ label: "0.025em", value: "tracking-wide" },
	{ label: "0.05em", value: "tracking-wider" },
	{ label: "0.1em", value: "tracking-widest" },
];

export const TEXT_ALIGN_OPTIONS: Option[] = [
	{ label: "Left", value: "text-left" },
	{ label: "Center", value: "text-center" },
	{ label: "Right", value: "text-right" },
	{ label: "Justify", value: "text-justify" },
];

export const TEXT_DECORATION_OPTIONS: Option[] = [
	{ label: "No Underline", value: "no-underline" },
	{ label: "Underline", value: "underline" },
	{ label: "Line Through", value: "line-through" },
];

export const FONT_STYLE_OPTIONS: Option[] = [
	{ label: "Normal", value: "not-italic" },
	{ label: "Italic", value: "italic" },
];

// ============================================
// Color Mappings
// ============================================

export const THEME_COLOR_OPTIONS: Option[] = [
	{ label: "Background", value: "bg-background" },
	{ label: "Foreground", value: "text-foreground" },
	{ label: "Primary", value: "bg-primary" },
	{ label: "Primary Foreground", value: "text-primary-foreground" },
	{ label: "Secondary", value: "bg-secondary" },
	{ label: "Secondary Foreground", value: "text-secondary-foreground" },
	{ label: "Muted", value: "bg-muted" },
	{ label: "Muted Foreground", value: "text-muted-foreground" },
	{ label: "Accent", value: "bg-accent" },
	{ label: "Accent Foreground", value: "text-accent-foreground" },
	{ label: "Destructive", value: "bg-destructive" },
	{ label: "Destructive Foreground", value: "text-destructive-foreground" },
	{ label: "Border", value: "border-border" },
	{ label: "Input", value: "bg-input" },
	{ label: "Ring", value: "ring-ring" },
	{ label: "Card", value: "bg-card" },
	{ label: "Card Foreground", value: "text-card-foreground" },
	{ label: "Popover", value: "bg-popover" },
	{ label: "Popover Foreground", value: "text-popover-foreground" },
];

export const TAILWIND_COLORS = [
	"slate",
	"gray",
	"zinc",
	"neutral",
	"stone",
	"red",
	"orange",
	"amber",
	"yellow",
	"lime",
	"green",
	"emerald",
	"teal",
	"cyan",
	"sky",
	"blue",
	"indigo",
	"violet",
	"purple",
	"fuchsia",
	"pink",
	"rose",
] as const;

export const TAILWIND_COLOR_SHADES = [
	"50",
	"100",
	"200",
	"300",
	"400",
	"500",
	"600",
	"700",
	"800",
	"900",
	"950",
] as const;

// ============================================
// Layout Mappings
// ============================================

export const FLEX_DIRECTION_OPTIONS: Option[] = [
	{ label: "Row", value: "flex-row" },
	{ label: "Row Reverse", value: "flex-row-reverse" },
	{ label: "Column", value: "flex-col" },
	{ label: "Column Reverse", value: "flex-col-reverse" },
];

export const JUSTIFY_CONTENT_OPTIONS: Option[] = [
	{ label: "Start", value: "justify-start" },
	{ label: "Center", value: "justify-center" },
	{ label: "End", value: "justify-end" },
	{ label: "Between", value: "justify-between" },
	{ label: "Around", value: "justify-around" },
	{ label: "Evenly", value: "justify-evenly" },
];

export const ALIGN_ITEMS_OPTIONS: Option[] = [
	{ label: "Start", value: "items-start" },
	{ label: "Center", value: "items-center" },
	{ label: "End", value: "items-end" },
	{ label: "Baseline", value: "items-baseline" },
	{ label: "Stretch", value: "items-stretch" },
];

export const GAP_OPTIONS: Option[] = [
	{ label: "0", value: "gap-0" },
	{ label: "1", value: "gap-1" },
	{ label: "2", value: "gap-2" },
	{ label: "3", value: "gap-3" },
	{ label: "4", value: "gap-4" },
	{ label: "5", value: "gap-5" },
	{ label: "6", value: "gap-6" },
	{ label: "8", value: "gap-8" },
	{ label: "10", value: "gap-10" },
	{ label: "12", value: "gap-12" },
	{ label: "16", value: "gap-16" },
	{ label: "20", value: "gap-20" },
	{ label: "24", value: "gap-24" },
];

export const SPACE_OPTIONS: Option[] = [
	{ label: "0", value: "0" },
	{ label: "1", value: "1" },
	{ label: "2", value: "2" },
	{ label: "3", value: "3" },
	{ label: "4", value: "4" },
	{ label: "5", value: "5" },
	{ label: "6", value: "6" },
	{ label: "8", value: "8" },
	{ label: "10", value: "10" },
	{ label: "12", value: "12" },
	{ label: "16", value: "16" },
	{ label: "20", value: "20" },
	{ label: "24", value: "24" },
];

export const DISPLAY_OPTIONS: Option[] = [
	{ label: "Block", value: "block" },
	{ label: "Inline Block", value: "inline-block" },
	{ label: "Inline", value: "inline" },
	{ label: "Flex", value: "flex" },
	{ label: "Inline Flex", value: "inline-flex" },
	{ label: "Grid", value: "grid" },
	{ label: "Inline Grid", value: "inline-grid" },
	{ label: "Hidden", value: "hidden" },
];

export const GRID_COLS_OPTIONS: Option[] = [
	{ label: "None", value: "grid-cols-none" },
	{ label: "1", value: "grid-cols-1" },
	{ label: "2", value: "grid-cols-2" },
	{ label: "3", value: "grid-cols-3" },
	{ label: "4", value: "grid-cols-4" },
	{ label: "5", value: "grid-cols-5" },
	{ label: "6", value: "grid-cols-6" },
	{ label: "7", value: "grid-cols-7" },
	{ label: "8", value: "grid-cols-8" },
	{ label: "9", value: "grid-cols-9" },
	{ label: "10", value: "grid-cols-10" },
	{ label: "11", value: "grid-cols-11" },
	{ label: "12", value: "grid-cols-12" },
];

export const GRID_ROWS_OPTIONS: Option[] = [
	{ label: "None", value: "grid-rows-none" },
	{ label: "1", value: "grid-rows-1" },
	{ label: "2", value: "grid-rows-2" },
	{ label: "3", value: "grid-rows-3" },
	{ label: "4", value: "grid-rows-4" },
	{ label: "5", value: "grid-rows-5" },
	{ label: "6", value: "grid-rows-6" },
];

// ============================================
// Spacing Mappings
// ============================================

const BASE_SPACING_OPTIONS: Option[] = [
	{ label: "0px", value: "0" },
	{ label: "1px", value: "px" },
	{ label: "2px", value: "0.5" },
	{ label: "4px", value: "1" },
	{ label: "6px", value: "1.5" },
	{ label: "8px", value: "2" },
	{ label: "10px", value: "2.5" },
	{ label: "12px", value: "3" },
	{ label: "14px", value: "3.5" },
	{ label: "16px", value: "4" },
	{ label: "20px", value: "5" },
	{ label: "24px", value: "6" },
	{ label: "28px", value: "7" },
	{ label: "32px", value: "8" },
	{ label: "36px", value: "9" },
	{ label: "40px", value: "10" },
	{ label: "44px", value: "11" },
	{ label: "48px", value: "12" },
	{ label: "56px", value: "14" },
	{ label: "64px", value: "16" },
	{ label: "80px", value: "20" },
	{ label: "96px", value: "24" },
	{ label: "112px", value: "28" },
	{ label: "128px", value: "32" },
	{ label: "144px", value: "36" },
	{ label: "160px", value: "40" },
	{ label: "176px", value: "44" },
	{ label: "192px", value: "48" },
	{ label: "208px", value: "52" },
	{ label: "224px", value: "56" },
	{ label: "240px", value: "60" },
	{ label: "256px", value: "64" },
];

// Margin can be auto, padding cannot
export const MARGIN_SPACING_OPTIONS: Option[] = [
	{ label: "0px", value: "0" },
	{ label: "Auto", value: "auto" },
	...BASE_SPACING_OPTIONS.slice(1),
];

export const PADDING_SPACING_OPTIONS: Option[] = BASE_SPACING_OPTIONS;

// Legacy export for backwards compatibility
export const SPACING_OPTIONS: Option[] = BASE_SPACING_OPTIONS;

// ============================================
// Border Mappings
// ============================================

export const BORDER_WIDTH_OPTIONS: Option[] = [
	{ label: "0px", value: "0" },
	{ label: "1px", value: "1" }, // border or border-1 (default is 1px)
	{ label: "2px", value: "2" },
	{ label: "4px", value: "4" },
	{ label: "8px", value: "8" },
];

export const BORDER_STYLE_OPTIONS: Option[] = [
	{ label: "Solid", value: "border-solid" },
	{ label: "Dashed", value: "border-dashed" },
	{ label: "Dotted", value: "border-dotted" },
	{ label: "Double", value: "border-double" },
	{ label: "None", value: "border-none" },
];

export const BORDER_RADIUS_OPTIONS: Option[] = [
	{ label: "None", value: "rounded-none" },
	{ label: "Small", value: "rounded-sm" },
	{ label: "Default", value: "rounded" },
	{ label: "Medium", value: "rounded-md" },
	{ label: "Large", value: "rounded-lg" },
	{ label: "Extra Large", value: "rounded-xl" },
	{ label: "2XL", value: "rounded-2xl" },
	{ label: "3XL", value: "rounded-3xl" },
	{ label: "Full", value: "rounded-full" },
];

// ============================================
// Appearance Mappings
// ============================================

export const OPACITY_OPTIONS: Option[] = [
	{ label: "0%", value: "opacity-0" },
	{ label: "5%", value: "opacity-5" },
	{ label: "10%", value: "opacity-10" },
	{ label: "20%", value: "opacity-20" },
	{ label: "25%", value: "opacity-25" },
	{ label: "30%", value: "opacity-30" },
	{ label: "40%", value: "opacity-40" },
	{ label: "50%", value: "opacity-50" },
	{ label: "60%", value: "opacity-60" },
	{ label: "70%", value: "opacity-70" },
	{ label: "75%", value: "opacity-75" },
	{ label: "80%", value: "opacity-80" },
	{ label: "90%", value: "opacity-90" },
	{ label: "95%", value: "opacity-95" },
	{ label: "100%", value: "opacity-100" },
];

export const SHADOW_OPTIONS: Option[] = [
	{ label: "None", value: "shadow-none" },
	{ label: "XS", value: "shadow-xs" },
	{ label: "SM", value: "shadow-sm" },
	{ label: "Default", value: "shadow" },
	{ label: "MD", value: "shadow-md" },
	{ label: "LG", value: "shadow-lg" },
	{ label: "XL", value: "shadow-xl" },
	{ label: "2XL", value: "shadow-2xl" },
];

// ============================================
// Width & Height Mappings
// ============================================

export const WIDTH_OPTIONS: Option[] = [
	{ label: "Auto", value: "auto" },
	{ label: "Full", value: "full" },
	{ label: "Screen", value: "screen" },
	{ label: "Fit", value: "fit" },
	{ label: "Min", value: "min" },
	{ label: "Max", value: "max" },
	// Fractions
	{ label: "1/2", value: "1/2" },
	{ label: "1/3", value: "1/3" },
	{ label: "2/3", value: "2/3" },
	{ label: "1/4", value: "1/4" },
	{ label: "3/4", value: "3/4" },
	{ label: "1/5", value: "1/5" },
	{ label: "2/5", value: "2/5" },
	{ label: "3/5", value: "3/5" },
	{ label: "4/5", value: "4/5" },
	// Spacing scale (0-24)
	...SPACING_OPTIONS,
];

export const HEIGHT_OPTIONS: Option[] = [
	{ label: "Auto", value: "auto" },
	{ label: "Full", value: "full" },
	{ label: "Screen", value: "screen" },
	{ label: "Fit", value: "fit" },
	{ label: "Min", value: "min" },
	{ label: "Max", value: "max" },
	// Fractions
	{ label: "1/2", value: "1/2" },
	{ label: "1/3", value: "1/3" },
	{ label: "2/3", value: "2/3" },
	{ label: "1/4", value: "1/4" },
	{ label: "3/4", value: "3/4" },
	{ label: "1/5", value: "1/5" },
	{ label: "2/5", value: "2/5" },
	{ label: "3/5", value: "3/5" },
	{ label: "4/5", value: "4/5" },
	// Spacing scale (0-24)
	...SPACING_OPTIONS,
];

export const MIN_WIDTH_OPTIONS: Option[] = [
	{ label: "0", value: "0" },
	{ label: "Full", value: "full" },
	{ label: "Min", value: "min" },
	{ label: "Max", value: "max" },
	{ label: "Fit", value: "fit" },
	// Spacing scale (1-24)
	...SPACING_OPTIONS.slice(1),
];

export const MAX_WIDTH_OPTIONS: Option[] = [
	{ label: "None", value: "none" },
	// Container scale
	{ label: "XS", value: "xs" },
	{ label: "SM", value: "sm" },
	{ label: "MD", value: "md" },
	{ label: "LG", value: "lg" },
	{ label: "XL", value: "xl" },
	{ label: "2XL", value: "2xl" },
	{ label: "3XL", value: "3xl" },
	{ label: "4XL", value: "4xl" },
	{ label: "5XL", value: "5xl" },
	{ label: "6XL", value: "6xl" },
	{ label: "7XL", value: "7xl" },
	// Other values
	{ label: "Full", value: "full" },
	{ label: "Screen", value: "screen" },
	{ label: "Min", value: "min" },
	{ label: "Max", value: "max" },
	{ label: "Fit", value: "fit" },
	// Spacing scale (0-24)
	...SPACING_OPTIONS,
];

export const MIN_HEIGHT_OPTIONS: Option[] = [
	{ label: "0", value: "0" },
	{ label: "Full", value: "full" },
	{ label: "Screen", value: "screen" },
	{ label: "Fit", value: "fit" },
	{ label: "Min", value: "min" },
	{ label: "Max", value: "max" },
	// Spacing scale (1-24)
	...SPACING_OPTIONS.slice(1),
];

export const MAX_HEIGHT_OPTIONS: Option[] = [
	{ label: "None", value: "none" },
	{ label: "Full", value: "full" },
	{ label: "Screen", value: "screen" },
	{ label: "Fit", value: "fit" },
	{ label: "Min", value: "min" },
	{ label: "Max", value: "max" },
	// Fractions
	{ label: "1/2", value: "1/2" },
	{ label: "1/3", value: "1/3" },
	{ label: "2/3", value: "2/3" },
	{ label: "1/4", value: "1/4" },
	{ label: "3/4", value: "3/4" },
	{ label: "1/5", value: "1/5" },
	{ label: "2/5", value: "2/5" },
	{ label: "3/5", value: "3/5" },
	{ label: "4/5", value: "4/5" },
	// Spacing scale (0-24)
	...SPACING_OPTIONS,
];

// Legacy - kept for backwards compatibility
export const SIZE_OPTIONS: Option[] = WIDTH_OPTIONS;

// ============================================
// Helper Functions
// ============================================

/**
 * Get all possible Tailwind classes for a specific category
 */
export function getTailwindClassesForCategory(category: string): string[] {
	switch (category) {
		case "fontSize":
			return FONT_SIZE_OPTIONS.map((o) => o.value);
		case "fontWeight":
			return FONT_WEIGHT_OPTIONS.map((o) => o.value);
		case "fontFamily":
			return FONT_FAMILY_OPTIONS.map((o) => o.value);
		case "lineHeight":
			return LINE_HEIGHT_OPTIONS.map((o) => o.value);
		case "letterSpacing":
			return LETTER_SPACING_OPTIONS.map((o) => o.value);
		case "textAlign":
			return TEXT_ALIGN_OPTIONS.map((o) => o.value);
		case "textDecoration":
			return TEXT_DECORATION_OPTIONS.map((o) => o.value);
		case "fontStyle":
			return FONT_STYLE_OPTIONS.map((o) => o.value);
		case "flexDirection":
			return FLEX_DIRECTION_OPTIONS.map((o) => o.value);
		case "justifyContent":
			return JUSTIFY_CONTENT_OPTIONS.map((o) => o.value);
		case "alignItems":
			return ALIGN_ITEMS_OPTIONS.map((o) => o.value);
		case "gap":
			return GAP_OPTIONS.map((o) => o.value);
		case "display":
			return DISPLAY_OPTIONS.map((o) => o.value);
		case "borderWidth":
			return BORDER_WIDTH_OPTIONS.map((o) => o.value);
		case "borderStyle":
			return BORDER_STYLE_OPTIONS.map((o) => o.value);
		case "borderRadius":
			return BORDER_RADIUS_OPTIONS.map((o) => o.value);
		case "opacity":
			return OPACITY_OPTIONS.map((o) => o.value);
		case "shadow":
			return SHADOW_OPTIONS.map((o) => o.value);
		case "gridCols":
			return GRID_COLS_OPTIONS.map((o) => o.value);
		case "gridRows":
			return GRID_ROWS_OPTIONS.map((o) => o.value);
		case "spaceX":
		case "spaceY":
			return SPACE_OPTIONS.map((o) => o.value);
		case "width":
			return WIDTH_OPTIONS.map((o) => o.value);
		case "height":
			return HEIGHT_OPTIONS.map((o) => o.value);
		case "minWidth":
			return MIN_WIDTH_OPTIONS.map((o) => o.value);
		case "maxWidth":
			return MAX_WIDTH_OPTIONS.map((o) => o.value);
		case "minHeight":
			return MIN_HEIGHT_OPTIONS.map((o) => o.value);
		case "maxHeight":
			return MAX_HEIGHT_OPTIONS.map((o) => o.value);
		default:
			return [];
	}
}
