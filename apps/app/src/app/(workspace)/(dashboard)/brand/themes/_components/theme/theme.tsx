"use client";
import { FormLayout } from "@/components/layouts/two-panels/panels/brand/identity/form";
import { PanelLayout } from "@/components/layouts/two-panels/panels/brand/identity/panel";
import { TwoPanelsProvider } from "@/components/layouts/two-panels/provider";
import { ColorSelectorModal } from "@/components/modals/color-selector/modal";
import { MediaGalleryModal } from "@/components/modals/media/gallery/gallery-modal";
import { type Id, api, useCachedRichQuery } from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { useTheme } from "next-themes";
import { useState } from "react";
import { ThemeForm, type ThemeFormType } from "./form";
import { ThemePanel } from "./panel";

export const Theme = ({
  rightPanelSize,
  id,
  themeId,
}: {
  rightPanelSize: number;
  id: string;
  themeId: Id<"themes">;
}) => {
  const [saveHandler, setSaveHandler] = useState<(() => Promise<void>) | null>(
    null
  );
  const { theme: resolvedTheme } = useTheme();
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formValues, setFormValues] = useState<ThemeFormType | null>(null);
  const [previewThemeMode, setPreviewThemeMode] = useState<"light" | "dark">(
    resolvedTheme === "dark" ? "dark" : "light"
  );

  // Fetch current brand data
  const { data: theme, isPending: isLoading } = useCachedRichQuery(
    api.collections.brands.themes.queries.getById,
    { id: themeId }
  );

  if (isLoading || !resolvedTheme) {
    return (
      <div className="flex items-center justify-center flex-1">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <>
      <TwoPanelsProvider
        rightPanelSizeFromCookie={rightPanelSize}
        id={id}
        isRightPanelClosable={false}
      >
        <FormLayout>
          <ThemeForm
            key={themeId}
            isLoading={isLoading}
            setFormValues={setFormValues}
            theme={theme}
            setSaveHandler={setSaveHandler}
            setUnsavedChanges={setUnsavedChanges}
            setIsSaving={setIsSaving}
            setPreviewThemeMode={setPreviewThemeMode}
            previewThemeMode={previewThemeMode}
          />
        </FormLayout>
        <PanelLayout>
          <ThemePanel
            previewThemeMode={previewThemeMode}
            setPreviewThemeMode={setPreviewThemeMode}
            hasChanges={unsavedChanges}
            onSave={saveHandler}
            isSaving={isSaving}
            formValues={formValues}
          />
        </PanelLayout>
      </TwoPanelsProvider>
      <MediaGalleryModal />
      <ColorSelectorModal />
    </>
  );
};
