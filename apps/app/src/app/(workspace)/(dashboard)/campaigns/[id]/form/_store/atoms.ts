"use client";

import { atom } from "jotai";
import { atomWithReset } from "jotai/utils";
import type { FormField, PanelScreen } from "../_components/form-types";
import type {
	AutoSaveState,
	FormChanges,
	FormData,
	FormSettings,
} from "./types";

// Core form data atoms
export const formDataAtom = atom<FormData | null>(null);
export const originalFormDataAtom = atom<FormData | null>(null);

// Derived atoms for form parts
export const formFieldsAtom = atom<FormField[]>((get) => {
	const formData = get(formDataAtom);
	return formData?.schema || [];
});

export const formSettingsAtom = atom<FormSettings>((get) => {
	const formData = get(formDataAtom);
	return {
		submitButtonText: formData?.submitButtonText || "",
		successMessage: formData?.successMessage || "",
		successRedirectUrl: formData?.successRedirectUrl || "",
	};
});

// Form settings write atom
export const updateFormSettingsAtom = atom(
	null,
	(get, set, update: Partial<FormSettings>) => {
		const currentData = get(formDataAtom);
		if (!currentData) return;

		set(formDataAtom, {
			...currentData,
			...update,
		});
	},
);

// Field management atoms
export const selectedFieldAtom = atom<FormField | null>((get) => {
	const fields = get(formFieldsAtom);
	const selectedId = get(selectedFieldIdAtom);
	return fields.find((field) => field.id === selectedId) || null;
});

export const updateFieldAtom = atom(
	null,
	(get, set, fieldId: string, updates: Partial<FormField>) => {
		const currentData = get(formDataAtom);
		if (!currentData) return;

		const updatedSchema = currentData.schema.map((field) =>
			field.id === fieldId ? { ...field, ...updates } : field,
		);

		set(formDataAtom, {
			...currentData,
			schema: updatedSchema,
		});
	},
);

export const addFieldAtom = atom(null, (get, set, newField: FormField) => {
	const currentData = get(formDataAtom);
	if (!currentData) return;

	set(formDataAtom, {
		...currentData,
		schema: [...currentData.schema, newField],
	});
});

export const deleteFieldAtom = atom(null, (get, set, fieldId: string) => {
	const currentData = get(formDataAtom);
	if (!currentData) return;

	const updatedSchema = currentData.schema.filter(
		(field) => field.id !== fieldId,
	);

	set(formDataAtom, {
		...currentData,
		schema: updatedSchema,
	});
});

export const reorderFieldsAtom = atom(
	null,
	(get, set, newOrder: FormField[]) => {
		const currentData = get(formDataAtom);
		if (!currentData) return;

		set(formDataAtom, {
			...currentData,
			schema: newOrder,
		});
	},
);

// UI state atoms
export const selectedFieldIdAtom = atom<string | null>(null);
export const selectedOptionAtom = atom<{ label: string; value: string } | null>(
	null,
);
export const currentPanelScreenAtom = atom<PanelScreen>("form-settings");
export const isEditingTitleAtom = atomWithReset(false);
export const isEditingDescriptionAtom = atomWithReset(false);

// Auto-save and change detection atoms
export const autoSaveStateAtom = atom<AutoSaveState>({
	status: "idle",
	pendingSave: false,
});

export const formChangesAtom = atom<FormChanges>((get) => {
	const current = get(formDataAtom);
	const original = get(originalFormDataAtom);

	if (!current || !original) {
		return {
			hasChanges: false,
			changedFields: new Set(),
			lastChanged: 0,
		};
	}

	const changedFields = new Set<string>();

	// Track which fields have changed
	if (current.schema.length !== original.schema.length) {
		changedFields.add("schema");
	} else {
		// Check if field order changed by comparing IDs at each position
		const currentIds = current.schema.map((f) => f.id);
		const originalIds = original.schema.map((f) => f.id);
		const orderChanged = currentIds.some(
			(id, index) => id !== originalIds[index],
		);

		if (orderChanged) {
			changedFields.add("schema"); // Field order changed
		} else {
			// Check individual field content changes
			current.schema.forEach((field, index) => {
				const originalField = original.schema[index];

				// Compare each field property individually to avoid JSON.stringify issues
				if (
					field.id !== originalField.id ||
					field.title !== originalField.title ||
					field.placeholder !== originalField.placeholder ||
					field.description !== originalField.description ||
					field.required !== originalField.required ||
					field.unique !== originalField.unique ||
					field.visible !== originalField.visible ||
					field.inputType !== originalField.inputType ||
					field.type !== originalField.type ||
					field.default !== originalField.default ||
					JSON.stringify(field.options || []) !==
						JSON.stringify(originalField.options || [])
				) {
					changedFields.add(field.id);
				}
			});
		}
	}

	// Check form settings changes
	if (current.submitButtonText !== original.submitButtonText) {
		changedFields.add("submitButtonText");
	}
	if (current.successMessage !== original.successMessage) {
		changedFields.add("successMessage");
	}
	if (current.successRedirectUrl !== original.successRedirectUrl) {
		changedFields.add("successRedirectUrl");
	}

	const hasChanges = changedFields.size > 0;

	return {
		hasChanges,
		changedFields,
		lastChanged: hasChanges ? Date.now() : 0,
	};
});

// Global save function atom
export const globalSaveFunctionAtom = atom<(() => void) | null>(null);

// Campaign data atom (for related campaign info)
export const campaignDataAtom = atom<FormData["campaign"] | null>(null);
