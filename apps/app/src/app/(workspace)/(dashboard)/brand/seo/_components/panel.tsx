"use client";

import { DottedGridBackground } from "@firebuzz/ui/components/reusable/dotted-grid-background";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { useHotkeys } from "react-hotkeys-hook";
import type { BrandSeoType } from "./form";
import { PreviewCards } from "./preview-cards";

interface PanelProps {
  hasChanges: boolean;
  onSave: (() => Promise<void>) | null;
  isSaving: boolean;
  formValues: BrandSeoType | null;
  brandName?: string;
  brandWebsite?: string;
  brandIconDark?: string;
  brandIconLight?: string;
  pageTitle: string;
}

export const Panel = ({
  hasChanges,
  onSave,
  isSaving,
  formValues,
  brandName,
  brandWebsite,
  brandIconDark,
  brandIconLight,
  pageTitle,
}: PanelProps) => {
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

  const handleSave = async () => {
    if (onSave && !isSaving) {
      try {
        await onSave();
      } catch (error) {
        // Error is handled by the form component
        console.error("Save failed:", error);
      }
    }
  };

  return (
    <div className="flex overflow-hidden relative flex-col h-full max-h-full bg-muted">
      {/* Header */}
      <div className="relative z-10 px-6 py-4 border-b backdrop-blur bg-background/95">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-semibold">SEO Preview</h2>
            <p className="text-sm text-muted-foreground">
              Real-time preview of your SEO settings and social media
              optimization
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={!hasChanges || !onSave || isSaving}
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
      </div>

      {/* Content */}
      <div className="flex overflow-hidden relative flex-col flex-1 gap-4 bg-muted">
        <DottedGridBackground />

        <div className="overflow-y-auto relative z-10 p-6 h-full">
          <PreviewCards
            formValues={formValues}
            brandName={brandName}
            brandWebsite={brandWebsite}
            brandIconDark={brandIconDark}
            brandIconLight={brandIconLight}
            pageTitle={pageTitle}
          />
        </div>
      </div>
    </div>
  );
};
