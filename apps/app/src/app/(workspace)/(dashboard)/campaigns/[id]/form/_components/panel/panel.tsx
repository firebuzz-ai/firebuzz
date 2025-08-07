"use client";

import type { Id } from "@firebuzz/convex";
import { useState } from "react";
import type { PanelScreen } from "../form-types";
import { FieldSettingsView } from "./field-settings-view";
import { FormSettingsView } from "./form-settings-view";
import { InputTypesView } from "./input-types-view";

interface PanelProps {
  campaignId: Id<"campaigns">;
  formId: Id<"forms">;
}

export const Panel = ({ campaignId, formId }: PanelProps) => {
  const [currentScreen, setCurrentScreen] =
    useState<PanelScreen>("form-settings");
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  const handleScreenChange = (screen: PanelScreen) => {
    setCurrentScreen(screen);
  };

  const handleFieldSelect = (fieldId: string) => {
    setSelectedFieldId(fieldId);
  };

  const handleFieldDeleted = () => {
    setSelectedFieldId(null);
  };

  switch (currentScreen) {
    case "form-settings":
      return (
        <FormSettingsView
          campaignId={campaignId}
          formId={formId}
          onScreenChange={handleScreenChange}
          onFieldSelect={handleFieldSelect}
        />
      );
    case "input-types":
      return (
        <InputTypesView
          campaignId={campaignId}
          formId={formId}
          onScreenChange={handleScreenChange}
          onFieldSelect={handleFieldSelect}
        />
      );
    case "field-settings":
    case "option-edit":
      return (
        <FieldSettingsView
          campaignId={campaignId}
          formId={formId}
          selectedFieldId={selectedFieldId}
          onScreenChange={handleScreenChange}
          onFieldDeleted={handleFieldDeleted}
          currentScreen={currentScreen}
        />
      );
    default:
      return (
        <FormSettingsView
          campaignId={campaignId}
          formId={formId}
          onScreenChange={handleScreenChange}
          onFieldSelect={handleFieldSelect}
        />
      );
  }
};
