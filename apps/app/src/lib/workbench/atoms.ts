import type { Doc } from "@firebuzz/convex";
import type { WebContainerProcess } from "@webcontainer/api";
import { atom, createStore } from "jotai";
import { RESET, atomWithReset } from "jotai/utils";
import type { ParsedFile } from "./parser/current-files-parser";
import { generateFileTreeString } from "./parser/file-tree-parser";
import type {
	ActionCallbackData,
	Action as ActionType,
	ArtifactCallbackData,
} from "./parser/message-parser";
interface ServerState {
	port: number | null;
	url: string | null;
}

export interface Error {
	type: "client" | "dev-server" | "build" | "container";
	message: string;
	rawError: string | null;
}

export interface Artifact {
	id: string;
	messageId: string;
	title: string;
	closed: boolean;
	versionId?: string;
	versionNumber?: number;
	isSaving: boolean;
	isInitial: boolean;
}

export interface SelectedElement {
	componentName: string;
	filePath: string;
	lineNumber: number;
}

export type Action = ActionType & {
	id: string;
	messageId: string;
	artifactId: string;
	status: "pending" | "success" | "error";
	isInitial: boolean;
} & (
		| { type: "file"; filePath: string }
		| { type: "shell" }
		| { type: "quick-edit"; filePath: string; from?: string; to?: string }
	);

export type MessageQueueItem =
	| {
			id: string;
			type: "artifact";
			callbackType: "open" | "close";
			isInitial: boolean;
			isProcessed: boolean;
			data: ArtifactCallbackData;
	  }
	| {
			id: string;
			type: "action";
			callbackType: "open" | "close";
			isInitial: boolean;
			isProcessed: boolean;
			data: ActionCallbackData;
	  };

export type FailedAction = {
	messageId: string;
	error: unknown;
	data: ArtifactCallbackData | ActionCallbackData;
};

export const workbenchStore = createStore();
export const projectIdAtom = atomWithReset<string | null>(null);

// Group server-related state
export const isDependenciesInstalledAtom = atomWithReset(false);
export const portAtom = atomWithReset<ServerState | null>(null);
export const devServerInstanceAtom = atomWithReset<WebContainerProcess | null>(
	null,
);
export const devServerLogsAtom = atomWithReset<string>("");
export const errorsAtom = atomWithReset<Error[]>([]);
export const isDevServerRunningAtom = atom(
	(get) => get(portAtom)?.port !== null,
);
export const selectedElementAtom = atomWithReset<SelectedElement | null>(null);
export const isIframeLoadedAtom = atomWithReset(false);
export const isElementSelectionEnabledAtom = atomWithReset<boolean>(false);
export const isIframeFullScreenAtom = atomWithReset<boolean>(false);

// Parsed Data
export const parsedMessagesAtom = atomWithReset<{ [id: string]: string }>({});
export const artifactsAtom = atomWithReset<Artifact[]>([]);
export const actionsAtom = atomWithReset<Action[]>([]);
export const messageQueueAtom = atomWithReset<MessageQueueItem[]>([]);
export const failedActionsAtom = atomWithReset<FailedAction[]>([]);

// Files
export const parsedFilesAtom = atomWithReset<Map<string, ParsedFile>>(
	new Map<string, ParsedFile>(),
);

// Attachments
export const attachmentsAtom = atomWithReset<
	Doc<"landingPageMessages">["attachments"]
>([]);

// Versions
export const currentVersionAtom = atomWithReset<{
	_id: string;
	number: number;
	signedUrl: string;
} | null>(null);

export const currentPreviewVersionAtom = atomWithReset<{
	_id: string;
	number: number;
	signedUrl: string;
} | null>(null);

export const isPreviewVersionDifferentAtom = atom((get) => {
	const currentVersion = get(currentVersionAtom);
	const currentPreviewVersion = get(currentPreviewVersionAtom);

	if (!currentPreviewVersion || !currentVersion) {
		return false;
	}

	return currentVersion._id !== currentPreviewVersion._id;
});

export const currentFilesTreeAtom = atom((get) => {
	const parsedFiles = get(parsedFilesAtom);
	return generateFileTreeString(parsedFiles);
});
export const currentImportantFilesAtom = atom((get) => {
	const parsedFiles = get(parsedFilesAtom);
	return Array.from(parsedFiles.values())
		.filter(
			(file) =>
				(file.path.includes("src") ||
					file.path.includes("tailwind") ||
					file.path.includes("package.json")) &&
				!file.path.includes("src/components/ui"),
		)
		.reduce(
			(acc, file) => {
				acc[file.path] = file.content;
				return acc;
			},
			{} as Record<string, string>,
		);
});
export const filesCountAtom = atom((get) => {
	const parsedFiles = get(parsedFilesAtom);
	return parsedFiles.size;
});

// Reset all state
export const resetState = () => {
	workbenchStore.set(projectIdAtom, RESET);
	workbenchStore.set(isDependenciesInstalledAtom, RESET);
	workbenchStore.set(portAtom, RESET);
	workbenchStore.set(selectedElementAtom, RESET);
	workbenchStore.set(isIframeLoadedAtom, RESET);
	workbenchStore.set(isIframeFullScreenAtom, RESET);
	workbenchStore.set(isElementSelectionEnabledAtom, RESET);
	workbenchStore.set(errorsAtom, RESET);
	workbenchStore.set(devServerLogsAtom, RESET);
	workbenchStore.set(messageQueueAtom, RESET);
	workbenchStore.set(devServerInstanceAtom, RESET);
	workbenchStore.set(artifactsAtom, RESET);
	workbenchStore.set(actionsAtom, RESET);
	workbenchStore.set(parsedFilesAtom, RESET);
	workbenchStore.set(parsedMessagesAtom, RESET);
};
