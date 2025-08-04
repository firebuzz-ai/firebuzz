"use client";

import { type Id, api, useMutation } from "@firebuzz/convex";
import { atom } from "jotai";
import type { FormField } from "../_components/form-types";
import { autoSaveStateAtom, formDataAtom, originalFormDataAtom } from "./atoms";
import type { FormData, FormSettings } from "./types";

// Mutation atoms for optimistic updates
export const updateFormMutationAtom = atom(
  null,
  async (get, set, _formId: Id<"forms">, updates: Partial<FormData>) => {
    const currentData = get(formDataAtom);
    if (!currentData) return;

    // Optimistic update
    set(formDataAtom, { ...currentData, ...updates });
    set(autoSaveStateAtom, { status: "saving", pendingSave: true });

    try {
      // The actual mutation will be handled by the hook
      set(autoSaveStateAtom, { status: "saved", pendingSave: false });

      // Update original data to reflect successful save
      const updatedData = get(formDataAtom);
      if (updatedData) {
        set(originalFormDataAtom, updatedData);
      }
    } catch (error) {
      // Revert optimistic update on error
      set(formDataAtom, currentData);
      set(autoSaveStateAtom, { status: "error", pendingSave: false });
      throw error;
    }
  }
);

export const updateFormSettingsMutationAtom = atom(
  null,
  async (get, set, _formId: Id<"forms">, settings: FormSettings) => {
    const currentData = get(formDataAtom);
    if (!currentData) return;

    // Optimistic update
    set(formDataAtom, {
      ...currentData,
      submitButtonText: settings.submitButtonText,
      successMessage: settings.successMessage,
      successRedirectUrl: settings.successRedirectUrl,
    });

    set(autoSaveStateAtom, { status: "saving", pendingSave: true });

    try {
      // The actual mutation will be handled by the hook
      set(autoSaveStateAtom, { status: "saved", pendingSave: false });

      // Update original data
      const updatedData = get(formDataAtom);
      if (updatedData) {
        set(originalFormDataAtom, updatedData);
      }
    } catch (error) {
      // Revert optimistic update
      set(formDataAtom, currentData);
      set(autoSaveStateAtom, { status: "error", pendingSave: false });
      throw error;
    }
  }
);

// Hook-based mutations (since we need to use Convex hooks)
export const useFormMutations = () => {
  const updateFormMutation = useMutation(
    api.collections.forms.mutations.update
  );
  const updateFormSettingsMutation = useMutation(
    api.collections.forms.mutations.updateFormSettings
  );

  return {
    updateForm: async (formId: Id<"forms">, schema: FormField[]) => {
      const dbSchema = schema.map((field) => ({
        id: field.id,
        title: field.title,
        placeholder: field.placeholder || undefined,
        description: field.description || undefined,
        type: field.type,
        inputType: field.inputType,
        required: field.required,
        unique: field.unique,
        visible: field.visible,
        default: field.default,
        options: field.options,
      }));

      await updateFormMutation({
        id: formId,
        schema: dbSchema,
      });
    },

    updateFormSettings: async (formId: Id<"forms">, settings: FormSettings) => {
      await updateFormSettingsMutation({
        id: formId,
        submitButtonText: settings.submitButtonText,
        successMessage: settings.successMessage,
        successRedirectUrl: settings.successRedirectUrl,
      });
    },
  };
};
