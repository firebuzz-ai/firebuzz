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
  if (colorName.startsWith("chart")) return "chart";
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
    chart1: "Chart 1 color",
    chart2: "Chart 2 color",
    chart3: "Chart 3 color",
    chart4: "Chart 4 color",
    chart5: "Chart 5 color",
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

// Enhanced color utility functions
function parseHslString(hslString: string): {
  h: number;
  s: number;
  l: number;
} {
  const values = hslString.replace(/%/g, "").split(/\s+/).filter(Boolean);
  if (values.length !== 3) {
    throw new Error(`Invalid HSL color format: ${hslString}`);
  }

  return {
    h: Number.parseFloat(values[0]),
    s: Number.parseFloat(values[1]),
    l: Number.parseFloat(values[2]),
  };
}

function formatHsl(h: number, s: number, l: number): string {
  return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
}

// Calculate relative luminance for contrast ratio calculations
function getRelativeLuminance(hex: string): number {
  const rgb = [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ].map((value) => {
    const normalizedValue = value / 255;
    return normalizedValue <= 0.03928
      ? normalizedValue / 12.92
      : ((normalizedValue + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

// Calculate contrast ratio between two colors
function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Generate optimal foreground color with proper contrast
function generateOptimalForeground(
  backgroundHex: string,
  isLightTheme: boolean,
  primaryHsl: { h: number; s: number; l: number }
): string {
  const whiteContrast = getContrastRatio(backgroundHex, "#ffffff");
  const blackContrast = getContrastRatio(backgroundHex, "#000000");

  // WCAG AA requires 4.5:1 for normal text, AAA requires 7:1
  const requiredContrast = 4.5;

  if (whiteContrast >= requiredContrast && blackContrast >= requiredContrast) {
    // Both work, choose based on theme
    return isLightTheme ? "240 5.9% 10%" : "0 0% 98%";
  }

  if (whiteContrast >= requiredContrast) {
    return "0 0% 98%";
  }

  if (blackContrast >= requiredContrast) {
    return "240 5.9% 10%";
  }

  // Neither standard black/white works, generate a contrasting color
  const backgroundLum = getRelativeLuminance(backgroundHex);
  const targetLightness = backgroundLum > 0.5 ? 15 : 85;
  return formatHsl(
    primaryHsl.h,
    Math.min(primaryHsl.s * 0.3, 20),
    targetLightness
  );
}

// Enhanced color generation algorithm with better shade variations
export function generateColorsFromPrimary(
  primaryHex: string,
  isLightTheme: boolean
) {
  // Convert primary color to HSL for manipulation
  const primaryHsl = parseHslString(hexToHsl(primaryHex));
  const { h: hue, s: saturation, l: lightness } = primaryHsl;

  if (isLightTheme) {
    // Light theme colors with enhanced shade generation
    const mutedBackgroundL = 98;
    const cardBackgroundL = 100;

    return {
      // Base colors
      background: "0 0% 100%",
      foreground: "240 5.9% 10%",

      // Muted colors - very subtle primary tint
      muted: formatHsl(hue, Math.min(saturation * 0.1, 8), mutedBackgroundL),
      mutedForeground: "240 3.8% 46.1%",

      // Card colors
      card: formatHsl(hue, Math.min(saturation * 0.05, 3), cardBackgroundL),
      cardForeground: "240 5.9% 10%",

      // Popover colors
      popover: "0 0% 100%",
      popoverForeground: "240 5.9% 10%",

      // Border colors - subtle primary tint
      border: formatHsl(hue, Math.min(saturation * 0.15, 12), 95.9),
      input: formatHsl(hue, Math.min(saturation * 0.12, 10), 95.9),

      // Primary colors - user's exact choice
      primary: formatHsl(hue, saturation, lightness),
      primaryForeground: generateOptimalForeground(
        primaryHex,
        isLightTheme,
        primaryHsl
      ),

      // Secondary colors - desaturated and lighter version
      secondary: formatHsl(
        hue,
        Math.max(saturation * 0.25, 8),
        Math.min(lightness + 35, 96)
      ),
      secondaryForeground: "240 5.3% 26.1%",

      // Accent colors - very light, subtle version
      accent: formatHsl(
        hue,
        Math.max(saturation * 0.15, 5),
        Math.min(lightness + 40, 98)
      ),
      accentForeground: "240 5.9% 10%",

      // Destructive colors - keep consistent red
      destructive: "346.8 77.2% 49.8%",
      destructiveForeground: "355.7 100% 97.3%",

      // Ring color - slightly darker primary for focus states
      ring: formatHsl(
        hue,
        Math.min(saturation * 1.1, 100),
        Math.max(lightness - 15, 25)
      ),

      // Chart colors
      chart1: formatHsl(hue, Math.min(saturation * 0.15, 12), 61),
      chart2: formatHsl(hue, Math.min(saturation * 0.15, 39), 58),
      chart3: formatHsl(hue, Math.min(saturation * 0.15, 24), 37),
      chart4: formatHsl(hue, Math.min(saturation * 0.15, 66), 74),
      chart5: formatHsl(hue, Math.min(saturation * 0.15, 67), 87),

      radius: "0.5rem",
    };
  }

  // Dark theme colors with enhanced shade generation
  const cardBackgroundL = 11;
  const mutedBackgroundL = 12;

  return {
    // Base colors
    background: "240 5.9% 10%",
    foreground: "0 0% 98%",

    // Muted colors - dark with subtle primary tint
    muted: formatHsl(hue, Math.min(saturation * 0.2, 15), mutedBackgroundL),
    mutedForeground: "240 5% 64.9%",

    // Card colors
    card: formatHsl(hue, Math.min(saturation * 0.15, 12), cardBackgroundL),
    cardForeground: "0 0% 98%",

    // Popover colors
    popover: formatHsl(hue, Math.min(saturation * 0.1, 8), 10),
    popoverForeground: "0 0% 98%",

    // Border colors - darker with primary tint
    border: formatHsl(hue, Math.min(saturation * 0.25, 20), 15.9),
    input: formatHsl(hue, Math.min(saturation * 0.2, 18), 15.9),

    // Primary colors - user's exact choice but ensure good contrast
    primary: formatHsl(hue, saturation, Math.max(lightness, 45)),
    primaryForeground: generateOptimalForeground(
      hslToHex(formatHsl(hue, saturation, Math.max(lightness, 45))),
      isLightTheme,
      primaryHsl
    ),

    // Secondary colors - darker, desaturated version
    secondary: formatHsl(
      hue,
      Math.max(saturation * 0.4, 12),
      Math.max(lightness - 25, 18)
    ),
    secondaryForeground: "0 0% 78.1%",

    // Accent colors - dark accent with primary hue
    accent: formatHsl(
      hue,
      Math.max(saturation * 0.3, 10),
      Math.max(lightness - 30, 15)
    ),
    accentForeground: "0 0% 98%",

    // Destructive colors - keep consistent red
    destructive: "346.8 77.2% 49.8%",
    destructiveForeground: "355.7 100% 97.3%",

    // Ring color - brighter primary for focus states in dark mode
    ring: formatHsl(
      hue,
      Math.min(saturation * 1.2, 100),
      Math.min(lightness + 20, 75)
    ),

    // Chart colors
    chart1: formatHsl(hue, Math.min(saturation * 0.15, 12), 61),
    chart2: formatHsl(hue, Math.min(saturation * 0.15, 39), 58),
    chart3: formatHsl(hue, Math.min(saturation * 0.15, 24), 37),
    chart4: formatHsl(hue, Math.min(saturation * 0.15, 66), 74),
    chart5: formatHsl(hue, Math.min(saturation * 0.15, 67), 87),
  };
}
