"use client";

import { RADIUS_OPTIONS } from "@/lib/theme/constants";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@firebuzz/ui/components/ui/form";
import { cn } from "@firebuzz/ui/lib/utils";

// SVG component for radius visualization
const RadiusIcon = ({ radius }: { radius: string }) => {
  const borderRadius =
    radius === "0"
      ? "0"
      : radius === "0.25rem"
        ? "2"
        : radius === "0.5rem"
          ? "4"
          : "6";

  return (
    <svg
      width="24"
      height="16"
      viewBox="0 0 24 16"
      fill="none"
      className="shrink-0"
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="12"
        rx={borderRadius}
        ry={borderRadius}
        fill="var(--brand)"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
};

interface RadiusSectionProps {
  // biome-ignore lint/suspicious/noExplicitAny: Control type not available from form library
  control: any; // Control from form hook
  // biome-ignore lint/suspicious/noExplicitAny: SetValue type not available from form library
  setValue: any; // SetValue function from form hook
  isLoading: boolean;
}

export const RadiusSection = ({
  control,
  setValue,
  isLoading,
}: RadiusSectionProps) => {
  return (
    <div className="px-4 py-4 space-y-6 border-b">
      <div>
        <h2 className="text-lg font-medium">Border Radius</h2>
        <p className="text-sm text-muted-foreground">
          Configure the roundness of corners for your theme
        </p>
      </div>
      <div className="space-y-4">
        <FormField
          control={control}
          name="lightTheme.radius"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Corner Roundness</FormLabel>
              <FormControl>
                <div className="grid grid-cols-2 gap-3">
                  {RADIUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        field.onChange(option.value);
                        // Also update dark theme to keep them in sync
                        setValue("darkTheme.radius", option.value, {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 text-left",
                        "hover:border-border hover:bg-muted/30",
                        "focus:outline-none focus:ring-0",
                        field.value === option.value
                          ? "border-brand bg-brand/5 hover:border-brand/50 hover:bg-brand/10 text-brand"
                          : "border-border/40 text-foreground"
                      )}
                      disabled={isLoading}
                    >
                      <RadiusIcon radius={option.value} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {option.label}
                        </div>
                        <div
                          className={cn(
                            "text-xs text-muted-foreground",
                            field.value === option.value
                              ? "text-brand/50"
                              : "text-muted-foreground"
                          )}
                        >
                          {option.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </FormControl>
              <FormDescription>
                Choose the border radius for UI components
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};
