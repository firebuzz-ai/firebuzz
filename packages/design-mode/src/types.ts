/**
 * TypeScript type definitions for Firebuzz Design Mode
 */

export interface SourceLocation {
	fileName: string;
	lineNumber: number;
	columnNumber: number;
}

export interface ElementUpdates {
	className?: string;
	textContent?: string;
	src?: string;
	alt?: string;
	href?: string;
	target?: string;
	rel?: string;
}

export interface ThemeVariables {
	lightVariables?: Record<string, string>;
	darkVariables?: Record<string, string>;
}

export interface DesignModeMessage {
	type:
		| "ENABLE_DESIGN_MODE"
		| "DISABLE_DESIGN_MODE"
		| "FB_UPDATE_ELEMENT"
		| "FB_GET_ALL_ELEMENTS_STATE"
		| "FB_UPDATE_THEME"
		| "FB_DESELECT_ELEMENT"
		| "FB_SELECT_ELEMENT";
	enabled?: boolean;
	sourceFile?: string;
	sourceLine?: number;
	sourceColumn?: number;
	updates?: ElementUpdates;
	theme?: ThemeVariables;
}

export interface ElementData {
	sourceFile: string;
	sourceLine: number;
	sourceColumn: number;
	tagName: string;
	className: string;
	textContent: string | null;
	src?: string;
	alt?: string;
	href?: string;
	target?: string;
	rel?: string;
	computedStyles: Record<string, string>;
}

export interface ElementSelectedMessage {
	type: "FB_ELEMENT_SELECTED";
	data: ElementData;
}

export interface AllElementsStateMessage {
	type: "FB_ALL_ELEMENTS_STATE";
	data: Array<{
		sourceFile: string;
		sourceLine: number;
		sourceColumn: number;
		className: string;
		textContent: string | null;
		src?: string;
		alt?: string;
		href?: string;
		target?: string;
		rel?: string;
	}>;
}

export type DesignModeMessageType =
	| DesignModeMessage
	| ElementSelectedMessage
	| AllElementsStateMessage;
