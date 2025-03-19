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
};

export type MessageQueueItem =
  | {
      type: "artifact";
      callbackType: "open" | "close";
      isInitial: boolean;
      data: ArtifactCallbackData;
    }
  | {
      type: "action";
      callbackType: "open" | "close";
      isInitial: boolean;
      data: ActionCallbackData;
    };

export const workbenchStore = createStore();

export const projectIdAtom = atomWithReset<string | null>(null);

// Preview Panel Handlers
export const closePreviewPanelHandlerAtom = atomWithReset<(() => void) | null>(
  null
);
export const openPreviewPanelHandlerAtom = atomWithReset<(() => void) | null>(
  null
);

// Group server-related state
export const isDependenciesInstalledAtom = atomWithReset(false);
export const portAtom = atomWithReset<ServerState | null>(null);
export const devServerInstanceAtom = atomWithReset<WebContainerProcess | null>(
  null
);
export const devServerLogsAtom = atomWithReset<string>("");
export const errorsAtom = atomWithReset<Error[]>([]);
export const isDevServerRunningAtom = atom(
  (get) => get(portAtom)?.port !== null
);
export const selectedElementAtom = atomWithReset<SelectedElement | null>(null);
export const isIframeLoadedAtom = atomWithReset(false);
export const isElementSelectionEnabledAtom = atom<boolean>(false);

// Parsed Data
export const parsedMessagesAtom = atomWithReset<{ [index: number]: string }>(
  {}
);
export const artifactsAtom = atomWithReset<Artifact[]>([]);
export const actionsAtom = atomWithReset<Action[]>([]);
export const messageQueueAtom = atomWithReset<MessageQueueItem[]>([]);

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

// Reset all state
export const resetState = () => {
  workbenchStore.set(projectIdAtom, RESET);
  workbenchStore.set(isDependenciesInstalledAtom, RESET);
  workbenchStore.set(portAtom, RESET);
  workbenchStore.set(selectedElementAtom, RESET);
  workbenchStore.set(isIframeLoadedAtom, RESET);
  workbenchStore.set(errorsAtom, RESET);
  workbenchStore.set(devServerLogsAtom, RESET);
  workbenchStore.set(messageQueueAtom, RESET);
  workbenchStore.set(devServerInstanceAtom, RESET);
  workbenchStore.set(artifactsAtom, RESET);
  workbenchStore.set(actionsAtom, RESET);
  workbenchStore.set(parsedFilesAtom, RESET);
  workbenchStore.set(parsedMessagesAtom, RESET);
};
