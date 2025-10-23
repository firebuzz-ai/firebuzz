/**
 * @firebuzz/design-mode
 *
 * Design mode overlay and utilities for Firebuzz landing page templates
 */

// Export types for TypeScript users
export type {
	AllElementsStateMessage,
	DesignModeMessage,
	DesignModeMessageType,
	ElementData,
	ElementSelectedMessage,
	ElementUpdates,
	SourceLocation,
	ThemeVariables,
} from "./types";
// Export Vite plugin (main export for users)
export { firebuzzDesignMode } from "./vite-plugin";

// Note: overlay.ts and tailwind-generator.ts are not exported here
// They are auto-injected by the Vite plugin and used internally
