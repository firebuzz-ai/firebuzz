import type { SaveStatus } from "@/hooks/ui/use-auto-save";
import type { FormField, PanelScreen } from "../_components/form-types";

// Complete form data structure from Convex
export interface FormData {
	_id: string;
	schema: FormField[];
	submitButtonText?: string;
	successMessage?: string;
	successRedirectUrl?: string;
	workspaceId: string;
	projectId: string;
	campaignId: string;
	createdBy: string;
	updatedAt: string;
	campaign?: {
		_id: string;
		title: string;
		publishedAt?: string;
	};
}

// UI state interfaces
export interface FormUIState {
	selectedFieldId: string | null;
	selectedOption: { label: string; value: string } | null;
	currentPanelScreen: PanelScreen;
	isEditingTitle: boolean;
	isEditingDescription: boolean;
}

// Form settings subset
export interface FormSettings {
	submitButtonText: string;
	successMessage: string;
	successRedirectUrl: string;
}

// Change tracking
export interface FormChanges {
	hasChanges: boolean;
	changedFields: Set<string>;
	lastChanged: number;
}

// Auto-save state
export interface AutoSaveState {
	status: SaveStatus;
	lastSaved?: number;
	pendingSave: boolean;
}
