import { createTool } from "@convex-dev/agent";
import { sleep } from "@firebuzz/utils";
import { z } from "zod";
import { internal } from "../../../_generated/api";
import type { Doc, Id } from "../../../_generated/dataModel";

export interface SandboxCredentials {
	teamId: string;
	projectId: string;
	token: string;
}

// SANDBOX TOOLS
interface CheckSandboxHealthToolResult {
	health: "healthy" | "unhealthy";
	status: Doc<"sandboxes">["status"];
	error: { message: string } | null;
}

export const getCheckSandboxHealthTool = ({
	sandbox,
}: {
	sandbox: Doc<"sandboxes">;
}) => {
	const tool = createTool({
		description: "Check sandbox health status",
		args: z.object({
			sandboxId: z
				.string()
				.default(sandbox._id)
				.optional()
				.describe(
					"The sandbox ID to check the health of it's already provided in tool call you can ignore this argument.",
				),
		}),
		handler: async (ctx, args): Promise<CheckSandboxHealthToolResult> => {
			const sandboxId = args.sandboxId
				? (args.sandboxId as Id<"sandboxes">)
				: sandbox._id;

			await sleep(5000);

			const result = await ctx.runAction(
				internal.collections.sandboxes.actions.getCheckSandboxHealthTool,
				{
					sandboxId: sandboxId,
				},
			);
			return result;
		},
	});

	return tool;
};

// READ FILE TOOL
interface ReadFileToolResult {
	success: boolean;
	content: string | null;
	error: { message: string } | null;
}

export const getReadFileTool = ({ sandbox }: { sandbox: Doc<"sandboxes"> }) => {
	const tool = createTool({
		description:
			"Read a file from the sandbox filesystem. Use this to view file contents before editing or to inspect code.",
		args: z.object({
			filePath: z
				.string()
				.describe(
					"The path to the file to read, relative to the sandbox root or cwd",
				),
			cwd: z
				.string()
				.optional()
				.describe(
					"Optional working directory to resolve the file path from. If not provided, the sandbox's current working directory will be used.",
				),
		}),
		handler: async (ctx, args): Promise<ReadFileToolResult> => {
			const result = await ctx.runAction(
				internal.collections.sandboxes.actions.readFileTool,
				{
					sandboxId: sandbox._id,
					filePath: args.filePath,
					cwd: args.cwd ?? sandbox.cwd,
				},
			);
			return result;
		},
	});

	return tool;
};

// WRITE FILES TOOL
interface WriteFilesToolResult {
	success: boolean;
	filesWritten: number;
	error: { message: string } | null;
}

export const getWriteFilesTool = ({
	sandbox,
}: {
	sandbox: Doc<"sandboxes">;
}) => {
	const tool = createTool({
		description:
			"Write one or more files to the sandbox filesystem. Use this to create new files or overwrite existing ones. Can write multiple files in a single operation.",
		args: z.object({
			files: z
				.array(
					z.object({
						path: z
							.string()
							.describe(
								"The path where the file should be written, relative to the sandbox root",
							),
						content: z.string().describe("The content to write to the file"),
					}),
				)
				.describe("Array of files to write"),
		}),
		handler: async (ctx, args): Promise<WriteFilesToolResult> => {
			const result = await ctx.runAction(
				internal.collections.sandboxes.actions.writeFilesTool,
				{
					sandboxId: sandbox._id,
					files: args.files,
				},
			);
			return result;
		},
	});

	return tool;
};

// QUICK EDIT TOOL
interface QuickEditToolResult {
	success: boolean;
	replacements: number;
	error: { message: string } | null;
}

export const getQuickEditTool = ({
	sandbox,
}: {
	sandbox: Doc<"sandboxes">;
}) => {
	const tool = createTool({
		description:
			"Perform a quick text replacement in a file. This tool reads the file, performs a string replacement, and writes it back. Use this for quick edits instead of reading and writing the entire file manually. Will error if the string is not found or appears multiple times (unless replaceAll is true).",
		args: z.object({
			filePath: z
				.string()
				.describe("The path to the file to edit, relative to the sandbox root"),
			oldString: z
				.string()
				.describe("The exact text to find and replace in the file"),
			newString: z.string().describe("The text to replace the old string with"),
			replaceAll: z
				.boolean()
				.optional()
				.describe(
					"If true, replace all occurrences. If false (default), only replace if there's exactly one occurrence.",
				),
		}),
		handler: async (ctx, args): Promise<QuickEditToolResult> => {
			const result = await ctx.runAction(
				internal.collections.sandboxes.actions.quickEditTool,
				{
					sandboxId: sandbox._id,
					filePath: args.filePath,
					oldString: args.oldString,
					newString: args.newString,
					replaceAll: args.replaceAll,
				},
			);
			return result;
		},
	});

	return tool;
};

// RUN COMMAND TOOL
interface RunCommandToolResult {
	success: boolean;
	exitCode: number | null;
	stdout: string;
	stderr: string;
	error: { message: string } | null;
}

export const getRunCommandTool = ({
	sandbox,
}: {
	sandbox: Doc<"sandboxes">;
}) => {
	const tool = createTool({
		description:
			"Run a terminal command in the sandbox. Use this to execute commands like 'pnpm add <package>', 'grep', 'find', 'ls', or any other shell command. The command output (stdout/stderr) will be captured and returned. For long-running processes (like dev servers), use detached: true.",
		args: z.object({
			command: z
				.string()
				.describe("The command to run (e.g., 'pnpm', 'grep', 'ls')"),
			args: z
				.array(z.string())
				.optional()
				.describe("Command arguments as an array (e.g., ['add', 'react'])"),
			cwd: z
				.string()
				.optional()
				.describe(
					"Working directory to run the command in. If not provided, the sandbox's current working directory will be used.",
				),
			detached: z
				.boolean()
				.optional()
				.describe(
					"If true, run the command in the background without waiting for it to complete",
				),
		}),
		handler: async (ctx, args): Promise<RunCommandToolResult> => {
			const result = await ctx.runAction(
				internal.collections.sandboxes.actions.runCommandTool,
				{
					sandboxId: sandbox._id,
					command: args.command,
					args: args.args,
					cwd: args.cwd ?? sandbox.cwd,
					detached: args.detached,
				},
			);
			return result;
		},
	});

	return tool;
};

// SAVE LANDING PAGE VERSION TOOL
interface SaveLandingPageVersionToolResult {
	success: boolean;
	versionNumber: number | null;
	versionId: string | null;
	error: { message: string } | null;
}

export const getSaveLandingPageVersionTool = ({
	sandbox,
	landingPageId,
}: {
	sandbox: Doc<"sandboxes">;
	landingPageId: Id<"landingPages">;
}) => {
	const tool = createTool({
		description:
			"Save the current state of the landing page as a new version. This creates a tar archive of all project files (excluding node_modules, .next, dist, etc.), stores it in R2, and creates a version record in the database. Use this to create checkpoints that can be reverted to later.",
		args: z.object({
			commitMessage: z
				.string()
				.describe(
					"A descriptive message explaining what changed in this version (e.g., 'refactor: change primary color to blue', 'feat: add contact form')",
				),
			description: z
				.string()
				.optional()
				.describe(
					"A 1-2 sentence summary explaining what changed in this version. Provide more context than the commit message (e.g., 'Updated the hero section to use the brand's new blue color scheme and increased font sizes for better readability on mobile devices.')",
				),
			messageId: z
				.string()
				.optional()
				.describe("Optional message ID linking this version to a chat message"),
		}),
		handler: async (ctx, args): Promise<SaveLandingPageVersionToolResult> => {
			const result = await ctx.runAction(
				internal.collections.sandboxes.actions.saveLandingPageVersionTool,
				{
					sandboxId: sandbox._id,
					landingPageId,
					commitMessage: args.commitMessage,
					description: args.description,
					messageId: args.messageId,
				},
			);
			return result;
		},
	});

	return tool;
};

// LIST LANDING PAGE VERSIONS TOOL
interface ListLandingPageVersionsToolResult {
	success: boolean;
	versions: Array<{
		_id: string;
		number: number;
		commitMessage?: string;
		_creationTime: number;
	}> | null;
	error: { message: string } | null;
}

export const getListLandingPageVersionsTool = ({
	landingPageId,
}: {
	landingPageId: Id<"landingPages">;
}) => {
	const tool = createTool({
		description:
			"List all saved versions of the landing page with their version IDs, numbers, and commit messages. Use this to see available versions before reverting or to check what changes have been saved.",
		args: z.object({}),
		handler: async (ctx): Promise<ListLandingPageVersionsToolResult> => {
			const result = await ctx.runAction(
				internal.collections.sandboxes.actions.listLandingPageVersionsTool,
				{
					landingPageId,
				},
			);
			return result;
		},
	});

	return tool;
};

// PREVIEW VERSION REVERT TOOL
interface PreviewVersionRevertToolResult {
	success: boolean;
	filesChanged: number;
	filesAdded: number;
	filesDeleted: number;
	modified: string[];
	added: string[];
	deleted: string[];
	error: { message: string } | null;
}

export const getPreviewVersionRevertTool = ({
	sandbox,
}: {
	sandbox: Doc<"sandboxes">;
}) => {
	const tool = createTool({
		description:
			"Preview what changes would be made if you revert to a specific version. Shows which files would be modified, added, or deleted without actually applying the changes. Use this before reverting to understand the impact.",
		args: z.object({
			versionId: z
				.string()
				.describe("The ID of the version to preview reverting to"),
		}),
		handler: async (ctx, args): Promise<PreviewVersionRevertToolResult> => {
			const result = await ctx.runAction(
				internal.collections.sandboxes.actions.previewVersionRevertTool,
				{
					sandboxId: sandbox._id,
					versionId: args.versionId as Id<"landingPageVersions">,
				},
			);
			return result;
		},
	});

	return tool;
};

// REVERT TO VERSION TOOL
interface RevertToVersionToolResult {
	success: boolean;
	error: { message: string } | null;
}

export const getRevertToVersionTool = ({
	sandbox,
}: {
	sandbox: Doc<"sandboxes">;
}) => {
	const tool = createTool({
		description:
			"Revert the landing page to a previous version. This downloads the version archive from storage, extracts it, and syncs the files to the sandbox using rsync. Only changed files are updated. The dev server will automatically reload with the restored code. IMPORTANT: Consider using previewVersionRevert first to see what will change.",
		args: z.object({
			versionId: z.string().describe("The ID of the version to revert to"),
		}),
		handler: async (ctx, args): Promise<RevertToVersionToolResult> => {
			const result = await ctx.runAction(
				internal.collections.sandboxes.actions.revertToVersionTool,
				{
					sandboxId: sandbox._id,
					versionId: args.versionId as Id<"landingPageVersions">,
				},
			);
			return result;
		},
	});

	return tool;
};

// TODO LIST TOOLS
interface TodoItem {
	id: string;
	title: string;
	description: string;
	status: "todo" | "in-progress" | "completed" | "cancelled" | "failed";
	createdAt: string;
	order: number;
}

interface CreateTodoListToolResult {
	success: boolean;
	todos: TodoItem[] | null;
	error: { message: string } | null;
}

export const getCreateTodoListTool = ({
	sessionId,
}: {
	sessionId: Id<"agentSessions">;
}) => {
	const tool = createTool({
		description:
			"Create a fresh todo list for organizing multi-step tasks. This replaces any existing todo list. Use this at the start of complex tasks to plan your work.",
		args: z.object({
			todos: z
				.array(
					z.object({
						title: z
							.string()
							.describe(
								"Short, actionable title (e.g., 'Create hero section')",
							),
						description: z
							.string()
							.describe("Detailed description of what needs to be done"),
					}),
				)
				.describe("Array of todos to create"),
		}),
		handler: async (ctx, args): Promise<CreateTodoListToolResult> => {
			const result = await ctx.runAction(
				internal.collections.agentSessions.actions.createTodoListTool,
				{
					sessionId,
					todos: args.todos,
				},
			);
			return result;
		},
	});

	return tool;
};

interface UpdateTodoListToolResult {
	success: boolean;
	todos: TodoItem[] | null;
	error: { message: string } | null;
}

export const getUpdateTodoListTool = ({
	sessionId,
}: {
	sessionId: Id<"agentSessions">;
}) => {
	const tool = createTool({
		description:
			"Update the todo list by adding new items, updating existing ones (e.g., changing status to 'in-progress' or 'completed'), or deleting items. Use this to track your progress as you work.",
		args: z.object({
			operation: z
				.enum(["add", "update", "delete"])
				.describe(
					"The operation to perform: add a new todo, update an existing one, or delete one",
				),
			todo: z.object({
				id: z
					.string()
					.optional()
					.describe(
						"Required for update/delete operations - the ID of the todo item",
					),
				title: z
					.string()
					.optional()
					.describe("For add/update - the todo title"),
				description: z
					.string()
					.optional()
					.describe("For add/update - the todo description"),
				status: z
					.enum(["todo", "in-progress", "completed", "cancelled", "failed"])
					.optional()
					.describe(
						"For update - change the status (use 'in-progress' when starting, 'completed' when done)",
					),
			}),
		}),
		handler: async (ctx, args): Promise<UpdateTodoListToolResult> => {
			const result = await ctx.runAction(
				internal.collections.agentSessions.actions.updateTodoListTool,
				{
					sessionId,
					operation: args.operation,
					todo: args.todo,
				},
			);
			return result;
		},
	});

	return tool;
};
