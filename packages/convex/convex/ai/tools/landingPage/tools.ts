import { createTool } from "@convex-dev/agent";
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
		description:
			"Check the overall health status of the sandbox environment. Use this as your first step when troubleshooting issues. Returns whether the sandbox is healthy (running properly) or unhealthy (failed/stopped), along with the current sandbox status and any error messages.",
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
			"Read a file from the sandbox filesystem. Use this to view file contents before editing or to inspect code. IMPORTANT: For large files or when you know the line number from error logs, use startLine and endLine to read only the relevant section (much faster and uses fewer tokens). For syntax errors at line X, read lines X-5 to X+5 for context.",
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
			startLine: z
				.number()
				.min(1)
				.optional()
				.describe(
					"Optional line number to start reading from (1-indexed). Use this to read only a specific section of the file. Example: For error at line 42, use startLine: 37",
				),
			endLine: z
				.number()
				.min(1)
				.optional()
				.describe(
					"Optional line number to stop reading at (1-indexed, inclusive). Use with startLine to read a specific range. Example: For error at line 42, use endLine: 47",
				),
		}),
		handler: async (ctx, args): Promise<ReadFileToolResult> => {
			const result = await ctx.runAction(
				internal.collections.sandboxes.actions.readFileTool,
				{
					sandboxId: sandbox._id,
					filePath: args.filePath,
					cwd: args.cwd && args.cwd.length > 0 ? args.cwd : sandbox.cwd,
					startLine: args.startLine,
					endLine: args.endLine,
				},
			);
			return result;
		},
	});

	return tool;
};

// GREP TOOL
interface GrepToolResult {
	success: boolean;
	matches: Array<{ file: string; line: number; content: string }> | null;
	totalMatches: number;
	error: { message: string } | null;
}

export const getGrepTool = ({ sandbox }: { sandbox: Doc<"sandboxes"> }) => {
	const tool = createTool({
		description:
			"Search for text patterns across files in the project using grep. Returns structured results with file paths, line numbers, and matching content. Much more efficient than using runCommand for searches. Use this to find where functions, components, or variables are used, locate imports, search for patterns, or understand code structure.",
		args: z.object({
			pattern: z
				.string()
				.describe(
					"The text or regex pattern to search for (e.g., 'useState', 'import.*Button', 'interface.*Props')",
				),
			path: z
				.string()
				.optional()
				.describe(
					"Directory to search in, relative to sandbox root (default: '.' for entire project). Use 'src/' to search only source files.",
				),
			caseSensitive: z
				.boolean()
				.optional()
				.describe(
					"Whether search should be case-sensitive (default: false - case-insensitive)",
				),
			wholeWord: z
				.boolean()
				.optional()
				.describe(
					"Match whole words only (default: false). Set true to find 'use' without matching 'useState'.",
				),
			includePattern: z
				.string()
				.optional()
				.describe(
					"File pattern to include (e.g., '*.tsx' for TypeScript React files, '*.{ts,tsx}' for both)",
				),
			excludePattern: z
				.string()
				.optional()
				.describe(
					"File pattern to exclude (e.g., '*.test.*' to skip test files)",
				),
			maxResults: z
				.number()
				.optional()
				.describe(
					"Maximum number of results to return (default: unlimited). Use this to limit results for common patterns.",
				),
		}),
		handler: async (ctx, args): Promise<GrepToolResult> => {
			const result = await ctx.runAction(
				internal.collections.sandboxes.actions.grepTool,
				{
					sandboxId: sandbox._id,
					pattern: args.pattern,
					path: args.path,
					cwd: sandbox.cwd,
					caseSensitive: args.caseSensitive,
					wholeWord: args.wholeWord,
					includePattern: args.includePattern,
					excludePattern: args.excludePattern,
					maxResults: args.maxResults,
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
					cwd: args.cwd && args.cwd.length > 0 ? args.cwd : sandbox.cwd,
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
			"Update the todo list by performing multiple operations in a single call. You can add new items, update existing ones (e.g., changing status to 'in-progress' or 'completed'), or delete items. Use this to efficiently track your progress as you work. IMPORTANT: You can perform multiple operations at once - for example, mark one todo as completed and another as in-progress in a single call.",
		args: z.object({
			operations: z
				.array(
					z.object({
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
								.enum([
									"todo",
									"in-progress",
									"completed",
									"cancelled",
									"failed",
								])
								.optional()
								.describe(
									"For update - change the status (use 'in-progress' when starting, 'completed' when done)",
								),
						}),
					}),
				)
				.describe(
					"Array of operations to perform. You can batch multiple updates together.",
				),
		}),
		handler: async (ctx, args): Promise<UpdateTodoListToolResult> => {
			const result = await ctx.runAction(
				internal.collections.agentSessions.actions.updateTodoListTool,
				{
					sessionId,
					operations: args.operations,
				},
			);
			return result;
		},
	});

	return tool;
};

// DEV SERVER MANAGEMENT TOOLS

interface CheckDevServerAndLogsToolResult {
	success: boolean;
	status: "running" | "stopped" | "failed" | "not_started" | null;
	logs: Array<{ timestamp: string; stream: string; data: string }> | null;
	previewUrl: string | null;
	port: number | null;
	error: { message: string } | null;
}

export const getCheckDevServerAndLogsTool = ({
	sandbox,
}: {
	sandbox: Doc<"sandboxes">;
}) => {
	const tool = createTool({
		description:
			"Check the current status of the dev server and retrieve recent logs. Use this to troubleshoot issues, verify the dev server is running, or inspect console output for debugging. Returns the dev server status (running/stopped/failed/not_started), last 10-20 log entries, preview URL, and port.",
		args: z.object({
			logLimit: z
				.number()
				.optional()
				.describe(
					"Number of recent log entries to retrieve (default: 20, max: 50)",
				),
		}),
		handler: async (ctx, args): Promise<CheckDevServerAndLogsToolResult> => {
			const result = await ctx.runAction(
				internal.collections.sandboxes.actions.checkDevServerAndLogs,
				{
					sandboxId: sandbox._id,
					logLimit: args.logLimit ? Math.min(args.logLimit, 50) : 20,
				},
			);

			return {
				success: result.success,
				status: result.status,
				logs: result.logs,
				previewUrl: result.previewUrl,
				port: result.port,
				error: result.error ? { message: result.error } : null,
			};
		},
	});

	return tool;
};

interface RestartDevServerToolResult {
	success: boolean;
	devCmdId: string | null;
	previewUrl: string | null;
	error: { message: string } | null;
}

export const getRestartDevServerTool = ({
	sandbox,
}: {
	sandbox: Doc<"sandboxes">;
}) => {
	const tool = createTool({
		description:
			"Restart the dev server by stopping the existing dev command and starting a new one. Use this when the dev server is stuck, not responding, or needs a fresh start. This will kill the existing dev process, unregister from monitoring, and start a new dev server with fresh monitoring. Returns the new dev command ID and preview URL.",
		args: z.object({}),
		handler: async (ctx): Promise<RestartDevServerToolResult> => {
			const result = await ctx.runAction(
				internal.collections.sandboxes.actions.restartDevServer,
				{
					sandboxId: sandbox._id,
				},
			);

			return {
				success: result.success,
				devCmdId: result.devCmdId,
				previewUrl: result.previewUrl,
				error: result.error ? { message: result.error } : null,
			};
		},
	});

	return tool;
};

interface RenewSandboxToolResult {
	success: boolean;
	message: string;
	error: { message: string } | null;
}

export const getRenewSandboxTool = ({
	sessionId,
	sandbox,
}: {
	sessionId: Id<"agentSessions">;
	sandbox: Doc<"sandboxes">;
}) => {
	const tool = createTool({
		description:
			"Create a new sandbox session when the current sandbox is unhealthy, failed, or critically broken. This will create a fresh sandbox with the latest landing page code, install dependencies, and start the dev server. IMPORTANT: This is a last resort - only use when sandbox health check fails or after consulting with the user. Always check sandbox health and try restarting the dev server first.",
		args: z.object({
			reason: z
				.string()
				.describe(
					"Brief explanation of why the sandbox needs to be renewed (e.g., 'Sandbox health check failed', 'Critical error preventing dev server from starting')",
				),
		}),
		handler: async (ctx, args): Promise<RenewSandboxToolResult> => {
			try {
				// Get the session to extract the config from current sandbox
				const session = await ctx.runQuery(
					internal.collections.agentSessions.queries.getByIdInternal,
					{ id: sessionId },
				);

				if (!session) {
					return {
						success: false,
						message: "",
						error: { message: "Session not found" },
					};
				}

				// Extract config from current sandbox or use defaults
				const config = {
					timeout: sandbox.timeout,
					vcpus: sandbox.vcpus,
					runtime: sandbox.runtime,
					ports: sandbox.ports,
					cwd: sandbox.cwd,
				};

				// Call the renewSandboxSession action
				await ctx.runAction(
					internal.collections.sandboxes.actions.renewSandboxSession,
					{
						sessionId,
						config,
					},
				);

				return {
					success: true,
					message: `Sandbox renewed successfully. Reason: ${args.reason}. A fresh sandbox environment has been created with the latest code.`,
					error: null,
				};
			} catch (error) {
				return {
					success: false,
					message: "",
					error: {
						message: error instanceof Error ? error.message : String(error),
					},
				};
			}
		},
	});

	return tool;
};

// UPLOAD IMAGE TO CDN TOOL

interface UploadImageToCDNToolResult {
	success: boolean;
	cdnUrl: string | null;
	key: string | null;
	mediaId: string | null;
	error: { message: string } | null;
}

export const getUploadImageToCDNTool = ({
	workspaceId,
	userId,
	projectId,
}: {
	workspaceId: Id<"workspaces">;
	userId: Id<"users">;
	projectId: Id<"projects">;
}) => {
	const tool = createTool({
		description:
			"Upload an image from a URL to the project's CDN and get back the complete CDN URL. Use this when you need to use external images in the landing page. The image will be stored in the project's media gallery and a permanent CDN URL will be returned that can be used in img src attributes. This ensures images are hosted reliably on the project's own CDN rather than depending on external sources.",
		args: z.object({
			url: z
				.string()
				.url()
				.describe(
					"The source URL of the image to upload. Must be a valid image URL.",
				),
			filename: z
				.string()
				.optional()
				.describe(
					"Optional custom filename for the image (e.g., 'hero-image.jpg'). If not provided, a unique filename will be generated.",
				),
		}),
		handler: async (ctx, args): Promise<UploadImageToCDNToolResult> => {
			const result = await ctx.runAction(
				internal.components.r2.uploadImageToCDN,
				{
					url: args.url,
					workspaceId,
					projectId,
					userId,
					filename: args.filename,
				},
			);

			return {
				success: result.success,
				cdnUrl: result.cdnUrl,
				key: result.key,
				mediaId: result.mediaId,
				error: result.error,
			};
		},
	});

	return tool;
};

// GENERATE IMAGE TOOL

interface GenerateImageToolResult {
	success: boolean;
	cdnUrl: string | null;
	key: string | null;
	mediaId: string | null;
	requestId: string | null;
	model: string | null;
	credits: number | null;
	error: { message: string } | null;
}

export const getGenerateImageTool = ({
	sessionId,
	workspaceId,
	userId,
	projectId,
}: {
	sessionId: Id<"agentSessions">;
	workspaceId: Id<"workspaces">;
	userId: Id<"users">;
	projectId: Id<"projects">;
}) => {
	const tool = createTool({
		description:
			"Generate a new image from a text prompt using AI (text-to-image). This tool creates original images based on your description and automatically uploads them to the project's CDN. Perfect for creating hero images, illustrations, backgrounds, icons, and other visual content for landing pages. Supports multiple models: 'nano-banana' (fast, cheap), 'imagen4-fast' (better quality, realistic), 'imagen4-ultra' (best quality, realistic). The generated image will be stored in the project's media gallery and return a CDN URL ready to use.",
		args: z.object({
			prompt: z
				.string()
				.min(1)
				.describe(
					"Detailed description of the image you want to generate. Be specific about style, composition, colors, mood, and elements. Example: 'A modern minimalist hero image with gradient blue background, floating geometric shapes, soft lighting, professional and clean aesthetic'",
				),
			model: z
				.enum(["nano-banana", "imagen4-fast", "imagen4-ultra"])
				.default("nano-banana")
				.optional()
				.describe(
					"AI model to use: 'nano-banana' (fast, default), 'imagen4-fast' (realistic, better quality), 'imagen4-ultra' (best quality, slowest). Use imagen4 models for realistic images or when user requests better quality.",
				),
			aspectRatio: z
				.enum([
					"1:1",
					"16:9",
					"9:16",
					"3:4",
					"4:3",
					"3:2",
					"2:3",
					"21:9",
					"5:4",
					"4:5",
				])
				.default("1:1")
				.optional()
				.describe(
					"Aspect ratio of the generated image (default: '1:1'). Common options: '1:1' (square), '16:9' (landscape), '9:16' (portrait), '3:4' (portrait), '4:3' (landscape)",
				),
			resolution: z
				.enum(["1K", "2K"])
				.default("1K")
				.optional()
				.describe(
					"Resolution quality for imagen4 models only (default: '1K'). Higher resolution generates larger, more detailed images but costs more credits. Ignored for nano-banana model.",
				),
		}),
		handler: async (ctx, args): Promise<GenerateImageToolResult> => {
			try {
				const result = await ctx.runAction(internal.lib.fal.generateImage, {
					prompt: args.prompt,
					model: args.model,
					aspectRatio: args.aspectRatio,
					resolution: args.resolution,
					workspaceId,
					sessionId,
					userId,
					projectId,
				});

				return {
					success: result.success,
					cdnUrl: result.cdnUrl,
					key: result.key,
					mediaId: result.mediaId,
					requestId: result.requestId,
					model: result.model,
					credits: result.credits,
					error: result.error,
				};
			} catch (error) {
				return {
					success: false,
					cdnUrl: null,
					key: null,
					mediaId: null,
					requestId: null,
					model: null,
					credits: null,
					error: {
						message: error instanceof Error ? error.message : String(error),
					},
				};
			}
		},
	});

	return tool;
};

// EDIT IMAGE TOOL

interface EditImageToolResult {
	success: boolean;
	cdnUrl: string | null;
	key: string | null;
	mediaId: string | null;
	requestId: string | null;
	model: string | null;
	credits: number | null;
	error: { message: string } | null;
}

export const getEditImageTool = ({
	sessionId,
	workspaceId,
	userId,
	projectId,
}: {
	sessionId: Id<"agentSessions">;
	workspaceId: Id<"workspaces">;
	userId: Id<"users">;
	projectId: Id<"projects">;
}) => {
	const tool = createTool({
		description:
			"Edit or transform existing images using AI (image-to-image). Provide one or more source images and a text prompt describing the desired changes. This tool can modify styles, add elements, change colors, or create variations. Supports single or multiple input images for more complex edits. Uses nano-banana model. The edited image will be uploaded to the project's CDN and saved to the media gallery.",
		args: z.object({
			prompt: z
				.string()
				.min(1)
				.describe(
					"Description of how to edit or transform the image(s). Be specific about what changes you want. Example: 'Make the background blue with clouds, add soft lighting, enhance colors'",
				),
			imageUrl: z
				.string()
				.url()
				.optional()
				.describe(
					"Single source image URL to edit (use this OR imageUrls, not both)",
				),
			imageUrls: z
				.array(z.string().url())
				.optional()
				.describe(
					"Multiple source image URLs for complex edits (use this OR imageUrl, not both)",
				),
		}),
		handler: async (ctx, args): Promise<EditImageToolResult> => {
			try {
				const result = await ctx.runAction(internal.lib.fal.editImage, {
					prompt: args.prompt,
					imageUrl: args.imageUrl,
					imageUrls: args.imageUrls,
					workspaceId,
					sessionId,
					userId,
					projectId,
				});

				return {
					success: result.success,
					cdnUrl: result.cdnUrl,
					key: result.key,
					mediaId: result.mediaId,
					requestId: result.requestId,
					model: result.model,
					credits: result.credits,
					error: result.error,
				};
			} catch (error) {
				return {
					success: false,
					cdnUrl: null,
					key: null,
					mediaId: null,
					requestId: null,
					model: null,
					credits: null,
					error: {
						message: error instanceof Error ? error.message : String(error),
					},
				};
			}
		},
	});

	return tool;
};

// WEBSITE SNAPSHOT TOOL

interface TakeWebsiteSnapshotToolResult {
	success: boolean;
	html: string | null;
	screenshotUrl: string | null;
	mediaId: string | null;
	url: string | null;
	analysis: {
		sections: Array<{
			section: string;
			content: string;
			images: string[];
		}>;
		summary: string;
		fonts: string[];
		colors: string[];
	} | null;
	error: { message: string } | null;
}

export const getTakeWebsiteSnapshotTool = ({
	sessionId,
}: {
	sessionId: Id<"agentSessions">;
}) => {
	const tool = createTool({
		description:
			"Capture and analyze a website's structure, design, and content using AI. This tool takes a screenshot, extracts the HTML, and uses AI to analyze the page structure identifying sections (hero, nav, footer, etc.), images, fonts, and colors. The analysis is stored in a knowledge base for later querying with askToWebsite. Use this to study competitor websites, get design inspiration, or understand how other sites are built. Rate limited to 120 requests per minute per session.",
		args: z.object({
			url: z
				.string()
				.url()
				.describe(
					"The full URL to analyze (must include https:// or http://). Example: 'https://example.com'",
				),
			waitUntil: z
				.enum(["load", "domcontentloaded", "networkidle0", "networkidle2"])
				.optional()
				.describe(
					"When to consider the page loaded. 'load' waits for all resources, 'domcontentloaded' waits for HTML parsing, 'networkidle0' waits until no network connections for 500ms, 'networkidle2' waits until 2 or fewer connections. Default: 'load'",
				),
			fullPage: z
				.boolean()
				.optional()
				.describe(
					"Whether to capture the full scrollable page or just the visible viewport. Default: true (full page)",
				),
		}),
		handler: async (ctx, args): Promise<TakeWebsiteSnapshotToolResult> => {
			const result = await ctx.runAction(
				internal.lib.cloudflare.takeWebsiteSnapshot,
				{
					url: args.url,
					sessionId,
					waitUntil: args.waitUntil,
					fullPage: args.fullPage,
				},
			);

			return {
				success: result.success,
				html: result.html,
				screenshotUrl: result.screenshotUrl,
				mediaId: result.mediaId,
				url: result.url,
				analysis: result.analysis,
				error: result.error,
			};
		},
	});

	return tool;
};

// ASK TO WEBSITE TOOL

interface AskToWebsiteToolResult {
	success: boolean;
	answer: string | null;
	context: string[] | null;
	error: { message: string } | null;
}

export const getAskToWebsiteTool = ({
	sessionId,
}: {
	sessionId: Id<"agentSessions">;
}) => {
	const tool = createTool({
		description:
			"Ask questions about a website that was previously analyzed with takeWebsiteSnapshot. This tool queries the AI-powered knowledge base created from the website analysis to answer questions about the site's structure, content, design, or specific sections. The answers are based on the HTML content, sections, and metadata extracted during the snapshot. You must call takeWebsiteSnapshot first before using this tool on a URL.",
		args: z.object({
			url: z
				.string()
				.url()
				.describe(
					"The URL of the website to query (must be the same URL used in takeWebsiteSnapshot)",
				),
			query: z
				.string()
				.describe(
					"Your question about the website (e.g., 'What are the HTML contents of the hero section?', 'What colors does the site use?', 'Describe the navigation structure')",
				),
		}),
		handler: async (ctx, args): Promise<AskToWebsiteToolResult> => {
			const result = await ctx.runAction(internal.components.rag.askToWebsite, {
				url: args.url,
				query: args.query,
				sessionId,
			});

			return {
				success: result.success,
				answer: result.answer,
				context: result.context,
				error: result.error,
			};
		},
	});

	return tool;
};

// MARKETING DATA TOOLS

interface GetTargetAudiencesToolResult {
	success: boolean;
	data: Array<{
		id: string;
		name: string;
		description: string;
		gender: string;
		age: string;
		goals: string;
		motivations: string;
		frustrations: string;
		terminologies: string[];
		avatar?: string;
		updatedAt?: string;
	}> | null;
	pagination: {
		hasMore: boolean;
		cursor: string | null;
		totalFetched: number;
	} | null;
	error: { message: string } | null;
}

export const getTargetAudiencesTool = ({
	projectId,
}: {
	projectId: Id<"projects">;
}) => {
	const tool = createTool({
		description:
			"Fetch target audience data for the current project. Returns detailed audience profiles including demographics, goals, motivations, frustrations, and preferred terminologies. Use this before creating hero sections, feature sections, or any content that should speak to specific audiences. Supports pagination for large datasets.",
		args: z.object({
			searchQuery: z
				.string()
				.optional()
				.describe("Optional search query to filter audiences by name"),
			numItems: z
				.number()
				.min(1)
				.max(50)
				.default(10)
				.describe("Number of items to fetch (default: 10, max: 50)"),
			cursor: z
				.string()
				.optional()
				.describe("Pagination cursor for fetching next page"),
		}),
		handler: async (ctx, args): Promise<GetTargetAudiencesToolResult> => {
			try {
				const result = await ctx.runQuery(
					internal.collections.brands.queries.getTargetAudiencesInternal,
					{
						projectId,
						searchQuery: args.searchQuery,
						paginationOpts: {
							numItems: args.numItems,
							cursor: args.cursor ?? null,
						},
					},
				);

				const formattedData = result.page.map((item) => ({
					id: item._id,
					name: item.name,
					description: item.description,
					gender: item.gender,
					age: item.age,
					goals: item.goals,
					motivations: item.motivations,
					frustrations: item.frustrations,
					terminologies: item.terminologies,
					avatar: item.avatar,
					updatedAt: item.updatedAt,
				}));

				return {
					success: true,
					data: formattedData,
					pagination: {
						hasMore: !result.isDone,
						cursor: result.continueCursor,
						totalFetched: result.page.length,
					},
					error: null,
				};
			} catch (error) {
				return {
					success: false,
					data: null,
					pagination: null,
					error: {
						message: error instanceof Error ? error.message : String(error),
					},
				};
			}
		},
	});

	return tool;
};

interface GetTestimonialsToolResult {
	success: boolean;
	data: Array<{
		id: string;
		name: string;
		avatar?: string;
		title?: string;
		content: string;
		rating?: number;
		updatedAt?: string;
	}> | null;
	pagination: {
		hasMore: boolean;
		cursor: string | null;
		totalFetched: number;
	} | null;
	error: { message: string } | null;
}

export const getTestimonialsTool = ({
	projectId,
}: {
	projectId: Id<"projects">;
}) => {
	const tool = createTool({
		description:
			"Fetch customer testimonials for the current project. Returns testimonial content with author information, ratings, and titles. Use this when creating testimonial sections, social proof elements, or trust indicators. Supports pagination for large testimonial datasets - start with 10 items and fetch more if needed.",
		args: z.object({
			searchQuery: z
				.string()
				.optional()
				.describe("Optional search query to filter testimonials by content"),
			numItems: z
				.number()
				.min(1)
				.max(50)
				.default(10)
				.describe("Number of items to fetch (default: 10, max: 50)"),
			cursor: z
				.string()
				.optional()
				.describe("Pagination cursor for fetching next page"),
		}),
		handler: async (ctx, args): Promise<GetTestimonialsToolResult> => {
			try {
				const result = await ctx.runQuery(
					internal.collections.brands.queries.getTestimonialsInternal,
					{
						projectId,
						searchQuery: args.searchQuery,
						paginationOpts: {
							numItems: args.numItems,
							cursor: args.cursor ?? null,
						},
					},
				);

				const formattedData = result.page.map((item) => ({
					id: item._id,
					name: item.name,
					avatar: item.avatar,
					title: item.title,
					content: item.content,
					rating: item.rating,
					updatedAt: item.updatedAt,
				}));

				return {
					success: true,
					data: formattedData,
					pagination: {
						hasMore: !result.isDone,
						cursor: result.continueCursor,
						totalFetched: result.page.length,
					},
					error: null,
				};
			} catch (error) {
				return {
					success: false,
					data: null,
					pagination: null,
					error: {
						message: error instanceof Error ? error.message : String(error),
					},
				};
			}
		},
	});

	return tool;
};

interface GetSocialsToolResult {
	success: boolean;
	data: Array<{
		id: string;
		platform: string;
		handle: string;
		url: string;
		updatedAt?: string;
	}> | null;
	pagination: {
		hasMore: boolean;
		cursor: string | null;
		totalFetched: number;
	} | null;
	error: { message: string } | null;
}

export const getSocialsTool = ({
	projectId,
}: {
	projectId: Id<"projects">;
}) => {
	const tool = createTool({
		description:
			"Fetch social media links and profiles for the current project. Returns platform names, handles, and URLs. Use this when creating footer sections, social proof elements, or anywhere you need to display social media links.",
		args: z.object({
			searchQuery: z
				.string()
				.optional()
				.describe("Optional search query to filter by platform name"),
			numItems: z
				.number()
				.min(1)
				.max(50)
				.default(10)
				.describe("Number of items to fetch (default: 10, max: 50)"),
			cursor: z
				.string()
				.optional()
				.describe("Pagination cursor for fetching next page"),
		}),
		handler: async (ctx, args): Promise<GetSocialsToolResult> => {
			try {
				const result = await ctx.runQuery(
					internal.collections.brands.queries.getSocialsInternal,
					{
						projectId,
						searchQuery: args.searchQuery,
						paginationOpts: {
							numItems: args.numItems,
							cursor: args.cursor ?? null,
						},
					},
				);

				const formattedData = result.page.map((item) => ({
					id: item._id,
					platform: item.platform,
					handle: item.handle,
					url: item.url,
					updatedAt: item.updatedAt,
				}));

				return {
					success: true,
					data: formattedData,
					pagination: {
						hasMore: !result.isDone,
						cursor: result.continueCursor,
						totalFetched: result.page.length,
					},
					error: null,
				};
			} catch (error) {
				return {
					success: false,
					data: null,
					pagination: null,
					error: {
						message: error instanceof Error ? error.message : String(error),
					},
				};
			}
		},
	});

	return tool;
};

interface GetFeaturesOrServicesToolResult {
	success: boolean;
	data: Array<{
		id: string;
		name: string;
		description: string;
		benefits: string;
		proof: string;
		updatedAt?: string;
	}> | null;
	pagination: {
		hasMore: boolean;
		cursor: string | null;
		totalFetched: number;
	} | null;
	error: { message: string } | null;
}

export const getFeaturesOrServicesTool = ({
	projectId,
}: {
	projectId: Id<"projects">;
}) => {
	const tool = createTool({
		description:
			"Fetch product features or services for the current project. Returns feature names, descriptions, benefits, and proof points. Use this when creating features sections, benefits grids, or any content showcasing product capabilities.",
		args: z.object({
			numItems: z
				.number()
				.min(1)
				.max(50)
				.default(10)
				.describe("Number of items to fetch (default: 10, max: 50)"),
			cursor: z
				.string()
				.optional()
				.describe("Pagination cursor for fetching next page"),
		}),
		handler: async (ctx, args): Promise<GetFeaturesOrServicesToolResult> => {
			try {
				const result = await ctx.runQuery(
					internal.collections.brands.queries.getFeaturesInternal,
					{
						projectId,
						paginationOpts: {
							numItems: args.numItems,
							cursor: args.cursor ?? null,
						},
					},
				);

				const formattedData = result.page.map((item) => ({
					id: item._id,
					name: item.name,
					description: item.description,
					benefits: item.benefits,
					proof: item.proof,
					updatedAt: item.updatedAt,
				}));

				return {
					success: true,
					data: formattedData,
					pagination: {
						hasMore: !result.isDone,
						cursor: result.continueCursor,
						totalFetched: result.page.length,
					},
					error: null,
				};
			} catch (error) {
				return {
					success: false,
					data: null,
					pagination: null,
					error: {
						message: error instanceof Error ? error.message : String(error),
					},
				};
			}
		},
	});

	return tool;
};

// GET FORM SCHEMA TOOL

interface GetFormSchemaToolResult {
	success: boolean;
	schema: Array<{
		id: string;
		title: string;
		placeholder?: string;
		description?: string;
		type: "string" | "number" | "boolean";
		inputType:
			| "text"
			| "number"
			| "checkbox"
			| "radio"
			| "select"
			| "textarea"
			| "date"
			| "time"
			| "email"
			| "url"
			| "tel"
			| "password";
		required: boolean;
		unique: boolean;
		visible: boolean;
		default?: string | number | boolean;
		options?: Array<{
			label: string;
			value: string;
		}>;
	}> | null;
	submitButtonText: string | null;
	successMessage: string | null;
	successRedirectUrl: string | null;
	error: { message: string } | null;
}

export const getFormSchemaTool = ({
	landingPageId,
}: {
	landingPageId: Id<"landingPages">;
}) => {
	const tool = createTool({
		description:
			"Get the current form schema for lead-generation campaigns. This tool retrieves the form configuration including field definitions, submit button text, success message, and redirect URL. Use this when you need to build or update form components in the landing page. IMPORTANT: You cannot modify the form schema - users must do that from their campaign settings. This tool is read-only.",
		args: z.object({}),
		handler: async (ctx): Promise<GetFormSchemaToolResult> => {
			try {
				// Get landing page to find campaign ID
				const landingPage = await ctx.runQuery(
					internal.collections.landingPages.queries.getByIdInternal,
					{
						id: landingPageId,
					},
				);

				if (!landingPage) {
					return {
						success: false,
						schema: null,
						submitButtonText: null,
						successMessage: null,
						successRedirectUrl: null,
						error: { message: "Landing page not found" },
					};
				}

				// Get form by campaign ID
				const form = await ctx.runQuery(
					internal.collections.forms.queries.getByCampaignIdInternal,
					{
						campaignId: landingPage.campaignId,
					},
				);

				if (!form) {
					return {
						success: false,
						schema: null,
						submitButtonText: null,
						successMessage: null,
						successRedirectUrl: null,
						error: {
							message:
								"No form found for this campaign. This might be a click-through campaign without a form.",
						},
					};
				}

				// Extract form data from nodes
				const formNode = form.nodes?.find((node) => node.type === "form");
				const formData = formNode?.data;

				if (!formData || !formData.schema) {
					return {
						success: false,
						schema: null,
						submitButtonText: null,
						successMessage: null,
						successRedirectUrl: null,
						error: {
							message:
								"Form schema not found. The form might not be configured yet.",
						},
					};
				}

				return {
					success: true,
					schema: formData.schema,
					submitButtonText: formData.submitButtonText || "Submit",
					successMessage: formData.successMessage || "Thank you!",
					successRedirectUrl: formData.successRedirectUrl || null,
					error: null,
				};
			} catch (error) {
				return {
					success: false,
					schema: null,
					submitButtonText: null,
					successMessage: null,
					successRedirectUrl: null,
					error: {
						message: error instanceof Error ? error.message : String(error),
					},
				};
			}
		},
	});

	return tool;
};

// GET CUSTOM EVENTS TOOL

interface GetCustomEventsToolResult {
	success: boolean;
	events: Array<{
		id: string;
		title: string;
		icon: string;
		description?: string;
		placement: "internal" | "external";
		value: number;
		currency?: string;
		type: "conversion" | "engagement";
	}> | null;
	error: { message: string } | null;
}

export const getCustomEventsTool = ({
	landingPageId,
}: {
	landingPageId: Id<"landingPages">;
}) => {
	const tool = createTool({
		description:
			"Get custom events configured for the campaign. Returns internal events that need code implementation. Use this to sync events to configuration files and implement tracking calls.",
		args: z.object({}),
		handler: async (ctx): Promise<GetCustomEventsToolResult> => {
			try {
				// Get landing page to find campaign ID
				const landingPage = await ctx.runQuery(
					internal.collections.landingPages.queries.getByIdInternal,
					{
						id: landingPageId,
					},
				);

				if (!landingPage) {
					return {
						success: false,
						events: null,
						error: { message: "Landing page not found" },
					};
				}

				// Get campaign via landing page's campaignId
				const campaign = await ctx.runQuery(
					internal.collections.campaigns.queries.getByIdInternal,
					{
						id: landingPage.campaignId,
					},
				);

				if (!campaign) {
					return {
						success: false,
						events: null,
						error: { message: "Campaign not found" },
					};
				}

				// Extract custom events from campaign settings
				const customEvents = campaign.campaignSettings?.customEvents || [];

				// Filter for internal events only (these need code implementation)
				// External events are tracked automatically by the analytics system
				const internalEvents = customEvents
					.filter((event) => event.placement === "internal")
					.map((event) => ({
						id: event.id,
						title: event.title,
						icon: event.icon,
						description: event.description,
						placement: event.placement,
						value: event.value,
						currency: event.currency,
						type: event.type,
					}));

				return {
					success: true,
					events: internalEvents,
					error: null,
				};
			} catch (error) {
				return {
					success: false,
					events: null,
					error: {
						message: error instanceof Error ? error.message : String(error),
					},
				};
			}
		},
	});

	return tool;
};

// WEB SEARCH TOOL

interface WebSearchToolResult {
	success: boolean;
	results: Array<{
		title: string;
		url: string;
		text: string;
	}> | null;
	error: { message: string } | null;
}

export const getWebSearchTool = ({
	sessionId,
	workspaceId,
	userId,
	projectId,
}: {
	sessionId: Id<"agentSessions">;
	workspaceId: Id<"workspaces">;
	userId: Id<"users">;
	projectId: Id<"projects">;
}) => {
	const tool = createTool({
		description:
			"Search the web using Exa AI to find relevant information, articles, documentation, or examples. Use this when you need up-to-date information, want to research design trends, find competitor examples, or get inspiration from existing websites. Returns a list of search results with titles, URLs, and text content.",
		args: z.object({
			query: z
				.string()
				.describe(
					"The search query (e.g., 'modern landing page design trends 2024', 'best SaaS pricing page examples')",
				),
			numResults: z
				.number()
				.optional()
				.describe(
					"Number of search results to return (default: 5, max: 8). Use fewer results for quick lookups, more for comprehensive research.",
				),
			includeDomains: z
				.array(z.string())
				.optional()
				.describe(
					"Optional array of domains to restrict search to (e.g., ['example.com', 'another.com'])",
				),
			excludeDomains: z
				.array(z.string())
				.optional()
				.describe(
					"Optional array of domains to exclude from search (e.g., ['spam-site.com'])",
				),
			category: z
				.enum([
					"company",
					"research paper",
					"news",
					"pdf",
					"github",
					"tweet",
					"personal site",
					"linkedin profile",
					"financial report",
				])
				.optional()
				.describe(
					"Optional category filter to narrow results to specific types of content",
				),
		}),
		handler: async (ctx, args): Promise<WebSearchToolResult> => {
			try {
				const results = await ctx.runAction(internal.lib.exa.searchAndCrawl, {
					query: args.query,
					numResults: args.numResults,
					includeDomains: args.includeDomains,
					excludeDomains: args.excludeDomains,
					category: args.category,
					workspaceId,
					sessionId,
					userId,
					projectId,
				});

				return {
					success: true,
					results: results.map((result) => ({
						title: result.title || "",
						url: result.url,
						text: result.text || "",
					})),
					error: null,
				};
			} catch (error) {
				return {
					success: false,
					results: null,
					error: {
						message: error instanceof Error ? error.message : String(error),
					},
				};
			}
		},
	});

	return tool;
};

// BUILD AND PUBLISH TOOLS

interface BuildLandingPageToolResult {
	success: boolean;
	error: { message: string } | null;
}

export const getBuildLandingPageTool = ({
	sandbox,
}: {
	sandbox: Doc<"sandboxes">;
}) => {
	const tool = createTool({
		description:
			"Build the landing page project to prepare for publishing. This tool compiles the project and checks for build errors. Use this before publishing to preview or production. Returns success status and any build errors.",
		args: z.object({}),
		handler: async (ctx): Promise<BuildLandingPageToolResult> => {
			try {
				// Set isBuilding flag before building
				await ctx.runMutation(
					internal.collections.sandboxes.mutations.updateInternal,
					{
						id: sandbox._id,
						isBuilding: true,
					},
				);

				// Run build
				const result = await ctx.runAction(
					internal.collections.sandboxes.actions.buildLandingPageTool,
					{
						sandboxId: sandbox._id,
					},
				);

				// Clear isBuilding flag after build
				await ctx.runMutation(
					internal.collections.sandboxes.mutations.updateInternal,
					{
						id: sandbox._id,
						isBuilding: false,
					},
				);

				return {
					success: result.success,
					error: result.success ? null : { message: result.error },
				};
			} catch (error) {
				// Clear isBuilding flag on error
				await ctx.runMutation(
					internal.collections.sandboxes.mutations.updateInternal,
					{
						id: sandbox._id,
						isBuilding: false,
					},
				);

				return {
					success: false,
					error: {
						message: error instanceof Error ? error.message : String(error),
					},
				};
			}
		},
	});

	return tool;
};

interface PublishToPreviewToolResult {
	success: boolean;
	previewUrl: string | null;
	error: { message: string } | null;
}

export const getPublishToPreviewTool = ({
	sandbox,
	landingPageId,
}: {
	sandbox: Doc<"sandboxes">;
	landingPageId: Id<"landingPages">;
}) => {
	const tool = createTool({
		description:
			"Publish the built landing page to the preview environment. This extracts the build output and stores it in KV for preview. Must be called after successfully building the project. Returns preview URL on success.",
		args: z.object({}),
		handler: async (ctx): Promise<PublishToPreviewToolResult> => {
			try {
				// Get landing page to verify version exists
				const landingPage = await ctx.runQuery(
					internal.collections.landingPages.queries.getByIdInternal,
					{ id: landingPageId },
				);

				if (!landingPage || !landingPage.landingPageVersionId) {
					return {
						success: false,
						previewUrl: null,
						error: {
							message: "Landing page or version not found",
						},
					};
				}

				// Extract build output
				const extractResult = await ctx.runAction(
					internal.collections.sandboxes.actions.extractBuildOutputTool,
					{ sandboxId: sandbox._id, landingPageId },
				);

				if (!extractResult.success) {
					return {
						success: false,
						previewUrl: null,
						error: {
							message: extractResult.error || "Failed to extract build output",
						},
					};
				}

				// Publish to preview
				await ctx.runMutation(
					internal.collections.landingPages.mutations.publishPreviewInternal,
					{
						id: landingPageId,
						html: extractResult.html,
						js: extractResult.js,
						css: extractResult.css,
						landingPageVersionId: landingPage.landingPageVersionId,
					},
				);

				const previewUrl = `${process.env.PREVIEW_URL}/landing/${landingPageId}`;

				return {
					success: true,
					previewUrl,
					error: null,
				};
			} catch (error) {
				return {
					success: false,
					previewUrl: null,
					error: {
						message: error instanceof Error ? error.message : String(error),
					},
				};
			}
		},
	});

	return tool;
};
