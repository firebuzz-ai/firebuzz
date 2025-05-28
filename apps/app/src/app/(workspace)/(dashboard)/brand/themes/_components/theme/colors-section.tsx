"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@firebuzz/ui/components/ui/accordion";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { buttonVariants } from "@firebuzz/ui/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { cn } from "@firebuzz/ui/lib/utils";
import { useMemo } from "react";

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

interface ThemeData {
  theme: "light" | "dark";
  colors: ThemeColorItem[];
}

interface ColorsSectionProps {
  themes: ThemeData[];
  onColorClick: (color: {
    name: string;
    displayName: string;
    hexValue: string;
    description: string;
    theme: "light" | "dark";
  }) => void;
  previewThemeMode: "light" | "dark";
  setPreviewThemeMode: React.Dispatch<React.SetStateAction<"light" | "dark">>;
}

export const ColorsSection = ({
  themes,
  onColorClick,
  previewThemeMode,
  setPreviewThemeMode,
}: ColorsSectionProps) => {
  // Separate primary colors from other colors for each theme
  const organizedThemes = useMemo(() => {
    return themes.map((themeData) => {
      const primaryColor = themeData.colors.find(
        (color) => color.name === "primary"
      );
      const otherColors = themeData.colors;

      // Group other colors by category
      const colorsByCategory = otherColors.reduce(
        (acc, color) => {
          if (!acc[color.category]) {
            acc[color.category] = [];
          }
          acc[color.category].push(color);
          return acc;
        },
        {} as Record<string, ThemeColorItem[]>
      );

      return {
        ...themeData,
        primaryColor,
        colorsByCategory,
      };
    });
  }, [themes]);

  // Enhanced primary color click handler that also generates colors
  const handlePrimaryColorClick = (primaryColor: ThemeColorItem) => {
    // Open the color selector - auto-generation will happen in the form
    onColorClick({
      name: primaryColor.name,
      displayName: primaryColor.displayName,
      hexValue: primaryColor.hexValue,
      description: primaryColor.description,
      theme: primaryColor.theme,
    });
  };

  return (
    <div>
      {organizedThemes.map((themeData) => {
        const { theme, primaryColor, colorsByCategory } = themeData;

        return (
          <div key={theme} className="px-4 py-8 space-y-6 border-b">
            {/* Theme Header */}
            <div className="">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-medium capitalize">
                    {theme} Theme{" "}
                    {previewThemeMode === theme ? (
                      <Badge
                        className="cursor-default select-none"
                        variant="brand"
                      >
                        Current
                      </Badge>
                    ) : (
                      <Badge
                        className="cursor-pointer"
                        onClick={() => setPreviewThemeMode(theme)}
                        variant="outline"
                      >
                        Switch
                      </Badge>
                    )}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Click primary color to customize and auto-generate
                    harmonious colors
                  </p>
                </div>
              </div>
            </div>

            {/* Primary Color Section */}
            <div className="">
              <div className="mb-3">
                <h3 className="mb-1 text-sm font-medium text-foreground">
                  Primary Color
                </h3>
                <p className="text-xs text-muted-foreground">
                  Your main brand color - clicking will auto-generate all other
                  colors
                </p>
              </div>

              {primaryColor ? (
                <Tooltip disableHoverableContent>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handlePrimaryColorClick(primaryColor)}
                      className={cn(
                        "group relative flex items-center gap-3 p-3 rounded-lg border border-border/40 transition-all duration-200 w-full",
                        "hover:border-border hover:shadow-sm hover:bg-muted/30",
                        "focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 focus:ring-offset-background",
                        "active:scale-98 active:duration-75"
                      )}
                    >
                      <div
                        className="w-10 h-10 border rounded-lg shadow-sm border-border/40 shrink-0"
                        style={{
                          backgroundColor: primaryColor.hexValue,
                        }}
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-sm font-medium capitalize text-foreground">
                          {primaryColor.displayName}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {primaryColor.hexValue}
                        </div>
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    align="start"
                    className="text-xs font-medium"
                  >
                    <div className="text-left">
                      <div className="font-medium">
                        Click to edit and auto-generate
                      </div>
                      <div className="text-muted-foreground">
                        All other colors will be generated with perfect harmony
                        and contrast
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div className="p-3 text-sm border border-dashed rounded-lg text-muted-foreground bg-muted/50">
                  No primary color found
                </div>
              )}
            </div>

            {/* Other Colors in Accordion */}
            {Object.keys(colorsByCategory).length > 0 && (
              <Accordion type="single" collapsible>
                <AccordionItem value="other-colors" className="border-0">
                  <AccordionTrigger
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                      className: "text-left",
                    })}
                  >
                    <div className="flex items-center gap-2">
                      <span>All Colors</span>
                      <span className="text-xs text-muted-foreground">
                        ({Object.values(colorsByCategory).flat().length} colors)
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pt-3 pb-3 border-t-none">
                    <div className="space-y-4">
                      {Object.entries(colorsByCategory).map(
                        ([category, colors]) => (
                          <div key={category}>
                            <h4 className="mb-2 text-xs font-medium tracking-wide uppercase text-muted-foreground">
                              {category}
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                              {colors.map((color) => (
                                <Tooltip
                                  disableHoverableContent
                                  key={`${theme}-${color.name}`}
                                >
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onColorClick({
                                          name: color.name,
                                          displayName: color.displayName,
                                          hexValue: color.hexValue,
                                          description: color.description,
                                          theme: color.theme,
                                        })
                                      }
                                      className={cn(
                                        "group relative flex items-center gap-2 p-2 rounded-md border border-border/40 transition-all duration-200",
                                        "hover:border-border hover:shadow-sm hover:bg-muted/30",
                                        "focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 focus:ring-offset-background",
                                        "active:scale-98 active:duration-75"
                                      )}
                                    >
                                      <div
                                        className="w-5 h-5 border rounded-sm shadow-sm border-border/40 shrink-0"
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
                                    className="text-xs font-medium border bg-popover/95 backdrop-blur-sm border-border/50"
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
                        )
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </div>
        );
      })}
    </div>
  );
};
