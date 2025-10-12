import type { DataPart, ToolSet, UIMessage } from "@firebuzz/convex";
import { memo } from "react";
import { CheckSandboxHealth } from "./check-sandbox-health";
import { CreateTodoList } from "./create-todo-list";
import { ListLandingPageVersions } from "./list-landing-page-versions";
import { PreviewVersionRevert } from "./preview-version-revert";
import { QuickEdit } from "./quick-edit";
import { ReadFile } from "./read-file";
import { Reasoning } from "./reasoning";
import { RevertToVersion } from "./revert-to-version";
import { RunCommand } from "./run-command";
import { SaveVersion } from "./save-version";
import { Text } from "./text";
import { TodoList } from "./todo-list";
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

	if (part.type === "tool-readFile") {
		return <ReadFile part={part} />;
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

	return null;
});
