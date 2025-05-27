"use client";

import { useColorSelectorModal } from "@/hooks/ui/use-color-selector-modal";
import {
  COLOR_CATEGORY_ORDER,
  LAST_THEMES,
  SANS_FONTS,
} from "@/lib/theme/constants";
import { themeSchema } from "@/lib/theme/schema";
import {
  generateColorsFromPrimary,
  getCategoryForColor,
  getDescriptionForColor,
} from "@/lib/theme/utils";
import { type Doc, api, useMutation } from "@firebuzz/convex";
import { Form } from "@firebuzz/ui/components/ui/form";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { hexToHsl, hslToHex } from "@firebuzz/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { defaultDarkTheme, defaultLightTheme } from "../../theme-variables";
import { ColorsSection } from "./colors-section";
import { RadiusSection } from "./radius-section";
import { TemplateSection } from "./template-section";
import { TypographySection } from "./typography-section";

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

const themeFormSchema = z.object({
  fonts: z.object({
    sans: z.string().min(1, "Sans font is required"),
    serif: z.string().min(1, "Serif font is required"),
    mono: z.string().min(1, "Mono font is required"),
  }),
  lightTheme: themeSchema.extend({
    radius: z.string(),
  }),
  darkTheme: themeSchema,
  template: z.string().optional(),
});

export type ThemeFormType = z.infer<typeof themeFormSchema>;

interface ThemeFormProps {
  setSaveHandler: React.Dispatch<
    React.SetStateAction<(() => Promise<void>) | null>
  >;
  setUnsavedChanges: (hasChanges: boolean) => void;
  setIsSaving: (isSaving: boolean) => void;
  setFormValues: (values: ThemeFormType) => void;
  isLoading: boolean;
  previewThemeMode: "light" | "dark";
  setPreviewThemeMode: React.Dispatch<React.SetStateAction<"light" | "dark">>;
  theme?: Doc<"themes">;
}

export const ThemeForm = ({
  setSaveHandler,
  setUnsavedChanges,
  setIsSaving,
  setFormValues,
  isLoading,
  theme,
  previewThemeMode,
  setPreviewThemeMode,
}: ThemeFormProps) => {
  const [hasInitialized, setHasInitialized] = useState(false);
  const { setState: setColorSelectorModalState } = useColorSelectorModal();

  const updateTheme = useMutation(
    api.collections.brands.themes.mutations.update
  );

  const form = useForm<ThemeFormType>({
    resolver: zodResolver(themeFormSchema),
    defaultValues: {
      fonts: {
        sans: "Inter",
        serif: "Georgia",
        mono: "JetBrains Mono",
      },
      lightTheme: { ...defaultLightTheme },
      darkTheme: { ...defaultDarkTheme },
      template: theme?.template,
    },
    mode: "onChange",
    shouldUseNativeValidation: false,
  });

  // Convert all theme colors to color items
  const themes = useMemo((): Array<{
    theme: "light" | "dark";
    colors: ThemeColorItem[];
  }> => {
    if (!theme) return [];

    const colors: ThemeColorItem[] = [];
    const currentFormValues = form.getValues();

    // Process light theme colors
    const lightThemeEntries = Object.entries(
      currentFormValues.lightTheme
    ).filter(
      ([key]) => key !== "radius" // exclude radius and template as they're not colors
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
    const darkThemeEntries = Object.entries(currentFormValues.darkTheme).filter(
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

    return [
      {
        theme: "light" as const,
        colors: colors
          .filter((c) => c.theme === "light")
          .sort((a, b) => {
            const aIndex = COLOR_CATEGORY_ORDER.indexOf(a.category);
            const bIndex = COLOR_CATEGORY_ORDER.indexOf(b.category);
            return aIndex - bIndex;
          }),
      },
      {
        theme: "dark" as const,
        colors: colors
          .filter((c) => c.theme === "dark")
          .sort((a, b) => {
            const aIndex = COLOR_CATEGORY_ORDER.indexOf(a.category);
            const bIndex = COLOR_CATEGORY_ORDER.indexOf(b.category);
            return aIndex - bIndex;
          }),
      },
    ];
  }, [theme, form.watch(), form.getValues()]);

  // Initialize form with theme data
  useEffect(() => {
    if (theme && !hasInitialized) {
      const initialFormValues = {
        fonts: {
          sans: theme.fonts?.find((f) => f.family === "sans")?.name || "Inter",
          serif:
            theme.fonts?.find((f) => f.family === "serif")?.name || "Georgia",
          mono:
            theme.fonts?.find((f) => f.family === "mono")?.name ||
            "JetBrains Mono",
        },
        lightTheme: theme.lightTheme,
        darkTheme: theme.darkTheme,
        template: theme.template,
      };

      form.reset(initialFormValues);
      setFormValues(initialFormValues); // Set initial values for preview
      setHasInitialized(true);
    }
  }, [theme, form, hasInitialized, setFormValues]);

  // Track unsaved changes
  useEffect(() => {
    if (!hasInitialized) return;
    setUnsavedChanges(form.formState.isDirty);
  }, [form.formState.isDirty, setUnsavedChanges, hasInitialized]);

  // Track form values for real-time preview
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (!hasInitialized) return;
      setFormValues(value as ThemeFormType);
    });
    return () => subscription.unsubscribe();
  }, [form, setFormValues, hasInitialized]);

  const handleColorClick = (color: {
    name: string;
    displayName: string;
    hexValue: string;
    description: string;
    theme: "light" | "dark";
  }) => {
    setColorSelectorModalState((prev) => {
      return {
        ...prev,
        isOpen: true,
        color: color.hexValue,
        activeTab: "library",
        onSelect: (sColor) => {
          // Update form field
          const hslValue = hexToHsl(sColor);
          if (color.theme === "light") {
            const currentLightTheme = form.getValues("lightTheme");
            form.setValue(
              "lightTheme",
              {
                ...currentLightTheme,
                [color.name]: hslValue,
              },
              {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              }
            );
          } else {
            const currentDarkTheme = form.getValues("darkTheme");
            form.setValue(
              "darkTheme",
              {
                ...currentDarkTheme,
                [color.name]: hslValue,
              },
              {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              }
            );
          }

          // Auto-generate colors if this is a primary color selection
          if (color.name === "primary") {
            try {
              if (color.theme === "light") {
                const generatedColors = generateColorsFromPrimary(sColor, true);
                form.setValue(
                  "lightTheme",
                  {
                    ...generatedColors,
                    radius: form.getValues("lightTheme").radius,
                  },
                  {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  }
                );
              } else {
                const generatedColors = generateColorsFromPrimary(
                  sColor,
                  false
                );
                form.setValue("darkTheme", generatedColors, {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                });
              }

              toast.success(
                `Auto-generated ${color.theme} theme colors from primary color`
              );
            } catch (error) {
              console.error("Failed to auto-generate colors:", error);
              toast.error(
                "Failed to auto-generate colors. Using manual selection."
              );
            }
          }
        },
      };
    });
  };

  // Template selection handler
  const handleTemplateSelect = (templateId: string) => {
    const builtInThemes = LAST_THEMES;
    const template = builtInThemes.find((theme) => theme.id === templateId);
    if (!template) return;

    const checkSansFontIsAvailable = (font: string) => {
      return (
        SANS_FONTS.google.some((f) => f.value === font) ||
        SANS_FONTS.system.some((f) => f.value === font)
      );
    };

    const checkSerifFontIsAvailable = (font: string) => {
      return (
        SANS_FONTS.google.some((f) => f.value === font) ||
        SANS_FONTS.system.some((f) => f.value === font)
      );
    };

    const checkMonoFontIsAvailable = (font: string) => {
      return (
        SANS_FONTS.google.some((f) => f.value === font) ||
        SANS_FONTS.system.some((f) => f.value === font)
      );
    };

    const removeSidebarColors = (theme: Record<string, string>) => {
      return Object.fromEntries(
        Object.entries(theme).filter(([key]) => !key.startsWith("sidebar"))
      );
    };

    // Extract fonts from template - try both light and dark themes
    const extractFontsFromTemplate = (template: {
      lightTheme?: Record<string, string>;
      darkTheme?: Record<string, string>;
    }) => {
      const fonts = {
        sans: "Inter", // default sans-serif fallback
        serif: "Georgia", // default serif fallback
        mono: "JetBrains Mono", // default monospace fallback
      };

      // Helper function to extract font name from CSS font-family value
      const extractFontName = (fontFamily: string | undefined) => {
        if (!fontFamily) return null;

        // Split by comma and try each font until we find a valid one
        const fonts = fontFamily
          .split(",")
          .map((f) => f.replace(/['"]/g, "").trim());

        // Skip system fonts like ui-serif, ui-sans-serif, ui-monospace
        const systemFonts = [
          "ui-serif",
          "ui-sans-serif",
          "ui-monospace",
          "sans-serif",
          "serif",
          "monospace",
          "system-ui",
        ];

        for (const font of fonts) {
          if (!systemFonts.includes(font.toLowerCase()) && font !== "") {
            return font;
          }
        }

        return null;
      };

      // Try light theme first, then dark theme as fallback
      const lightTheme = removeSidebarColors(template.lightTheme || {});
      const darkTheme = removeSidebarColors(template.darkTheme || {});

      // Extract font names, preferring light theme but falling back to dark theme
      const sansFont =
        extractFontName(lightTheme["font-sans"]) ||
        extractFontName(darkTheme["font-sans"]);
      const serifFont =
        extractFontName(lightTheme["font-serif"]) ||
        extractFontName(darkTheme["font-serif"]);
      const monoFont =
        extractFontName(lightTheme["font-mono"]) ||
        extractFontName(darkTheme["font-mono"]);

      if (sansFont && checkSansFontIsAvailable(sansFont)) fonts.sans = sansFont;
      if (serifFont && checkSerifFontIsAvailable(serifFont))
        fonts.serif = serifFont;
      if (monoFont && checkMonoFontIsAvailable(monoFont)) fonts.mono = monoFont;

      return fonts;
    };

    // Convert template format to form schema format
    const convertThemeFormat = (
      themeData: Record<string, string>
    ): z.infer<typeof themeSchema> => {
      const convertedTheme: Record<string, string> = {};

      // Convert kebab-case to camelCase and hex to HSL
      for (const [key, value] of Object.entries(themeData)) {
        // Exclude sidebar colors as we don't support them yet
        if (key.startsWith("sidebar")) continue;

        if (typeof value === "string" && value.startsWith("#")) {
          // Convert hex to HSL
          const hslValue = hexToHsl(value);

          // Convert kebab-case to camelCase
          const camelKey = key
            .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
            .replace("-", "");
          convertedTheme[camelKey] = hslValue;
        } else if (key === "radius") {
          // Keep radius as is
          convertedTheme[key] = value;
        }
        // Skip font-* keys as they're handled separately
      }

      // Template field is optional, only set if it doesn't exist
      // (it will be set later in the template selection logic)

      return convertedTheme as z.infer<typeof themeSchema>;
    };

    // Extract and apply fonts from template (check both light and dark themes)
    const templateFonts = extractFontsFromTemplate(template);
    form.setValue("fonts", templateFonts, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });

    form.setValue("template", templateId, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });

    // Apply the template to the form
    const lightThemeWithTemplate = {
      ...convertThemeFormat(template.lightTheme),
      radius: template.lightTheme.radius ?? "0.5rem",
    };

    const darkThemeWithTemplate = {
      ...convertThemeFormat(template.darkTheme),
    };

    form.setValue("lightTheme", lightThemeWithTemplate, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });

    form.setValue("darkTheme", darkThemeWithTemplate, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  // Save handler that will be exposed to parent component
  const handleSave = useCallback(async (): Promise<void> => {
    try {
      if (!theme) {
        throw new Error("Theme not found");
      }

      setIsSaving(true);

      // Validate the form
      const valid = await form.trigger();
      if (!valid) {
        console.error("Form validation errors:", form.formState.errors);
        throw new Error("Form validation failed");
      }

      // Get form values - they're already in HSL format
      const data = form.getValues();

      // Filter theme data to only include schema-defined properties
      const filterDarkThemeData = (
        themeData: Record<string, string>
      ): z.infer<typeof themeSchema> => {
        const schemaKeys = [
          "background",
          "foreground",
          "muted",
          "mutedForeground",
          "popover",
          "popoverForeground",
          "border",
          "input",
          "card",
          "cardForeground",
          "primary",
          "primaryForeground",
          "secondary",
          "secondaryForeground",
          "accent",
          "accentForeground",
          "destructive",
          "destructiveForeground",
          "ring",
          "chart1",
          "chart2",
          "chart3",
          "chart4",
          "chart5",
        ];

        const filteredTheme: Record<string, string> = {};
        for (const key of schemaKeys) {
          if (themeData[key] !== undefined) {
            filteredTheme[key] = themeData[key];
          }
        }
        return filteredTheme as z.infer<typeof themeSchema>;
      };

      const filterLightThemeData = (
        themeData: Record<string, string>
      ): z.infer<typeof themeSchema> & { radius: string } => {
        const schemaKeys = [
          "background",
          "foreground",
          "muted",
          "mutedForeground",
          "popover",
          "popoverForeground",
          "border",
          "input",
          "card",
          "cardForeground",
          "primary",
          "primaryForeground",
          "secondary",
          "secondaryForeground",
          "accent",
          "accentForeground",
          "destructive",
          "destructiveForeground",
          "ring",
          "chart1",
          "chart2",
          "chart3",
          "chart4",
          "chart5",
        ];

        const filteredTheme: Record<string, string> = {};
        for (const key of schemaKeys) {
          if (themeData[key] !== undefined) {
            filteredTheme[key] = themeData[key];
          }
        }
        return {
          ...filteredTheme,
          radius: themeData.radius,
        } as z.infer<typeof themeSchema> & { radius: string };
      };

      console.log({
        lightTheme: filterLightThemeData(data.lightTheme),
        darkTheme: filterDarkThemeData(data.darkTheme),
      });

      // Update the theme
      await updateTheme({
        id: theme._id,
        lightTheme: filterLightThemeData(data.lightTheme),
        darkTheme: filterDarkThemeData(data.darkTheme),
        template: data.template,
        fonts: [
          {
            family: "sans" as const,
            name: data.fonts.sans,
            type: "google" as const,
          },
          {
            family: "serif" as const,
            name: data.fonts.serif,
            type: "google" as const,
          },
          {
            family: "mono" as const,
            name: data.fonts.mono,
            type: "google" as const,
          },
        ],
      });

      // Reset form dirty state
      form.reset(data);

      toast.success("Theme updated successfully");
    } catch (error) {
      console.error("Failed to update theme:", error);
      toast.error("Failed to update theme");
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [form, theme, updateTheme, setIsSaving]);

  // Expose save handler to parent
  useEffect(() => {
    setSaveHandler(() => handleSave);
  }, [setSaveHandler, handleSave]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center flex-1">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-h-full py-4 overflow-y-auto">
      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()}>
          <TemplateSection
            onTemplateSelect={handleTemplateSelect}
            selectedTemplate={form.watch("template")}
            isLoading={isLoading}
          />
          <ColorsSection
            themes={themes}
            onColorClick={handleColorClick}
            previewThemeMode={previewThemeMode}
            setPreviewThemeMode={setPreviewThemeMode}
          />
          <TypographySection control={form.control} isLoading={isLoading} />
          <RadiusSection
            control={form.control}
            setValue={form.setValue}
            isLoading={isLoading}
          />
        </form>
      </Form>
    </div>
  );
};
