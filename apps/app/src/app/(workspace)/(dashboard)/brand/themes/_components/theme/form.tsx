"use client";

import { useColorSelectorModal } from "@/hooks/ui/use-color-selector-modal";
import { COLOR_CATEGORY_ORDER } from "@/lib/theme/constants";
import { themeSchema } from "@/lib/theme/schema";
import { getCategoryForColor, getDescriptionForColor } from "@/lib/theme/utils";
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
  lightTheme: themeSchema,
  darkTheme: themeSchema,
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
  theme?: Doc<"themes">;
}

export const ThemeForm = ({
  setSaveHandler,
  setUnsavedChanges,
  setIsSaving,
  setFormValues,
  isLoading,
  theme,
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
        serif: "Inter",
        mono: "Inter",
      },
      lightTheme: defaultLightTheme,
      darkTheme: defaultDarkTheme,
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
            theme.fonts?.find((f) => f.family === "serif")?.name || "Inter",
          mono: theme.fonts?.find((f) => f.family === "mono")?.name || "Inter",
        },
        lightTheme: theme.lightTheme,
        darkTheme: theme.darkTheme,
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
        },
      };
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
        throw new Error("Form validation failed");
      }

      // Get form values - they're already in HSL format
      const data = form.getValues();

      // Update the theme
      await updateTheme({
        id: theme._id,
        lightTheme: data.lightTheme,
        darkTheme: data.darkTheme,
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
          <TypographySection control={form.control} isLoading={isLoading} />

          <RadiusSection
            control={form.control}
            setValue={form.setValue}
            isLoading={isLoading}
          />

          <ColorsSection themes={themes} onColorClick={handleColorClick} />
        </form>
      </Form>
    </div>
  );
};
