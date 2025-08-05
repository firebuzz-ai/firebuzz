"use client";

import type { Id } from "@firebuzz/convex";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useDebouncedCallback } from "use-debounce";
import {
	addFieldAtom,
	autoSaveStateAtom,
	currentPanelScreenAtom,
	deleteFieldAtom,
	formChangesAtom,
	formDataAtom,
	formFieldsAtom,
	formSettingsAtom,
	isEditingDescriptionAtom,
	isEditingTitleAtom,
	originalFormDataAtom,
	reorderFieldsAtom,
	selectedFieldAtom,
	selectedFieldIdAtom,
	selectedOptionAtom,
	updateFieldAtom,
	updateFormSettingsAtom,
} from "./atoms";
import { useFormDataLoader } from "./loader";
import { useFormMutations } from "./mutations";
import type { FormData } from "./types";

// Main hook for form state management
export const useFormState = (campaignId: Id<"campaigns">) => {
	const [formData, setFormData] = useAtom(formDataAtom);
	const setOriginalFormData = useSetAtom(originalFormDataAtom);
	const autoSaveState = useAtomValue(autoSaveStateAtom);

	// Load data from Convex
	const { form, isLoading, error } = useFormDataLoader(campaignId);

	// Initialize atoms when data loads
	useEffect(() => {
		if (form && (!formData || formData._id !== form._id)) {
			const formDataWithCampaign: FormData = {
				...form,
				schema: form.schema.map((field) => ({
					...field,
					placeholder: field.placeholder || "",
					description: field.description || "",
					default: field.default ?? undefined,
				})),
				campaign: form.campaign
					? {
							_id: form.campaign._id,
							title: form.campaign.title,
							publishedAt: form.campaign.publishedAt,
						}
					: undefined,
			};

			setFormData(formDataWithCampaign);
			setOriginalFormData(formDataWithCampaign);

			if (form.campaign) {
				// Set campaign data atom if needed
			}
		}
	}, [form, formData, setFormData, setOriginalFormData]);

	return {
		formData,
		isLoading,
		error,
		saveStatus: autoSaveState.status,
	};
};

// Hook for form fields management
export const useFormFields = () => {
	const formFields = useAtomValue(formFieldsAtom);
	const selectedField = useAtomValue(selectedFieldAtom);
	const [selectedFieldId, setSelectedFieldId] = useAtom(selectedFieldIdAtom);
	const updateField = useSetAtom(updateFieldAtom);
	const addField = useSetAtom(addFieldAtom);
	const deleteField = useSetAtom(deleteFieldAtom);
	const reorderFields = useSetAtom(reorderFieldsAtom);

	return {
		formFields,
		selectedField,
		selectedFieldId,
		setSelectedFieldId,
		updateField,
		addField,
		deleteField,
		reorderFields,
	};
};

// Hook for form settings management
export const useFormSettings = () => {
	const formSettings = useAtomValue(formSettingsAtom);
	const updateSettings = useSetAtom(updateFormSettingsAtom);

	return {
		formSettings,
		updateSettings,
	};
};

// Hook for UI state management
export const useFormUI = () => {
	const [selectedOption, setSelectedOption] = useAtom(selectedOptionAtom);
	const [currentPanelScreen, setCurrentPanelScreen] = useAtom(
		currentPanelScreenAtom,
	);
	const [isEditingTitle, setIsEditingTitle] = useAtom(isEditingTitleAtom);
	const [isEditingDescription, setIsEditingDescription] = useAtom(
		isEditingDescriptionAtom,
	);

	return {
		selectedOption,
		setSelectedOption,
		currentPanelScreen,
		setCurrentPanelScreen,
		isEditingTitle,
		setIsEditingTitle,
		isEditingDescription,
		setIsEditingDescription,
	};
};

// Hook for auto-save functionality
export const useFormAutoSave = () => {
	const formData = useAtomValue(formDataAtom);
	const formChanges = useAtomValue(formChangesAtom);
	const [autoSaveState, setAutoSaveState] = useAtom(autoSaveStateAtom);
	const setOriginalFormData = useSetAtom(originalFormDataAtom);
	const { updateForm, updateFormSettings } = useFormMutations();

	// Debounced save function
	const debouncedSave = useDebouncedCallback(
		async () => {
			if (!formData || !formChanges.hasChanges) return;

			setAutoSaveState({ status: "saving", pendingSave: true });

			try {
				// Save form schema if fields changed (schema structure changes or any individual field changes)
				const hasSchemaChanges =
					formChanges.changedFields.has("schema") ||
					Array.from(formChanges.changedFields).some(
						(field) =>
							// Check if this is a field ID (not a form-level setting)
							![
								"submitButtonText",
								"successMessage",
								"successRedirectUrl",
							].includes(field),
					);

				if (hasSchemaChanges) {
					await updateForm(formData._id as Id<"forms">, formData.schema);
				}

				// Save form settings if they changed
				const settingsChanged = [
					"submitButtonText",
					"successMessage",
					"successRedirectUrl",
				].some((field) => formChanges.changedFields.has(field));

				if (settingsChanged) {
					await updateFormSettings(formData._id as Id<"forms">, {
						submitButtonText: formData.submitButtonText || "",
						successMessage: formData.successMessage || "",
						successRedirectUrl: formData.successRedirectUrl || "",
					});
				}

				setAutoSaveState({ status: "saved", pendingSave: false });

				// Update original data after successful save to reset change detection
				if (formData) {
					setOriginalFormData({ ...formData });
				}
			} catch (error) {
				console.error("Auto-save failed:", error);
				setAutoSaveState({ status: "error", pendingSave: false });
			}
		},
		5000, // 5 seconds debounce
		{ maxWait: 10000 }, // Force save after 10 seconds max
	);

	// Trigger auto-save when changes are detected
	useEffect(() => {
		if (formChanges.hasChanges && !autoSaveState.pendingSave) {
			setAutoSaveState({ status: "pending", pendingSave: false });
			debouncedSave();
		}
	}, [
		formChanges.hasChanges,
		autoSaveState.pendingSave,
		debouncedSave,
		setAutoSaveState,
	]);

	// Auto-hide "saved" status after 2 seconds
	useEffect(() => {
		if (autoSaveState.status === "saved") {
			const timer = setTimeout(() => {
				if (!formChanges.hasChanges) {
					setAutoSaveState({ status: "idle", pendingSave: false });
				}
			}, 2000);
			return () => clearTimeout(timer);
		}
	}, [autoSaveState.status, formChanges.hasChanges, setAutoSaveState]);

	// Manual save function
	const saveNow = useCallback(async () => {
		debouncedSave.cancel();

		if (!formData || !formChanges.hasChanges) return;

		setAutoSaveState({ status: "saving", pendingSave: true });

		try {
			// Save form schema if fields changed (schema structure changes or any individual field changes)
			const hasSchemaChanges =
				formChanges.changedFields.has("schema") ||
				Array.from(formChanges.changedFields).some(
					(field) =>
						// Check if this is a field ID (not a form-level setting)
						![
							"submitButtonText",
							"successMessage",
							"successRedirectUrl",
						].includes(field),
				);

			if (hasSchemaChanges) {
				await updateForm(formData._id as Id<"forms">, formData.schema);
			}

			// Save form settings if they changed
			const settingsChanged = [
				"submitButtonText",
				"successMessage",
				"successRedirectUrl",
			].some((field) => formChanges.changedFields.has(field));

			if (settingsChanged) {
				await updateFormSettings(formData._id as Id<"forms">, {
					submitButtonText: formData.submitButtonText || "",
					successMessage: formData.successMessage || "",
					successRedirectUrl: formData.successRedirectUrl || "",
				});
			}

			setAutoSaveState({ status: "saved", pendingSave: false });

			// Update original data after successful save
			if (formData) {
				setOriginalFormData({ ...formData });
			}
		} catch (error) {
			console.error("Manual save failed:", error);
			setAutoSaveState({ status: "error", pendingSave: false });
		}
	}, [
		formData,
		formChanges,
		updateForm,
		updateFormSettings,
		debouncedSave,
		setAutoSaveState,
		setOriginalFormData,
	]);

	// Global CMD+S handler
	useHotkeys(
		"s+meta",
		() => {
			saveNow();
		},
		{
			preventDefault: true,
			enabled: autoSaveState.status !== "saving",
		},
	);

	return {
		saveStatus: autoSaveState.status,
		hasChanges: formChanges.hasChanges,
		saveNow,
	};
};

// Convenience hook that combines all form functionality
export const useForm = (campaignId: Id<"campaigns">) => {
	const formState = useFormState(campaignId);
	const formFields = useFormFields();
	const formSettings = useFormSettings();
	const formUI = useFormUI();
	const autoSave = useFormAutoSave();

	return {
		...formState,
		...formFields,
		...formSettings,
		...formUI,
		...autoSave,
	};
};
