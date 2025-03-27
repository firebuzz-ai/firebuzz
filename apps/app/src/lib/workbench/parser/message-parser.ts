import type { FileSystemTree } from "@webcontainer/api";
import { nanoid } from "nanoid";
import {
  ARTIFACT_ACTION_TAG_CLOSE,
  ARTIFACT_ACTION_TAG_OPEN,
  ARTIFACT_TAG_CLOSE,
  ARTIFACT_TAG_OPEN,
} from "../constants";

// **Interfaces and Types**
export interface ArtifactData {
  id: string;
  title?: string;
  files?: FileSystemTree;
  isInitial: boolean;
}

export type ActionType = "file" | "shell" | "quick-edit";

export interface BaseAction {
  type: ActionType;
  content: string;
  title: string;
  isInitial: boolean;
  id: string;
}

export interface FileAction extends BaseAction {
  type: "file";
  filePath: string;
}

export interface ShellAction extends BaseAction {
  type: "shell";
}

export interface QuickEditAction extends BaseAction {
  type: "quick-edit";
  filePath: string;
  from?: string;
  to?: string;
}

export type Action = FileAction | ShellAction | QuickEditAction;

export interface ArtifactCallbackData extends ArtifactData {
  messageId: string;
  versionId?: string;
  versionNumber?: number;
}

export interface ActionCallbackData {
  artifactId: string;
  messageId: string;
  actionId: string;
  action: Action;
}

export type ArtifactCallback = (data: ArtifactCallbackData) => void;
export type ActionCallback = (data: ActionCallbackData) => void;

export interface ParserCallbacks {
  onArtifactOpen?: ArtifactCallback;
  onArtifactClose?: ArtifactCallback;
  onActionOpen?: ActionCallback;
  onActionClose?: ActionCallback;
}

interface MessageState {
  position: number;
  insideArtifact: boolean;
  insideAction: boolean;
  currentArtifact?: ArtifactData;
  currentAction?: BaseAction;
  actionId: string;
  isInitial: boolean;
  versionId: string | undefined;
  versionNumber: number | undefined;
}

interface ElementFactoryProps {
  messageId: string;
  artifactId: string;
  title?: string;
  versionId?: string;
  versionNumber?: number;
  actionId: string;
}

export type ElementFactory = (props: ElementFactoryProps) => string;

// **Default Element Factory**
export const createArtifactElement: ElementFactory = (props) => {
  const elementProps = [
    'class="__firebuzzArtifact__"',
    `data-message-id="${props.messageId}"`,
    `data-artifact-id="${props.artifactId}"`,
    props.title ? `data-title="${props.title}"` : "",
    props.versionId ? `data-version-id="${props.versionId}"` : "",
    props.versionNumber ? `data-version-number="${props.versionNumber}"` : "",
    props.actionId ? `data-action-id="${props.actionId}"` : "",
  ].filter(Boolean); // Remove empty strings

  return `<div ${elementProps.join(" ")}></div>`;
};

// **Parser Class**
export interface StreamingMessageParserOptions {
  callbacks?: ParserCallbacks;
  artifactElement?: ElementFactory;
}

export class MessageParser {
  #messages = new Map<string, MessageState>();
  #options: StreamingMessageParserOptions;

  constructor(options: StreamingMessageParserOptions = {}) {
    this.#options = options;
  }

  /** Parse the input string for a given messageId */
  parse(
    messageId: string,
    input: string,
    initial: boolean,
    versionId: string | undefined,
    versionNumber: number | undefined
  ): string {
    this.#validateArtifactState(messageId);

    let state = this.#messages.get(messageId);
    if (!state) {
      state = {
        position: 0,
        insideArtifact: false,
        insideAction: false,
        actionId: nanoid(10),
        isInitial: initial,
        versionId,
        versionNumber,
      };
      this.#messages.set(messageId, state);
    }

    let output = "";
    let i = state.position;

    while (i < input.length) {
      if (state.insideArtifact) {
        if (state.insideAction) {
          // Look for action closing tag
          const closeIndex = input.indexOf(ARTIFACT_ACTION_TAG_CLOSE, i);
          if (closeIndex !== -1) {
            const content = input.slice(i, closeIndex);
            state.currentAction!.content = content;

            // For quick-edit actions with content-based format, parse the from/to tags
            if (state.currentAction!.type === "quick-edit" && content.trim()) {
              this.#parseQuickEditContent(
                state.currentAction as QuickEditAction,
                content
              );
            }

            const actionData = { ...state.currentAction } as Action;
            this.#options.callbacks?.onActionClose?.({
              artifactId: state.currentArtifact!.id,
              messageId,
              actionId: state.currentAction!.id,
              action: actionData,
            });

            state.insideAction = false;
            state.currentAction = undefined;
            i = closeIndex + ARTIFACT_ACTION_TAG_CLOSE.length;
            console.log("[Parser] Action closed:", {
              actionId: state.actionId,
              action: actionData,
            });
          } else {
            // Incomplete action content, wait for more input
            break;
          }
        } else {
          // Look for action opening or artifact closing
          const actionOpenIndex = input.indexOf(ARTIFACT_ACTION_TAG_OPEN, i);
          const artifactCloseIndex = input.indexOf(ARTIFACT_TAG_CLOSE, i);

          if (
            actionOpenIndex !== -1 &&
            (artifactCloseIndex === -1 || actionOpenIndex < artifactCloseIndex)
          ) {
            const tagEnd = input.indexOf(">", actionOpenIndex);
            if (tagEnd !== -1) {
              const actionTag = input.slice(actionOpenIndex, tagEnd + 1);
              state.currentAction = this.#parseActionTag(
                actionTag,
                state.isInitial
              );
              const actionId = nanoid(10);
              (state.currentAction as Action).id = actionId;
              state.insideAction = true;

              this.#options.callbacks?.onActionOpen?.({
                artifactId: state.currentArtifact!.id,
                messageId,
                actionId: actionId,
                action: state.currentAction as Action,
              });

              i = tagEnd + 1;
            } else {
              // Incomplete action tag
              break;
            }
          } else if (artifactCloseIndex !== -1) {
            this.#options.callbacks?.onArtifactClose?.({
              messageId,
              id: state.currentArtifact!.id,
              title: state.currentArtifact!.title,
              versionId: state.versionId,
              versionNumber: state.versionNumber,
              isInitial: state.isInitial,
            });

            state.insideArtifact = false;
            state.currentArtifact = undefined;
            i = artifactCloseIndex + ARTIFACT_TAG_CLOSE.length;
          } else {
            // Inside artifact but no action or close tag yet
            break;
          }
        }
      } else {
        // Look for artifact opening tag
        const artifactOpenIndex = input.indexOf(ARTIFACT_TAG_OPEN, i);
        if (artifactOpenIndex !== -1) {
          const tagEnd = input.indexOf(">", artifactOpenIndex);
          if (tagEnd !== -1) {
            // Output content before the artifact
            if (artifactOpenIndex > i) {
              output += input.slice(i, artifactOpenIndex);
            }

            const artifactTag = input.slice(artifactOpenIndex, tagEnd + 1);
            const artifactData = this.#parseArtifactTag(
              artifactTag,
              state.isInitial
            );
            state.currentArtifact = artifactData;
            state.insideArtifact = true;

            this.#options.callbacks?.onArtifactOpen?.({
              messageId,
              versionId: state.versionId,
              versionNumber: state.versionNumber,
              id: artifactData.id,
              title: artifactData.title,
              isInitial: state.isInitial,
            });

            const factory =
              this.#options.artifactElement ?? createArtifactElement;
            output += factory({
              messageId,
              artifactId: artifactData.id,
              title: artifactData.title,
              versionId: state.versionId,
              versionNumber: state.versionNumber,
              actionId: state.actionId,
            });

            i = tagEnd + 1;
          } else {
            // Incomplete artifact tag, output up to it
            output += input.slice(i, artifactOpenIndex);
            i = artifactOpenIndex;
            break;
          }
        } else {
          // Regular content outside artifact
          output += input[i];
          i++;
        }
      }
    }

    state.position = i;
    return output;
  }

  /** Parse attributes from an action tag */
  #parseActionTag(tag: string, isInitial: boolean): BaseAction {
    const type = (this.#extractAttribute(tag, "type") as ActionType) ?? "shell";
    const title = this.#extractAttribute(tag, "title") || "";
    const actionId = this.#extractAttribute(tag, "id") || nanoid(10);

    const action: BaseAction = {
      type,
      content: "",
      title,
      isInitial,
      id: actionId,
    };

    if (type === "file") {
      (action as FileAction).filePath =
        this.#extractAttribute(tag, "filePath") || "";
    } else if (type === "quick-edit") {
      const quickEditAction = action as QuickEditAction;
      quickEditAction.filePath = this.#extractAttribute(tag, "filePath") || "";

      // Extract from/to attributes if present in the tag
      const fromAttr = this.#extractAttribute(tag, "from");
      const toAttr = this.#extractAttribute(tag, "to");

      if (fromAttr !== undefined && toAttr !== undefined) {
        quickEditAction.from = fromAttr;
        quickEditAction.to = toAttr;
      }
    }

    return action;
  }

  /** Parse attributes from an artifact tag */
  #parseArtifactTag(tag: string, isInitial: boolean): ArtifactData {
    const id = this.#extractAttribute(tag, "id") || nanoid(10);
    const title = this.#extractAttribute(tag, "title");
    return { id, title, isInitial };
  }

  /** Extract an attribute value from a tag */
  #extractAttribute(tag: string, name: string): string | undefined {
    const match = tag.match(new RegExp(`${name}="([^"]*)"`, "i"));
    return match?.[1];
  }

  /** Parse from and to tags from content-based quick-edit actions */
  #parseQuickEditContent(action: QuickEditAction, content: string): void {
    // Parse <from> and <to> sections
    const fromMatch = content.match(/<from>([\s\S]*?)<\/from>/);
    const toMatch = content.match(/<to>([\s\S]*?)<\/to>/);

    if (fromMatch && toMatch) {
      action.from = fromMatch[1];
      action.to = toMatch[1];
    }
  }

  /** Reset all message states */
  reset(): void {
    this.#messages.clear();
  }

  #validateArtifactState(messageId: string): void {
    const state = this.#messages.get(messageId);
    if (!state) return;

    if (state.insideArtifact && !state.currentArtifact) {
      console.warn(
        `[Parser] Invalid state: insideArtifact=true but no currentArtifact for message ${messageId}`
      );
    }

    if (!state.insideArtifact && state.currentArtifact) {
      console.warn(
        `[Parser] Invalid state: insideArtifact=false but has currentArtifact for message ${messageId}`
      );
    }
  }
}
