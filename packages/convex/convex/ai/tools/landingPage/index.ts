import type { UIMessage } from "@convex-dev/agent";
import type { InferUITools } from "ai";
import { Model } from "ai/models/schema";
import type { z } from "zod";
import type { Doc, Id } from "../../../_generated/dataModel";
import type { dataPartSchema } from "./schema";
import {
	getCheckSandboxHealthTool,
	getCreateTodoListTool,
	getListLandingPageVersionsTool,
	getPreviewVersionRevertTool,
	getQuickEditTool,
	getReadFileTool,
	getRevertToVersionTool,
	getRunCommandTool,
	getSaveLandingPageVersionTool,
	getUpdateTodoListTool,
	getWriteFilesTool,
} from "./tools";

// CONVEX TOOLS
export function tools(
	sandbox: Doc<"sandboxes">,
	landingPageId: Id<"landingPages">,
	sessionId: Id<"agentSessions">,
) {
	return {
		checkSandboxHealth: getCheckSandboxHealthTool({
			sandbox,
		}),
		readFile: getReadFileTool({
			sandbox,
		}),
		writeFiles: getWriteFilesTool({
			sandbox,
		}),
		quickEdit: getQuickEditTool({
			sandbox,
		}),
		runCommand: getRunCommandTool({
			sandbox,
		}),
		saveLandingPageVersion: getSaveLandingPageVersionTool({
			sandbox,
			landingPageId,
		}),
		listLandingPageVersions: getListLandingPageVersionsTool({
			landingPageId,
		}),
		previewVersionRevert: getPreviewVersionRevertTool({
			sandbox,
		}),
		revertToVersion: getRevertToVersionTool({
			sandbox,
		}),
		createTodoList: getCreateTodoListTool({
			sessionId,
		}),
		updateTodoList: getUpdateTodoListTool({
			sessionId,
		}),
	};
}

export type ToolSet = InferUITools<ReturnType<typeof tools>>;
export type DataPart = z.infer<typeof dataPartSchema>;
export type Metadata = {
	userId: Id<"users"> | undefined;
	usage: number | undefined;
	error: string | undefined;
	model: Model | undefined;
	provider: string | undefined;
};
export type LandingPageUIMessage = UIMessage<Metadata, DataPart, ToolSet>;
