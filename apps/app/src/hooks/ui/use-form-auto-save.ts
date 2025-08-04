"use client";

import { useCallback, useRef } from "react";
import { useAutoSave } from "./use-auto-save";
import type { UseFormReturn } from "@firebuzz/ui/lib/utils";
import { useEffect } from "react";

interface UseFormAutoSaveOptions<T> {
	form: UseFormReturn<T>;
	onSave: (data: T) => Promise<void>;
	delay?: number;
	enabled?: boolean;
}

export const useFormAutoSave = <T extends Record<string, any>>({
	form,
	onSave,
	delay = 5000,
	enabled = true,
}: UseFormAutoSaveOptions<T>) => {
	const isResettingRef = useRef(false);
	
	const autoSave = useAutoSave({
		getData: useCallback(() => form.getValues(), [form]),
		onSave,
		delay,
		enabled,
	});

	// Watch form changes and trigger auto-save
	useEffect(() => {
		if (!enabled) return;
		
		const subscription = form.watch(() => {
			// Don't trigger auto-save during reset
			if (!isResettingRef.current) {
				autoSave.triggerAutoSave();
			}
		});
		
		return () => subscription.unsubscribe();
	}, [form, autoSave, enabled]);

	// Provide a way to reset without triggering auto-save
	const resetWithoutAutoSave = useCallback((values?: T) => {
		isResettingRef.current = true;
		form.reset(values);
		// Reset flag after a microtask to ensure all watchers have fired
		Promise.resolve().then(() => {
			isResettingRef.current = false;
		});
	}, [form]);

	return {
		...autoSave,
		resetWithoutAutoSave,
	};
};