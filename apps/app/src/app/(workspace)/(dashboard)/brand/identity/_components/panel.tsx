"use client";

import { BrowserPreview } from "@/lib/theme/preview";
import { api, useCachedRichQuery } from "@firebuzz/convex";
import { DottedGridBackground } from "@firebuzz/ui/components/reusable/dotted-grid-background";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { useTheme } from "next-themes";
import { useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

interface PanelProps {
  hasChanges: boolean;
  onSave: (() => Promise<void>) | null;
  isSaving: boolean;
  formValues: {
    name: string;
    website?: string;
    description?: string;
    persona?: string;
    logo?: string;
    logoDark?: string;
    favicon?: string;
    phone?: string;
    email?: string;
    address?: string;
  } | null;
}

export const Panel = ({
  hasChanges = false,
  onSave,
  isSaving = false,
  formValues,
}: PanelProps) => {
  const { resolvedTheme } = useTheme();
  const { data: brand, isPending: isLoadingBrand } = useCachedRichQuery(
    api.collections.brands.queries.getCurrent
  );

  const { data: theme, isPending: isLoadingTheme } = useCachedRichQuery(
    api.collections.brands.themes.queries.getById,
    brand?.defaultThemeId
      ? {
          id: brand.defaultThemeId,
        }
      : "skip"
  );

  useHotkeys(
    "meta+s",
    () => {
      if (onSave && !isSaving && hasChanges) {
        onSave();
      }
    },
    {
      preventDefault: true,
    }
  );

  const { data: allThemes, isPending: isLoadingAllThemes } = useCachedRichQuery(
    api.collections.brands.themes.queries.getAll,
    !brand?.defaultThemeId && !isLoadingTheme
      ? {
          showHidden: true,
        }
      : "skip"
  );

  const [previewMode, setPreviewMode] = useState<"light" | "dark">(
    resolvedTheme === "dark" ? "dark" : "light"
  );

  // Use form values for preview if available, otherwise fall back to saved brand data
  const previewData = useMemo(() => {
    return {
      name: formValues?.name || brand?.name || "",
      website: formValues?.website || brand?.website,
      description: formValues?.description || brand?.description,
      persona: formValues?.persona || brand?.persona,
      logo:
        previewMode === "dark"
          ? formValues?.logoDark || brand?.logoDark
          : formValues?.logo || brand?.logo,
      favicon: formValues?.favicon || brand?.seo?.favicon,
      phone: formValues?.phone || brand?.phone,
      email: formValues?.email || brand?.email,
      address: formValues?.address || brand?.address,
    };
  }, [brand, formValues, previewMode]);
  const themeData = useMemo(() => {
    if (
      !theme &&
      (!allThemes || allThemes.length === 0) &&
      !isLoadingTheme &&
      !isLoadingAllThemes
    ) {
      return null;
    }

    if (theme) {
      const fonts = {
        sans: theme.fonts?.find((f) => f.family === "sans")?.name || "Inter",
        serif:
          theme.fonts?.find((f) => f.family === "serif")?.name || "Georgia",
        mono:
          theme.fonts?.find((f) => f.family === "mono")?.name ||
          "JetBrains Mono",
      };
      return {
        fonts,
        darkTheme: theme.darkTheme,
        lightTheme: theme.lightTheme,
        template: theme.template,
      };
    }

    const firstTheme = allThemes?.[0];

    if (firstTheme) {
      const fonts = {
        sans:
          firstTheme.fonts?.find((f) => f.family === "sans")?.name || "Inter",
        serif:
          firstTheme.fonts?.find((f) => f.family === "serif")?.name ||
          "Georgia",
        mono:
          firstTheme.fonts?.find((f) => f.family === "mono")?.name ||
          "JetBrains Mono",
      };
      return {
        fonts,
        darkTheme: firstTheme.darkTheme,
        lightTheme: firstTheme.lightTheme,
        template: firstTheme.template,
      };
    }

    return null;
  }, [theme, allThemes, isLoadingTheme, isLoadingAllThemes]);

  if (isLoadingBrand || !themeData || !resolvedTheme) {
    return (
      <div className="overflow-hidden relative flex-1 p-6 h-full bg-muted/30">
        <DottedGridBackground />
        <div className="flex relative z-10 justify-center items-center h-full bg-muted/30">
          <div className="space-y-4 text-center">
            <Skeleton className="mx-auto w-48 h-8" />
            <Skeleton className="mx-auto w-64 h-4" />
            <div className="overflow-hidden mx-auto max-w-4xl rounded-lg border shadow-xl bg-background">
              <div className="px-4 py-3 border-b bg-muted/50">
                <Skeleton className="w-full h-6" />
              </div>
              <div className="p-8 space-y-6">
                <Skeleton className="mx-auto w-3/4 h-12" />
                <Skeleton className="w-full h-6" />
                <Skeleton className="w-5/6 h-6" />
                <div className="flex gap-4 justify-center">
                  <Skeleton className="w-32 h-10" />
                  <Skeleton className="w-32 h-10" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!previewData) {
    return (
      <div className="overflow-hidden relative flex-1 p-6 bg-muted/30">
        <DottedGridBackground />
        <div className="flex relative z-10 justify-center items-center h-full">
          <div className="space-y-4 text-center">
            <h3 className="text-lg font-medium text-muted-foreground">
              No Brand Data Available
            </h3>
            <p className="text-sm text-muted-foreground">
              Configure your brand identity to see the preview
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex overflow-hidden relative flex-col h-full max-h-full bg-muted">
      {/* Header */}
      <div className="relative z-10 px-6 py-4 border-b backdrop-blur bg-background/95">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-semibold">Brand Preview</h2>
            <p className="text-sm text-muted-foreground">
              See how your brand identity appears across platforms
              {hasChanges && (
                <span className="ml-1 font-medium text-brand">
                  • Live Preview
                </span>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              if (onSave) {
                await onSave();
              }
            }}
            disabled={!hasChanges || isSaving}
            size="sm"
            className="font-medium"
          >
            {isSaving ? (
              <>
                <Spinner size="sm" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex overflow-hidden relative flex-col flex-1 gap-4 bg-muted">
        <DottedGridBackground />

        <div className="relative z-10 p-8 h-full">
          <BrowserPreview
            previewMode={previewMode}
            brandData={previewData}
            onThemeToggle={(checked: boolean) =>
              setPreviewMode(checked ? "dark" : "light")
            }
            themeData={themeData}
          />
        </div>
      </div>
    </div>
  );
};
