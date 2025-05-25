import { useColorSelectorModal } from "@/hooks/ui/use-color-selector-modal";
import { api, useCachedRichQuery } from "@firebuzz/convex";
import { Input } from "@firebuzz/ui/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Search } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { hslToHex } from "@firebuzz/utils";
import { useCallback, useMemo, useState } from "react";

interface ThemeColorItem {
  name: string;
  displayName: string;
  value: string; // HSL value from theme
  hexValue: string; // Converted hex value
  category: string;
  theme: "light" | "dark";
  description: string;
  themeName: string;
  themeId: string;
}

// Define the order of color categories
const COLOR_CATEGORY_ORDER = [
  "primary",
  "secondary",
  "accent",
  "base",
  "card",
  "muted",
  "destructive",
  "border",
];

export const ThemeColors = () => {
  const { setColor } = useColorSelectorModal();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all themes
  const { data: themes, isPending: isLoading } = useCachedRichQuery(
    api.collections.brands.themes.queries.getAll,
    {
      showHidden: false,
    }
  );

  // Convert all theme colors to color items
  const themeColors = useMemo(() => {
    if (!themes) return [];

    const colors: ThemeColorItem[] = [];

    for (const theme of themes) {
      // Process light theme colors
      const lightThemeEntries = Object.entries(theme.lightTheme).filter(
        ([key]) => key !== "radius" // exclude radius as it's not a color
      );

      for (const [key, hslValue] of lightThemeEntries) {
        const hexValue = hslToHex(hslValue);
        colors.push({
          name: key,
          displayName: key.replace(/([A-Z])/g, " $1").toLowerCase(),
          value: hslValue,
          hexValue,
          category: getCategoryForColor(key),
          theme: "light",
          description: getDescriptionForColor(key),
          themeName: theme.name,
          themeId: theme._id,
        });
      }

      // Process dark theme colors
      const darkThemeEntries = Object.entries(theme.darkTheme).filter(
        ([key]) => key !== "radius"
      );

      for (const [key, hslValue] of darkThemeEntries) {
        const hexValue = hslToHex(hslValue);
        colors.push({
          name: key,
          displayName: key.replace(/([A-Z])/g, " $1").toLowerCase(),
          value: hslValue,
          hexValue,
          category: getCategoryForColor(key),
          theme: "dark",
          description: getDescriptionForColor(key),
          themeName: theme.name,
          themeId: theme._id,
        });
      }
    }

    return colors;
  }, [themes]);

  // Filter colors based on search query
  const filteredColors = useMemo(() => {
    if (!searchQuery.trim()) return themeColors;

    const query = searchQuery.toLowerCase();
    return themeColors.filter(
      (color) =>
        color.displayName.toLowerCase().includes(query) ||
        color.category.toLowerCase().includes(query) ||
        color.theme.includes(query) ||
        color.themeName.toLowerCase().includes(query) ||
        color.description.toLowerCase().includes(query)
    );
  }, [themeColors, searchQuery]);

  // Group filtered colors by theme name
  const groupedColors = useMemo(() => {
    const groups: Record<string, ThemeColorItem[]> = {};

    for (const color of filteredColors) {
      const groupKey = color.themeName;
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(color);
    }

    return groups;
  }, [filteredColors]);

  // Group colors by category and theme type, ordered by category
  const organizeColorsByCategory = useCallback(
    (colors: ThemeColorItem[], themeType: "light" | "dark") => {
      const filteredColors = colors.filter((c) => c.theme === themeType);
      const groupedByCategory: Record<string, ThemeColorItem[]> = {};

      // Group by category
      for (const color of filteredColors) {
        if (!groupedByCategory[color.category]) {
          groupedByCategory[color.category] = [];
        }
        groupedByCategory[color.category].push(color);
      }

      // Return ordered by category
      return COLOR_CATEGORY_ORDER.map((category) => ({
        category,
        colors: groupedByCategory[category] || [],
      })).filter((group) => group.colors.length > 0);
    },
    []
  );

  const handleColorClick = (color: ThemeColorItem) => {
    setColor(color.hexValue);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center flex-1 p-8">
        <div className="text-sm text-muted-foreground">
          Loading theme colors...
        </div>
      </div>
    );
  }

  if (!themes || themes.length === 0) {
    return (
      <div className="flex items-center justify-center flex-1 p-8">
        <div className="text-center text-muted-foreground">
          <div className="mb-2 text-lg font-medium">No themes found</div>
          <p className="text-sm text-muted-foreground/70">
            Create themes to see their colors here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Input */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="relative">
          <Search className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
          <Input
            placeholder="Search theme colors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-10 bg-background"
          />
        </div>
      </div>

      {/* Colors Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-0">
          {Object.entries(groupedColors).map(([themeName, themeColors]) => {
            if (themeColors.length === 0) return null;

            const lightColorGroups = organizeColorsByCategory(
              themeColors,
              "light"
            );
            const darkColorGroups = organizeColorsByCategory(
              themeColors,
              "dark"
            );

            return (
              <div key={themeName}>
                {/* Light Theme Section */}
                {lightColorGroups.length > 0 && (
                  <div>
                    {/* Sticky Header for Light Theme */}
                    <div className="sticky top-0 z-10 px-4 py-3 border-b bg-background">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <h2 className="text-sm font-medium">
                          {themeName} (Light)
                        </h2>
                        <div className="ml-auto text-xs text-muted-foreground">
                          {lightColorGroups.reduce(
                            (total, group) => total + group.colors.length,
                            0
                          )}{" "}
                          colors
                        </div>
                      </div>
                    </div>

                    {/* Light Theme Colors */}
                    <div className="p-4 space-y-4">
                      {lightColorGroups.map(({ category, colors }) => (
                        <div
                          key={`${themeName}-light-${category}`}
                          className="space-y-2"
                        >
                          <div className="grid grid-cols-2 gap-2">
                            {colors.map((color) => (
                              <Tooltip
                                key={`${color.themeId}-light-${color.name}`}
                              >
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => handleColorClick(color)}
                                    className={cn(
                                      "group relative flex items-center gap-2 p-2 rounded-md border border-border/40 transition-all duration-200",
                                      "hover:border-border hover:shadow-sm hover:bg-muted/30",
                                      "focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 focus:ring-offset-background",
                                      "active:scale-98 active:duration-75"
                                    )}
                                  >
                                    <div
                                      className="w-6 h-6 border rounded-sm shadow-sm border-border/40 shrink-0"
                                      style={{
                                        backgroundColor: color.hexValue,
                                      }}
                                    />
                                    <div className="flex-1 min-w-0 text-left">
                                      <div className="text-xs font-medium capitalize truncate text-foreground">
                                        {color.displayName}
                                      </div>
                                      <div className="font-mono text-xs text-muted-foreground">
                                        {color.hexValue}
                                      </div>
                                    </div>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="text-xs font-medium border bg-popover/95 backdrop-blur-sm border-border/50 w-[--radix-tooltip-trigger-width]"
                                >
                                  <div className="text-left">
                                    <div className="font-medium capitalize">
                                      {color.displayName}
                                    </div>
                                    <div className="text-muted-foreground">
                                      {color.description}
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dark Theme Section */}
                {darkColorGroups.length > 0 && (
                  <div>
                    {/* Sticky Header for Dark Theme */}
                    <div className="sticky top-0 z-10 px-4 py-3 border-b bg-background">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <h2 className="text-sm font-medium">
                          {themeName} (Dark)
                        </h2>
                        <div className="ml-auto text-xs text-muted-foreground">
                          {darkColorGroups.reduce(
                            (total, group) => total + group.colors.length,
                            0
                          )}{" "}
                          colors
                        </div>
                      </div>
                    </div>

                    {/* Dark Theme Colors */}
                    <div className="p-4 space-y-4">
                      {darkColorGroups.map(({ category, colors }) => (
                        <div
                          key={`${themeName}-dark-${category}`}
                          className="space-y-2"
                        >
                          <div className="grid grid-cols-2 gap-2">
                            {colors.map((color) => (
                              <Tooltip
                                key={`${color.themeId}-dark-${color.name}`}
                              >
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => handleColorClick(color)}
                                    className={cn(
                                      "group relative flex items-center gap-2 p-2 rounded-md border border-border/40 transition-all duration-200",
                                      "hover:border-border hover:shadow-sm hover:bg-muted/30",
                                      "focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 focus:ring-offset-background",
                                      "active:scale-98 active:duration-75"
                                    )}
                                  >
                                    <div
                                      className="w-6 h-6 border rounded-sm shadow-sm border-border/40 shrink-0"
                                      style={{
                                        backgroundColor: color.hexValue,
                                      }}
                                    />
                                    <div className="flex-1 min-w-0 text-left">
                                      <div className="text-xs font-medium truncate text-foreground">
                                        {color.displayName}
                                      </div>
                                      <div className="font-mono text-xs text-muted-foreground">
                                        {color.hexValue}
                                      </div>
                                    </div>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="text-xs font-medium border bg-popover/95 backdrop-blur-sm border-border/50 w-[--radix-tooltip-trigger-width]"
                                >
                                  <div className="text-left">
                                    <div className="font-medium capitalize">
                                      {color.displayName}
                                    </div>
                                    <div className="text-muted-foreground">
                                      {color.description}
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {Object.keys(groupedColors).length === 0 && (
            <div className="py-16 text-center text-muted-foreground">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50">
                <Search className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="mb-2 text-lg font-medium">No colors found</h3>
              <p className="max-w-sm mx-auto text-sm text-muted-foreground/70">
                Try searching with different terms like theme names, color
                names, or categories.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper functions
function getCategoryForColor(colorName: string): string {
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

function getDescriptionForColor(colorName: string): string {
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
