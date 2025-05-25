import { hexToHsl, hslToHex } from "@firebuzz/utils";
import type { z } from "zod";
import type { themeSchema } from "./schema";

// Helper functions
export function getCategoryForColor(colorName: string): string {
  if (colorName.startsWith("primary")) return "primary";
  if (colorName.startsWith("secondary")) return "secondary";
  if (colorName.startsWith("accent")) return "accent";
  if (colorName.startsWith("destructive")) return "destructive";
  if (colorName.startsWith("muted")) return "muted";
  if (colorName.startsWith("card")) return "card";
  if (colorName.startsWith("popover")) return "card";
  if (
    colorName.includes("border") ||
    colorName.includes("input") ||
    colorName.includes("ring")
  )
    return "border";
  return "base";
}

export function getDescriptionForColor(colorName: string): string {
  const descriptions: Record<string, string> = {
    background: "Main background color",
    foreground: "Main text color",
    primary: "Primary action color",
    primaryForeground: "Primary action text color",
    secondary: "Secondary action color",
    secondaryForeground: "Secondary action text color",
    accent: "Accent background color",
    accentForeground: "Accent text color",
    destructive: "Destructive action color",
    destructiveForeground: "Destructive action text color",
    muted: "Muted background color",
    mutedForeground: "Muted text color",
    card: "Card background color",
    cardForeground: "Card text color",
    popover: "Popover background color",
    popoverForeground: "Popover text color",
    border: "Default border color",
    input: "Input background color",
    ring: "Focus ring color",
  };

  return descriptions[colorName] || "Custom color";
}

// Utility to convert hex theme to HSL theme for server
export const convertHexThemeToHsl = (
  hexTheme: Record<string, string>,
  radius: string
): z.infer<typeof themeSchema> => {
  const result: Record<string, string> = { radius };

  for (const [key, value] of Object.entries(hexTheme)) {
    if (key !== "radius") {
      result[key] = hexToHsl(value);
    }
  }

  return result as z.infer<typeof themeSchema>;
};

// Utility to convert HSL theme to hex theme for local state
export const convertHslThemeToHex = (hslTheme: z.infer<typeof themeSchema>) => {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(hslTheme)) {
    if (key === "radius") {
      result[key] = value; // radius is not a color
    } else {
      result[key] = hslToHex(value);
    }
  }

  return result;
};

// Helper function to get font family with fallbacks
export const getFontFamilyWithFallbacks = (
  fontName: string,
  fontType: "sans" | "serif" | "mono"
) => {
  const fallbacks = {
    sans: ", -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    serif: ", Georgia, 'Times New Roman', Times, serif",
    mono: ", 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', 'Droid Sans Mono', 'Liberation Mono', Menlo, Courier, monospace",
  };

  return `"${fontName}"${fallbacks[fontType]}`;
};
