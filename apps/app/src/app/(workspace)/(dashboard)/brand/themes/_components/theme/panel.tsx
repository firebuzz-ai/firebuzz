import { BrowserPreview } from "@/lib/theme/preview";
import { api, useCachedRichQuery } from "@firebuzz/convex";
import { DottedGridBackground } from "@firebuzz/ui/components/reusable/dotted-grid-background";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { useTheme } from "next-themes";
import { useHotkeys } from "react-hotkeys-hook";
import type { ThemeFormType } from "./form";

interface ThemePanelProps {
  previewThemeMode: "light" | "dark";
  setPreviewThemeMode: React.Dispatch<React.SetStateAction<"light" | "dark">>;
  hasChanges: boolean;
  onSave: (() => Promise<void>) | null;
  isSaving: boolean;
  formValues?: ThemeFormType | null;
}

export const ThemePanel = ({
  hasChanges,
  onSave,
  isSaving,
  formValues,
  previewThemeMode,
  setPreviewThemeMode,
}: ThemePanelProps) => {
  const { resolvedTheme } = useTheme();
  // Fetch brand data
  const { data: brand } = useCachedRichQuery(
    api.collections.brands.queries.getCurrent
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

  if (!formValues) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-sm font-medium">Theme Preview</h3>
          <Button disabled size="sm">
            Save
          </Button>
        </div>
        <div className="flex items-center justify-center flex-1">
          <p className="text-sm text-muted-foreground">
            Loading theme preview...
          </p>
        </div>
      </div>
    );
  }

  // Use brand data for preview
  const brandData = {
    name: brand?.name || "Your Brand",
    logo:
      previewThemeMode === "dark"
        ? brand?.logoDark || brand?.logo
        : brand?.logo,
    favicon: brand?.seo?.favicon,
    description: brand?.description,
    website: brand?.website,
    phone: brand?.phone,
    email: brand?.email,
    address: brand?.address,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with save button only */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <h3 className="text-sm font-medium">Theme Preview</h3>

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
            <>
              Save Changes
              <ButtonShortcut>⌘S</ButtonShortcut>
            </>
          )}
        </Button>
      </div>

      {/* Preview Content */}
      <div className="relative flex-1 overflow-hidden bg-muted">
        <DottedGridBackground isDark={resolvedTheme === "dark"} />

        <div className="relative z-10 h-full p-8">
          <BrowserPreview
            previewMode={previewThemeMode}
            brandData={brandData}
            onThemeToggle={(checked: boolean) =>
              setPreviewThemeMode(checked ? "dark" : "light")
            }
            themeData={formValues}
          />
        </div>
      </div>
    </div>
  );
};
