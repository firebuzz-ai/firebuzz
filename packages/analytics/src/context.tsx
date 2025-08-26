"use client";

import { createContext, useContext } from "react";
import type { AnalyticsContextValue } from "./types";

// ============================================================================
// Analytics Context
// ============================================================================

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

/**
 * Hook to access analytics context
 */
export function useAnalytics(): AnalyticsContextValue {
	const context = useContext(AnalyticsContext);
	if (!context) {
		throw new Error("useAnalytics must be used within an AnalyticsProvider");
	}
	return context;
}

/**
 * Analytics Context Provider
 */
export function AnalyticsContextProvider({
	children,
	value,
}: {
	children: React.ReactNode;
	value: AnalyticsContextValue;
}) {
	return (
		<AnalyticsContext.Provider value={value}>
			{children}
		</AnalyticsContext.Provider>
	);
}
