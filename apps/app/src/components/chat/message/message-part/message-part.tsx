import type { DataPart, ToolSet, UIMessage } from "@firebuzz/convex";
import { memo } from "react";
import { AskToWebsite } from "./ask-to-website";
import { BuildLandingPage } from "./build-landing-page";
import { CheckDevServerAndLogs } from "./check-dev-server-and-logs";
import { CheckSandboxHealth } from "./check-sandbox-health";
import { CreateTodoList } from "./create-todo-list";
import { EditImage } from "./edit-image";
import { GenerateImage } from "./generate-image";
import { GetCustomEvents } from "./get-custom-events";
import { GetFeaturesOrServices } from "./get-features-or-services";
import { GetFormSchema } from "./get-form-schema";
import { GetSocials } from "./get-socials";
import { GetTargetAudiences } from "./get-target-audiences";
import { GetTestimonials } from "./get-testimonials";
import { Grep } from "./grep";
import { ListLandingPageVersions } from "./list-landing-page-versions";
import { PreviewVersionRevert } from "./preview-version-revert";
import { PublishToPreview } from "./publish-to-preview";
import { QuickEdit } from "./quick-edit";
import { ReadFile } from "./read-file";
import { Reasoning } from "./reasoning";
import { RenewSandbox } from "./renew-sandbox";
import { RestartDevServer } from "./restart-dev-server";
import { RevertToVersion } from "./revert-to-version";
import { RunCommand } from "./run-command";
import { SaveVersion } from "./save-version";
import { TakeWebsiteSnapshot } from "./take-website-snapshot";
import { Text } from "./text";
import { TodoList } from "./todo-list";
import { UploadImageToCDN } from "./upload-image-to-cdn";
import { WebSearch } from "./web-search";
import { WriteFiles } from "./write-files";

interface Props {
	part: UIMessage<unknown, DataPart, ToolSet>["parts"][number];
	partIndex: number;
}

export const MessagePart = memo(function MessagePart({
	part,
	partIndex,
}: Props) {
	if (part.type === "reasoning") {
		return <Reasoning part={part} partIndex={partIndex} />;
	}

	if (part.type === "text") {
		return <Text part={part} />;
	}

	if (part.type === "tool-checkSandboxHealth") {
		return <CheckSandboxHealth part={part} />;
	}

	if (part.type === "tool-checkDevServerAndLogs") {
		return <CheckDevServerAndLogs part={part} />;
	}

	if (part.type === "tool-restartDevServer") {
		return <RestartDevServer part={part} />;
	}

	if (part.type === "tool-renewSandbox") {
		return <RenewSandbox part={part} />;
	}

	if (part.type === "tool-readFile") {
		return <ReadFile part={part} />;
	}

	if (part.type === "tool-grep") {
		return <Grep part={part} />;
	}

	if (part.type === "tool-writeFiles") {
		return <WriteFiles part={part} />;
	}

	if (part.type === "tool-quickEdit") {
		return <QuickEdit part={part} />;
	}

	if (part.type === "tool-runCommand") {
		return <RunCommand part={part} />;
	}

	if (part.type === "tool-saveLandingPageVersion") {
		return <SaveVersion part={part} />;
	}

	if (part.type === "tool-listLandingPageVersions") {
		return <ListLandingPageVersions part={part} />;
	}

	if (part.type === "tool-previewVersionRevert") {
		return <PreviewVersionRevert part={part} />;
	}

	if (part.type === "tool-revertToVersion") {
		return <RevertToVersion part={part} />;
	}

	if (part.type === "tool-createTodoList") {
		return <CreateTodoList part={part} />;
	}

	if (part.type === "tool-updateTodoList") {
		return <TodoList part={part} />;
	}

	if (part.type === "tool-uploadImageToCDN") {
		return <UploadImageToCDN part={part} />;
	}

	if (part.type === "tool-generateImage") {
		return <GenerateImage part={part} />;
	}

	if (part.type === "tool-editImage") {
		return <EditImage part={part} />;
	}

	if (part.type === "tool-takeWebsiteSnapshot") {
		return <TakeWebsiteSnapshot part={part} />;
	}

	if (part.type === "tool-askToWebsite") {
		return <AskToWebsite part={part} />;
	}

	if (part.type === "tool-webSearch") {
		return <WebSearch part={part} />;
	}

	if (part.type === "tool-getTargetAudiences") {
		return <GetTargetAudiences part={part} />;
	}

	if (part.type === "tool-getTestimonials") {
		return <GetTestimonials part={part} />;
	}

	if (part.type === "tool-getSocials") {
		return <GetSocials part={part} />;
	}

	if (part.type === "tool-getFeaturesOrServices") {
		return <GetFeaturesOrServices part={part} />;
	}

	if (part.type === "tool-getFormSchema") {
		return <GetFormSchema part={part} />;
	}

	if (part.type === "tool-getCustomEvents") {
		return <GetCustomEvents part={part} />;
	}

	if (part.type === "tool-buildLandingPage") {
		return <BuildLandingPage part={part} />;
	}

	if (part.type === "tool-publishToPreview") {
		return <PublishToPreview part={part} />;
	}

	return null;
});
