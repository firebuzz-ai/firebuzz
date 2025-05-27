"use client";
import { FormLayout } from "@/components/layouts/two-panels/panels/brand/identity/form";
import { PanelLayout } from "@/components/layouts/two-panels/panels/brand/identity/panel";
import { TwoPanelsProvider } from "@/components/layouts/two-panels/provider";
import { MediaGalleryModal } from "@/components/modals/media/gallery/gallery-modal";
import { api, useCachedRichQuery } from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { useState } from "react";
import { type BrandConfigType, BrandIdentityForm } from "./form";
import { Panel } from "./panel";

export const BrandIdentity = ({
  rightPanelSize,
  id,
}: {
  rightPanelSize: number;
  id: string;
}) => {
  const [saveHandler, setSaveHandler] = useState<(() => Promise<void>) | null>(
    null
  );
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formValues, setFormValues] = useState<BrandConfigType | null>(null);

  // Fetch current brand data
  const { data: brand, isPending: isLoading } = useCachedRichQuery(
    api.collections.brands.queries.getCurrent
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center flex-1">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col flex-1 max-w-full max-h-full overflow-hidden">
      <TwoPanelsProvider
        rightPanelSizeFromCookie={rightPanelSize}
        id={id}
        isRightPanelClosable={false}
      >
        <FormLayout>
          <BrandIdentityForm
            isLoading={isLoading}
            brand={brand ?? null}
            isSaving={isSaving}
            setIsSaving={setIsSaving}
            setSaveHandler={setSaveHandler}
            setUnsavedChanges={setUnsavedChanges}
            setFormValues={setFormValues}
          />
        </FormLayout>
        <PanelLayout>
          <Panel
            hasChanges={unsavedChanges}
            onSave={saveHandler}
            isSaving={isSaving}
            formValues={formValues}
          />
        </PanelLayout>
      </TwoPanelsProvider>
      <MediaGalleryModal />
    </div>
  );
};
