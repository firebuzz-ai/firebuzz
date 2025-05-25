"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { cn } from "@firebuzz/ui/lib/utils";

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
}

export const ColorsSection = ({ themes, onColorClick }: ColorsSectionProps) => {
  return (
    <>
      {themes.map((themeI) => {
        const colors = themeI.colors;

        return (
          <div key={themeI.theme} className="p-4 first:border-b">
            <div className="">
              <h2 className="text-lg font-medium capitalize">
                {themeI.theme} Theme
              </h2>
              <p className="text-sm text-muted-foreground">
                Configure colors for the {themeI.theme} theme variant
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {colors.map((color) => {
                return (
                  <Tooltip
                    disableHoverableContent
                    key={`${themeI.theme}-${color.name}`}
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
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
};
