import type { Doc } from "@firebuzz/convex";
import type { WebContainerProcess } from "@webcontainer/api";
import { atom, createStore } from "jotai";
import { RESET, atomWithReset } from "jotai/utils";
import type { ActionError } from "./action-error";
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
  error: ActionError;
  data: ActionCallbackData;
};

export const workbenchStore = createStore();
export const projectIdAtom = atomWithReset<string | null>(null);

// Group server-related state
export const workbenchStateAtom = atom((get) => {
  // Is Iframe Loaded
  const isIframeLoaded = get(isIframeLoadedAtom);
  // Is Dependencies Installed
  const isDependenciesInstalled = get(isDependenciesInstalledAtom);
  // Port
  const port = get(portAtom);
  // Is Project Mounted
  const isProjectMounted = get(isProjectMountedAtom);
  // Errors
  const errors = get(errorsAtom);

  if (errors.length > 0) return "error";
  if (isIframeLoaded) return "ready";
  if (port) return "dev-server-running";
  if (isDependenciesInstalled) return "dependencies-installed";
  if (isProjectMounted) return "project-mounted";
  return "initializing";
});
export const isProjectMountedAtom = atomWithReset(false);
export const isDependenciesInstalledAtom = atomWithReset(false);
export const portAtom = atomWithReset<ServerState | null>(null);
export const devServerInstanceAtom = atomWithReset<WebContainerProcess | null>(
  null
);
export const isDevServerRunningAtom = atom(
  (get) => get(portAtom)?.port !== null
);
export const devServerLogsAtom = atomWithReset<string>("");
export const errorsAtom = atomWithReset<Error[]>([]);

// Preview
export const previewRefAtom = atomWithReset<HTMLIFrameElement | null>(null);
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
  new Map<string, ParsedFile>()
);

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
        !file.path.includes("src/components/ui")
    )
    .reduce(
      (acc, file) => {
        acc[file.path] = file.content;
        return acc;
      },
      {} as Record<string, string>
    );
});

export const filesCountAtom = atom((get) => {
  const parsedFiles = get(parsedFilesAtom);
  return parsedFiles.size;
});

// Configuration Files
export const seoConfigAtom = atom((get) => {
  const parsedFiles = get(parsedFilesAtom);
  const seoConfig = parsedFiles.get("src/configuration/seo.ts");
  return seoConfig;
});

export const tagsConfigAtom = atom((get) => {
  const parsedFiles = get(parsedFilesAtom);
  const tagsConfig = parsedFiles.get("src/configuration/tags.ts");
  return tagsConfig;
});

export const lockFileAtom = atom((get) => {
  const parsedFiles = get(parsedFilesAtom);
  const lockFile = parsedFiles.get("package-lock.json");
  return lockFile;
});

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

// Attachments
export const attachmentsAtom = atomWithReset<
  Doc<"landingPageMessages">["attachments"]
>([]);

// Reset all state
export const resetState = async () => {
  const devServerInstance = workbenchStore.get(devServerInstanceAtom);
  if (devServerInstance) {
    devServerInstance.kill();
  }
  workbenchStore.set(projectIdAtom, RESET);
  workbenchStore.set(isDependenciesInstalledAtom, RESET);
  workbenchStore.set(isProjectMountedAtom, RESET);
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
  workbenchStore.set(failedActionsAtom, RESET);
  workbenchStore.set(currentVersionAtom, RESET);
  workbenchStore.set(currentPreviewVersionAtom, RESET);
  workbenchStore.set(previewRefAtom, RESET);
};
