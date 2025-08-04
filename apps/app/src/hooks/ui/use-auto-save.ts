"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

interface UseAutoSaveOptions<T> {
	getData: () => T;
	onSave: (data: T) => Promise<void>;
	delay?: number;
	enabled?: boolean;
}

export const useAutoSave = <T>({
	getData,
	onSave,
	delay = 10000, // 10 seconds default
	enabled = true,
}: UseAutoSaveOptions<T>) => {
	const [status, setStatus] = useState<SaveStatus>("idle");
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const isSavingRef = useRef(false);

	// Save function
	const save = useCallback(async () => {
		if (isSavingRef.current || !hasUnsavedChanges) return;

		isSavingRef.current = true;
		setStatus("saving");

		try {
			const currentData = getData();
			await onSave(currentData);
			setHasUnsavedChanges(false);
			setStatus("saved");
		} catch (error) {
			console.error("Auto-save failed:", error);
			setStatus("error");
		} finally {
			isSavingRef.current = false;
		}
	}, [getData, onSave, hasUnsavedChanges]);

	// Debounced save function using use-debounce
	const debouncedSave = useDebouncedCallback(
		() => {
			save();
		},
		delay,
		{ maxWait: delay * 2 } // Max wait time before forcing save
	);

	// Manual save function
	const saveNow = useCallback(async () => {
		debouncedSave.cancel(); // Cancel any pending debounced saves
		await save();
	}, [save, debouncedSave]);

	// Function to trigger auto-save (called from canvas events)
	const triggerAutoSave = useCallback(() => {
		if (!enabled || isSavingRef.current) return;

		// Mark as having unsaved changes
		setHasUnsavedChanges(true);
		setStatus("pending");

		// Trigger debounced save
		debouncedSave();
	}, [enabled, debouncedSave]);

	// Reset status after a delay when saved
	useEffect(() => {
		if (status === "saved") {
			const timer = setTimeout(() => {
				if (!hasUnsavedChanges) {
					setStatus("idle");
				}
			}, 2000);
			return () => clearTimeout(timer);
		}
	}, [status, hasUnsavedChanges]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			debouncedSave.cancel();
		};
	}, [debouncedSave]);

	return {
		status,
		hasChanges: hasUnsavedChanges,
		saveNow,
		triggerAutoSave,
	};
};