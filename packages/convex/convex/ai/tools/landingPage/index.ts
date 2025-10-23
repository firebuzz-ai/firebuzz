import type { UIMessage } from "@convex-dev/agent";
import type { InferUITools } from "ai";
import type { z } from "zod";
import type { Doc, Id } from "../../../_generated/dataModel";
import type { Model } from "../../../ai/models/schema";
import type { dataPartSchema } from "./schema";
import {
	getAskToWebsiteTool,
	getBuildLandingPageTool,
	getCheckDevServerAndLogsTool,
	getCheckSandboxHealthTool,
	getCreateTodoListTool,
	getCustomEventsTool,
	getEditImageTool,
	getFeaturesOrServicesTool,
	getFormSchemaTool,
	getGenerateImageTool,
	getGrepTool,
	getListLandingPageVersionsTool,
	getPreviewVersionRevertTool,
	getPublishToPreviewTool,
	getQuickEditTool,
	getReadFileTool,
	getRenewSandboxTool,
	getRestartDevServerTool,
	getRevertToVersionTool,
	getRunCommandTool,
	getSaveLandingPageVersionTool,
	getSocialsTool,
	getTakeWebsiteSnapshotTool,
	getTargetAudiencesTool,
	getTestimonialsTool,
	getUpdateTodoListTool,
	getUploadImageToCDNTool,
	getWebSearchTool,
	getWriteFilesTool,
} from "./tools";

// CONVEX TOOLS
export function tools(
	sandbox: Doc<"sandboxes">,
	landingPageId: Id<"landingPages">,
	sessionId: Id<"agentSessions">,
	workspaceId: Id<"workspaces">,
	userId: Id<"users">,
	projectId: Id<"projects">,
) {
	return {
		checkSandboxHealth: getCheckSandboxHealthTool({
			sandbox,
		}),
		checkDevServerAndLogs: getCheckDevServerAndLogsTool({
			sandbox,
		}),
		restartDevServer: getRestartDevServerTool({
			sandbox,
		}),
		renewSandbox: getRenewSandboxTool({
			sessionId,
			sandbox,
		}),
		readFile: getReadFileTool({
			sandbox,
		}),
		grep: getGrepTool({
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
		uploadImageToCDN: getUploadImageToCDNTool({
			workspaceId,
			userId,
			projectId,
		}),
		generateImage: getGenerateImageTool({
			sessionId,
			workspaceId,
			userId,
			projectId,
		}),
		editImage: getEditImageTool({
			sessionId,
			workspaceId,
			userId,
			projectId,
		}),
		takeWebsiteSnapshot: getTakeWebsiteSnapshotTool({
			sessionId,
		}),
		askToWebsite: getAskToWebsiteTool({
			sessionId,
		}),
		webSearch: getWebSearchTool({
			sessionId,
			workspaceId,
			userId,
			projectId,
		}),
		getTargetAudiences: getTargetAudiencesTool({
			projectId,
		}),
		getTestimonials: getTestimonialsTool({
			projectId,
		}),
		getSocials: getSocialsTool({
			projectId,
		}),
		getFeaturesOrServices: getFeaturesOrServicesTool({
			projectId,
		}),
		getFormSchema: getFormSchemaTool({
			landingPageId,
		}),
		getCustomEvents: getCustomEventsTool({
			landingPageId,
		}),
		buildLandingPage: getBuildLandingPageTool({
			sandbox,
		}),
		publishToPreview: getPublishToPreviewTool({
			sandbox,
			landingPageId,
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
