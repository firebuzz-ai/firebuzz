"use node";
import { sleep } from "@firebuzz/utils";
import type { Sandbox } from "@vercel/sandbox";
import { Sandbox as SandboxClass } from "@vercel/sandbox";
import { ConvexError, type Infer, v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { action, internalAction } from "../../_generated/server";
import { r2 } from "../../components/r2";
import { ERRORS } from "../../utils/errors";
import { sandboxConfigSchema } from "./schema";

interface Credentials {
	teamId: string;
	projectId: string;
	token: string;
}

const getCredentials = (): Credentials => ({
	teamId: process.env.VERCEL_TEAM_ID!,
	projectId: process.env.VERCEL_PROJECT_ID!,
	token: process.env.VERCEL_TOKEN!,
});

// Helper to register monitoring with sandbox-logger
const registerMonitoring = async (
	sandboxId: string,
	cmdId: string,
	commandType: "install" | "dev" | "build" | "typecheck" | "other" = "other",
): Promise<void> => {
	const sandboxLoggerUrl = process.env.SANDBOX_LOGGER_URL;
	const sandboxLoggerServiceToken = process.env.SANDBOX_LOGGER_SERVICE_TOKEN;

	if (!sandboxLoggerUrl || !sandboxLoggerServiceToken) {
		console.warn(
			"[registerMonitoring] Missing environment variables, skipping log monitoring",
		);
		console.warn(
			`[registerMonitoring] SANDBOX_LOGGER_URL: ${!!sandboxLoggerUrl}, SANDBOX_LOGGER_SERVICE_TOKEN: ${!!sandboxLoggerServiceToken}`,
		);
		return;
	}

	try {
		const url = new URL(
			`/monitor/register/${sandboxId}/${cmdId}`,
			sandboxLoggerUrl,
		);
		url.searchParams.set("commandType", commandType);

		const response = await fetch(url.toString(), {
			method: "POST",
			headers: {
				Authorization: `Bearer ${sandboxLoggerServiceToken}`,
			},
		});

		if (!response.ok) {
			const error = await response.text();
			console.error(
				`[registerMonitoring] Failed to register monitoring: ${error}`,
			);
		} else {
			console.log(
				`[registerMonitoring] Successfully registered monitoring for ${sandboxId}/${cmdId} (type: ${commandType})`,
			);
		}
	} catch (error) {
		console.error("[registerMonitoring] Error registering monitoring:", error);
	}
};

// Helper to check if sandbox can be reused
const canReuseSandbox = (status: Sandbox["status"]): boolean => {
	return status === "running" || status === "pending";
};

// Helper to check if sandbox should be cleaned up
const shouldCleanupSandbox = (status: Sandbox["status"]): boolean => {
	return status === "failed";
};

// Helper to wait for sandbox to be ready
const waitForSandbox = async (
	sandboxId: string,
	credentials: Credentials,
	maxWaitCycles: number,
	waitInterval: number,
): Promise<Sandbox> => {
	let instance = await SandboxClass.get({ sandboxId, ...credentials });
	let cycleCount = 0;

	while (instance.status === "pending" && cycleCount < maxWaitCycles) {
		await sleep(waitInterval);
		instance = await SandboxClass.get({ sandboxId, ...credentials });
		cycleCount++;
	}

	return instance;
};

// Helper to run install command
const installDependencies = async (
	sandbox: Sandbox,
	ctx: ActionCtx,
	sandboxDbId: Id<"sandboxes">,
	sessionDoc: Doc<"agentSessions">,
	config: Infer<typeof sandboxConfigSchema>,
): Promise<void> => {
	// Run install command
	const install = await sandbox.runCommand({
		cmd: "pnpm",
		args: ["install", "--loglevel", "info"],
		cwd: config.cwd,
	});

	// Create command record in Convex
	const commandId = await ctx.runMutation(
		internal.collections.sandboxes.commands.mutations.createCommand,
		{
			cmdId: install.cmdId,
			sandboxId: sandboxDbId,
			status: "running",
			command: "pnpm",
			args: ["install", "--loglevel", "info"],
			cwd: config.cwd,
			type: "install",
			workspaceId: sessionDoc.workspaceId,
			projectId: sessionDoc.projectId,
			campaignId: sessionDoc.campaignId,
			agentSessionId: sessionDoc._id,
			createdBy: sessionDoc.createdBy,
		},
	);

	// Update to session install cmdId
	await ctx.runMutation(
		internal.collections.sandboxes.mutations.updateCommandIdsInternal,
		{ id: sandboxDbId, installCmdId: commandId },
	);

	// Capture logs regardless of success/failure
	const logs: {
		stream: "stdout" | "stderr";
		data: string;
		timestamp: string;
	}[] = [];
	for await (const log of install.logs()) {
		logs.push({
			stream: log.stream,
			data: log.data,
			timestamp: new Date().toISOString(),
		});
	}

	// Append logs to command
	if (logs.length > 0) {
		await ctx.runMutation(
			internal.collections.sandboxes.commands.mutations.appendCommandLogs,
			{
				cmdId: install.cmdId,
				logs: logs.map((log) => ({
					stream: log.stream,
					data: log.data,
					timestamp: log.timestamp,
				})),
			},
		);
	}

	if (install.exitCode !== 0) {
		//TODO: Append logs to command
		// Update command to failed
		await ctx.runMutation(
			internal.collections.sandboxes.commands.mutations.updateCommandStatus,
			{ id: commandId, status: "failed", exitCode: install.exitCode },
		);
	}

	// Update command to completed
	await ctx.runMutation(
		internal.collections.sandboxes.commands.mutations.updateCommandStatus,
		{ id: commandId, status: "completed", exitCode: 0 },
	);
};

// Helper to run dev command
const runDevCommand = async (
	sandbox: Sandbox,
	ctx: ActionCtx,
	sandboxDbId: Id<"sandboxes">,
	sessionDoc: Doc<"agentSessions">,
	config: Infer<typeof sandboxConfigSchema>,
): Promise<void> => {
	// Run dev command in sandbox
	const dev = await sandbox.runCommand({
		cmd: "pnpm",
		args: ["run", "dev"],
		cwd: config.cwd,
		detached: true,
	});

	// Create dev command record in Convex
	const devCommandId = await ctx.runMutation(
		internal.collections.sandboxes.commands.mutations.createCommand,
		{
			cmdId: dev.cmdId,
			sandboxId: sandboxDbId,
			status: "running",
			command: "pnpm",
			args: ["run", "dev"],
			cwd: config.cwd,
			type: "dev",
			workspaceId: sessionDoc.workspaceId,
			projectId: sessionDoc.projectId,
			campaignId: sessionDoc.campaignId,
			agentSessionId: sessionDoc._id,
			createdBy: sessionDoc.createdBy,
		},
	);

	// Update to Sandbox dev cmdId in DB
	await ctx.runMutation(
		internal.collections.sandboxes.mutations.updateCommandIdsInternal,
		{ id: sandboxDbId, devCmdId: devCommandId },
	);

	// Register monitoring with sandbox-logger (webhook-based)
	await registerMonitoring(sandbox.sandboxId, dev.cmdId, "dev");

	// Wait for dev command to be ready
	await sleep(500);

	// Get preview URL
	const previewUrl = sandbox.domain(config.ports[0] ?? 5173);

	// Update preview URL in DB
	await ctx.runMutation(
		internal.collections.sandboxes.mutations.updatePreviewUrlInternal,
		{
			id: sandboxDbId,
			previewUrl,
		},
	);
};

// Helper to get existing sandbox
const getExistingSandbox = async (
	sandboxDbId: Id<"sandboxes">,
	credentials: Credentials,
	ctx: ActionCtx,
): Promise<
	{ sandbox: Sandbox; needsRecreation: false } | { needsRecreation: true }
> => {
	try {
		const sandboxDoc = await ctx.runQuery(
			internal.collections.sandboxes.queries.getByIdInternal,
			{ id: sandboxDbId },
		);

		if (!sandboxDoc || sandboxDoc.status !== "running") {
			return { needsRecreation: true };
		}

		const sandbox = await SandboxClass.get({
			sandboxId: sandboxDoc.sandboxExternalId,
			...credentials,
		});

		if (canReuseSandbox(sandbox.status)) {
			// Update status to running if needed
			if (sandboxDoc.status !== "running") {
				await ctx.runMutation(
					internal.collections.sandboxes.mutations.updateInternal,
					{
						id: sandboxDbId,
						status: "running",
					},
				);
			}
			return { sandbox, needsRecreation: false };
		}

		// Sandbox is not running anymore, clean it up
		if (shouldCleanupSandbox(sandbox.status)) {
			await ctx.runMutation(
				internal.collections.sandboxes.mutations.killSandboxInternal,
				{
					id: sandboxDbId,
				},
			);
		}

		return { needsRecreation: true };
	} catch (error) {
		console.error("Failed to get existing sandbox:", error);
		return { needsRecreation: true };
	}
};

// Main create sandbox logic
const createNewSandbox = async (
	signedUrl: string,
	credentials: Credentials,
	ctx: ActionCtx,
	sessionId: Id<"agentSessions">,
	config: Infer<typeof sandboxConfigSchema>,
): Promise<{ sandbox: Sandbox; sandboxDbId: Id<"sandboxes"> }> => {
	// Get session details for workspace/project/campaign
	const session = await ctx.runQuery(
		internal.collections.agentSessions.queries.getByIdInternal,
		{ id: sessionId },
	);

	if (!session) {
		throw new ConvexError(ERRORS.NOT_FOUND);
	}

	const sandbox = await SandboxClass.create({
		source: { type: "tarball", url: signedUrl },
		resources: { vcpus: config.vcpus },
		timeout: config.timeout,
		ports: [...config.ports],
		runtime: config.runtime,
		...credentials,
	});

	// Create sandbox record in database
	const sandboxDbId = await ctx.runMutation(
		internal.collections.sandboxes.mutations.createInternal,
		{
			sandboxExternalId: sandbox.sandboxId,
			status: sandbox.status,
			vcpus: config.vcpus,
			runtime: config.runtime,
			timeout: config.timeout,
			ports: [...config.ports],
			cwd: config.cwd,
			workspaceId: session.workspaceId,
			projectId: session.projectId,
			campaignId: session.campaignId,
			agentSessionId: sessionId,
			createdBy: session.createdBy,
		},
	);

	// Update agentSession with sandbox reference and mark creation as completed
	await ctx.runMutation(
		internal.collections.agentSessions.mutations.updateSandboxId,
		{
			sessionId,
			sandboxId: sandboxDbId,
		},
	);

	// Wait for sandbox to be ready
	const instance = await waitForSandbox(sandbox.sandboxId, credentials, 5, 500);

	if (instance.status !== "running") {
		await ctx.runMutation(
			internal.collections.sandboxes.mutations.killSandboxInternal,
			{
				id: sandboxDbId,
			},
		);
	}

	// Update status
	await ctx.runMutation(
		internal.collections.sandboxes.mutations.updateInternal,
		{
			id: sandboxDbId,
			status: instance.status,
			startedAt:
				instance.status === "running" ? new Date().toISOString() : undefined,
		},
	);

	// Install dependencies
	await installDependencies(sandbox, ctx, sandboxDbId, session, config);

	// Run dev server
	await runDevCommand(sandbox, ctx, sandboxDbId, session, config);

	return { sandbox, sandboxDbId };
};

/*
 * Create or get sandbox session
 * Called when a new session is created
 */
export const createOrGetSandboxSession = internalAction({
	args: {
		sessionId: v.id("agentSessions"),
		config: v.object(sandboxConfigSchema.fields),
		assetSettings: v.union(
			v.object({
				type: v.literal("landingPage"),
				id: v.id("landingPages"),
			}),
			v.object({
				type: v.literal("form"),
				id: v.id("forms"),
			}),
		),
	},
	handler: async (
		ctx,
		{ sessionId, assetSettings, config },
	): Promise<Id<"sandboxes">> => {
		const credentials = getCredentials();

		// First, check if the session already has a sandbox (race condition protection)
		const session = await ctx.runQuery(
			internal.collections.agentSessions.queries.getByIdInternal,
			{ id: sessionId },
		);

		if (!session) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (session.status !== "active") {
			throw new ConvexError(
				"Session is closed. Please join or create a new session.",
			);
		}

		// Get asset signed URL
		let signedUrl: string;
		let sandboxId: Id<"sandboxes"> | undefined = session.sandboxId;

		if (assetSettings.type === "landingPage") {
			// First, check if landing page has a version - if not, prepare template inline
			const landingPage = await ctx.runQuery(
				internal.collections.landingPages.queries.getByIdInternal,
				{ id: assetSettings.id },
			);

			if (!landingPage) {
				throw new ConvexError(ERRORS.NOT_FOUND);
			}

			// If no version exists, prepare template now (eliminates race condition)
			if (!landingPage.landingPageVersionId) {
				console.log(
					`[createOrGetSandboxSession] No version found for landing page ${assetSettings.id}, preparing template inline`,
				);
				await ctx.runAction(
					internal.collections.landingPages.actions
						.prepareTemplateForLandingPage,
					{
						landingPageId: assetSettings.id,
						userId: session.createdBy,
					},
				);
			}

			// Now get the landing page with signed URL (version guaranteed to exist)
			const landingPageWithUrl = await ctx.runQuery(
				internal.collections.landingPages.queries.getByIdWithSignedUrlInternal,
				{ id: assetSettings.id },
			);

			if (!landingPageWithUrl) {
				throw new ConvexError(
					"Landing page version not found after preparation",
				);
			}

			signedUrl = landingPageWithUrl.signedUrl;
		} else {
			// TODO: Implement form support
			throw new ConvexError({
				message: "Form sandboxes not yet supported",
				data: { assetType: assetSettings.type },
			});
		}

		try {
			if (sandboxId) {
				// A) EXISTING SANDBOX FLOW

				// Check for existing sandbox
				const result = await getExistingSandbox(sandboxId, credentials, ctx);

				if (result.needsRecreation) {
					// Create new sandbox
					const { sandboxDbId } = await createNewSandbox(
						signedUrl,
						credentials,
						ctx,
						sessionId,
						config,
					);
					return sandboxDbId;
				}

				// Sandbox is running, return existing ID
				return sandboxId;
			}

			// B) NEW SANDBOX FLOW

			// Create new sandbox
			const { sandboxDbId } = await createNewSandbox(
				signedUrl,
				credentials,
				ctx,
				sessionId,
				config,
			);

			sandboxId = sandboxDbId;

			return sandboxDbId;
		} catch (error) {
			console.error("Sandbox creation/retrieval failed:", error);

			if (error instanceof ConvexError) {
				throw error;
			}

			throw new ConvexError({
				message: "Failed to create or retrieve sandbox",
				data: { error: error instanceof Error ? error.message : String(error) },
			});
		}
	},
});

export const killSandbox = internalAction({
	args: {
		id: v.id("sandboxes"),
		sandboxExternalId: v.string(),
		startedAt: v.string(),
	},
	handler: async (ctx, { id, sandboxExternalId, startedAt }) => {
		// Get Vercel credentials
		const credentials = {
			teamId: process.env.VERCEL_TEAM_ID!,
			projectId: process.env.VERCEL_PROJECT_ID!,
			token: process.env.VERCEL_TOKEN!,
		};

		try {
			// Get Vercel sandbox instance
			const instance = await SandboxClass.get({
				sandboxId: sandboxExternalId,
				...credentials,
			});

			// Stop the sandbox if it's running
			if (instance.status === "running" || instance.status === "pending") {
				await instance.stop();
			}

			// Update status in DB
			const duration = Date.now() - new Date(startedAt).getTime();
			await ctx.runMutation(
				internal.collections.sandboxes.mutations.updateInternal,
				{
					id: id,
					sandboxExternalId,
					duration,
					stoppedAt: new Date().toISOString(),
					status: "stopped",
				},
			);
		} catch (error) {
			console.error("Failed to kill sandbox:", error);
			throw new ConvexError({
				message: "Failed to kill sandbox",
				data: { error: error instanceof Error ? error.message : String(error) },
			});
		}
	},
});

export const killAllRunningSandboxes = internalAction({
	handler: async (ctx) => {
		const sandboxes = await ctx.runQuery(
			internal.collections.sandboxes.queries.getAllRunningInternal,
		);

		if (sandboxes.length === 0) {
			return;
		}

		// Get Vercel credentials
		const credentials = {
			teamId: process.env.VERCEL_TEAM_ID!,
			projectId: process.env.VERCEL_PROJECT_ID!,
			token: process.env.VERCEL_TOKEN!,
		};

		await Promise.all(
			sandboxes.map(async (sandbox) => {
				try {
					// Get Vercel sandbox instance
					const instance = await SandboxClass.get({
						sandboxId: sandbox.sandboxExternalId,
						...credentials,
					});

					// Stop the sandbox if it's running
					if (instance.status === "running" || instance.status === "pending") {
						await instance.stop();
					}

					// Update status in DB
					await ctx.runMutation(
						internal.collections.sandboxes.mutations.updateInternal,
						{
							id: sandbox._id,
							status: "stopped",
							stoppedAt: new Date().toISOString(),
							duration: sandbox.startedAt
								? Date.now() - new Date(sandbox.startedAt).getTime()
								: undefined,
						},
					);
				} catch (error) {
					console.error("Failed to kill sandbox:", error);
					throw new ConvexError({
						message: "Failed to kill sandbox",
						data: {
							error: error instanceof Error ? error.message : String(error),
						},
					});
				}
			}),
		);
	},
});

// TOOLS
export const getCheckSandboxHealthTool = internalAction({
	args: {
		sandboxId: v.id("sandboxes"),
	},
	handler: async (
		ctx,
		{ sandboxId },
	): Promise<
		| {
				health: "healthy";
				status: Sandbox["status"];
				error: null;
		  }
		| {
				health: "unhealthy";
				status: Sandbox["status"];
				error: { message: string };
		  }
	> => {
		const sandbox = await ctx.runQuery(
			internal.collections.sandboxes.queries.getByIdInternal,
			{ id: sandboxId },
		);

		if (!sandbox) {
			return {
				health: "unhealthy",
				status: "failed",
				error: { message: "Sandbox not found" },
			};
		}

		if (sandbox.status !== "running" && sandbox.status !== "pending") {
			return {
				health: "unhealthy",
				status: sandbox.status,
				error: { message: "Sandbox is not running" },
			};
		}

		try {
			const credentials = getCredentials();
			const instance = await SandboxClass.get({
				sandboxId: sandbox.sandboxExternalId,
				...credentials,
			});

			if (instance.status !== "running" && instance.status !== "pending") {
				return {
					health: "unhealthy",
					status: instance.status,
					error: { message: "Sandbox is not running" },
				};
			}

			return {
				health: "healthy",
				status: instance.status,
				error: null,
			};
		} catch (error) {
			return {
				health: "unhealthy",
				status: "failed",
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});

export const readFileTool = internalAction({
	args: {
		sandboxId: v.id("sandboxes"),
		filePath: v.string(),
		cwd: v.optional(v.string()),
		startLine: v.optional(v.number()),
		endLine: v.optional(v.number()),
	},
	handler: async (
		ctx,
		{ sandboxId, filePath, cwd, startLine, endLine },
	): Promise<
		| { success: true; content: string; error: null }
		| { success: false; content: null; error: { message: string } }
	> => {
		const sandbox = await ctx.runQuery(
			internal.collections.sandboxes.queries.getByIdInternal,
			{ id: sandboxId },
		);

		if (!sandbox) {
			return {
				success: false,
				content: null,
				error: { message: "Sandbox not found" },
			};
		}

		if (sandbox.status !== "running") {
			return {
				success: false,
				content: null,
				error: { message: "Sandbox is not running" },
			};
		}

		try {
			const credentials = getCredentials();
			const instance = await SandboxClass.get({
				sandboxId: sandbox.sandboxExternalId,
				...credentials,
			});

			// If line range is specified, use sed for efficient reading
			if (startLine !== undefined || endLine !== undefined) {
				const start = startLine ?? 1;
				const end = endLine ?? "$"; // $ means end of file in sed

				const cmd = await instance.runCommand({
					cmd: "sed",
					args: ["-n", `${start},${end}p`, filePath],
					cwd: cwd ?? "/vercel/sandbox",
				});

				if (cmd.exitCode !== 0) {
					const stderr = await cmd.stderr();
					return {
						success: false,
						content: null,
						error: {
							message: `Failed to read file lines ${start}-${end}: ${stderr || "Unknown error"}`,
						},
					};
				}

				const stdout = await cmd.stdout();
				return {
					success: true,
					content: stdout,
					error: null,
				};
			}

			// Otherwise, read entire file
			const stream = await instance.readFile({ path: filePath, cwd });

			if (!stream) {
				return {
					success: false,
					content: null,
					error: { message: `File not found: ${filePath}` },
				};
			}

			// Convert ReadableStream to string using async iteration
			const chunks: Uint8Array[] = [];

			try {
				// Try to use async iteration if available
				for await (const chunk of stream as AsyncIterable<Uint8Array>) {
					chunks.push(chunk);
				}
			} catch {
				// Fallback: try getReader if async iteration fails
				try {
					// @ts-expect-error - ReadableStream might have getReader
					const reader = stream.getReader();
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						if (value) chunks.push(value);
					}
				} catch (readerError) {
					return {
						success: false,
						content: null,
						error: {
							message: `Failed to read stream: ${readerError instanceof Error ? readerError.message : String(readerError)}`,
						},
					};
				}
			}

			const content = Buffer.concat(chunks).toString("utf-8");

			return {
				success: true,
				content,
				error: null,
			};
		} catch (error) {
			return {
				success: false,
				content: null,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});

export const grepTool = internalAction({
	args: {
		sandboxId: v.id("sandboxes"),
		pattern: v.string(),
		path: v.optional(v.string()),
		cwd: v.optional(v.string()),
		caseSensitive: v.optional(v.boolean()),
		wholeWord: v.optional(v.boolean()),
		includePattern: v.optional(v.string()),
		excludePattern: v.optional(v.string()),
		maxResults: v.optional(v.number()),
	},
	handler: async (
		ctx,
		{
			sandboxId,
			pattern,
			path,
			cwd,
			caseSensitive,
			wholeWord,
			includePattern,
			excludePattern,
			maxResults,
		},
	): Promise<
		| {
				success: true;
				matches: Array<{ file: string; line: number; content: string }>;
				totalMatches: number;
				error: null;
		  }
		| {
				success: false;
				matches: null;
				totalMatches: 0;
				error: { message: string };
		  }
	> => {
		const sandbox = await ctx.runQuery(
			internal.collections.sandboxes.queries.getByIdInternal,
			{ id: sandboxId },
		);

		if (!sandbox) {
			return {
				success: false,
				matches: null,
				totalMatches: 0,
				error: { message: "Sandbox not found" },
			};
		}

		if (sandbox.status !== "running") {
			return {
				success: false,
				matches: null,
				totalMatches: 0,
				error: { message: "Sandbox is not running" },
			};
		}

		try {
			const credentials = getCredentials();
			const instance = await SandboxClass.get({
				sandboxId: sandbox.sandboxExternalId,
				...credentials,
			});

			// Build grep arguments
			const args: string[] = [
				"-rn", // recursive with line numbers (always on)
			];

			// Add optional flags
			if (!caseSensitive) {
				args.push("-i"); // case-insensitive by default
			}

			if (wholeWord) {
				args.push("-w"); // match whole words only
			}

			if (includePattern) {
				args.push(`--include=${includePattern}`);
			}

			if (excludePattern) {
				args.push(`--exclude=${excludePattern}`);
			}

			// Add pattern and path
			args.push(pattern);
			args.push(path || ".");

			// Execute grep
			const cmd = await instance.runCommand({
				cmd: "grep",
				args,
				cwd: cwd ?? sandbox.cwd,
			});

			// grep returns exit code 1 when no matches found (not an error)
			if (cmd.exitCode === 1) {
				const stdout = await cmd.stdout();
				if (!stdout) {
					return {
						success: true,
						matches: [],
						totalMatches: 0,
						error: null,
					};
				}
			}

			// Other non-zero exit codes are errors
			if (cmd.exitCode !== 0 && cmd.exitCode !== 1) {
				const stderr = await cmd.stderr();
				return {
					success: false,
					matches: null,
					totalMatches: 0,
					error: {
						message: `grep failed with exit code ${cmd.exitCode}: ${stderr || "Unknown error"}`,
					},
				};
			}

			// Parse grep output: "filepath:linenum:content"
			const stdout = await cmd.stdout();
			const lines = stdout.split("\n").filter(Boolean);
			const matches = lines
				.map((line) => {
					const match = line.match(/^([^:]+):(\d+):(.*)$/);
					if (!match || !match[1] || !match[2] || !match[3]) return null;

					return {
						file: match[1],
						line: Number.parseInt(match[2], 10),
						content: match[3].trim(),
					};
				})
				.filter(
					(m): m is { file: string; line: number; content: string } =>
						m !== null,
				);

			// Apply max results limit if specified
			const limitedMatches = maxResults
				? matches.slice(0, maxResults)
				: matches;

			return {
				success: true,
				matches: limitedMatches,
				totalMatches: matches.length,
				error: null,
			};
		} catch (error) {
			return {
				success: false,
				matches: null,
				totalMatches: 0,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});

export const writeFilesTool = internalAction({
	args: {
		sandboxId: v.id("sandboxes"),
		files: v.array(
			v.object({
				path: v.string(),
				content: v.string(),
			}),
		),
	},
	handler: async (
		ctx,
		{ sandboxId, files },
	): Promise<
		| { success: true; filesWritten: number; error: null }
		| { success: false; filesWritten: 0; error: { message: string } }
	> => {
		const sandbox = await ctx.runQuery(
			internal.collections.sandboxes.queries.getByIdInternal,
			{ id: sandboxId },
		);

		if (!sandbox) {
			return {
				success: false,
				filesWritten: 0,
				error: { message: "Sandbox not found" },
			};
		}

		if (sandbox.status !== "running") {
			return {
				success: false,
				filesWritten: 0,
				error: { message: "Sandbox is not running" },
			};
		}

		try {
			const credentials = getCredentials();
			console.log(
				"[writeFilesTool] Getting sandbox instance:",
				sandbox.sandboxExternalId,
			);
			const instance = await SandboxClass.get({
				sandboxId: sandbox.sandboxExternalId,
				...credentials,
			});

			// Convert string content to Buffer
			const filesWithBuffer = files.map((file) => ({
				path: file.path,
				content: Buffer.from(file.content, "utf-8"),
			}));

			console.log(
				"[writeFilesTool] Writing files:",
				filesWithBuffer.map((f) => ({
					path: f.path,
					size: f.content.length,
				})),
			);

			await instance.writeFiles(filesWithBuffer);

			console.log("[writeFilesTool] Successfully wrote", files.length, "files");

			return {
				success: true,
				filesWritten: files.length,
				error: null,
			};
		} catch (error) {
			console.error("[writeFilesTool] Error writing files:", error);
			console.error(
				"[writeFilesTool] Error details:",
				error instanceof Error
					? {
							message: error.message,
							stack: error.stack,
							name: error.name,
						}
					: error,
			);

			return {
				success: false,
				filesWritten: 0,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});

/**
 * Unified action to save all design mode changes (theme + element changes) to sandbox
 */
export const saveDesignModeChangesToSandbox = action({
	args: {
		sandboxId: v.id("sandboxes"),
		theme: v.optional(
			v.object({
				fonts: v.object({
					sans: v.string(),
					serif: v.string(),
					mono: v.string(),
				}),
				lightTheme: v.object({
					background: v.string(),
					foreground: v.string(),
					muted: v.string(),
					mutedForeground: v.string(),
					popover: v.string(),
					popoverForeground: v.string(),
					border: v.string(),
					input: v.string(),
					card: v.string(),
					cardForeground: v.string(),
					primary: v.string(),
					primaryForeground: v.string(),
					secondary: v.string(),
					secondaryForeground: v.string(),
					accent: v.string(),
					accentForeground: v.string(),
					destructive: v.string(),
					destructiveForeground: v.string(),
					ring: v.string(),
					chart1: v.string(),
					chart2: v.string(),
					chart3: v.string(),
					chart4: v.string(),
					chart5: v.string(),
					radius: v.string(),
				}),
				darkTheme: v.object({
					background: v.string(),
					foreground: v.string(),
					muted: v.string(),
					mutedForeground: v.string(),
					popover: v.string(),
					popoverForeground: v.string(),
					border: v.string(),
					input: v.string(),
					card: v.string(),
					cardForeground: v.string(),
					primary: v.string(),
					primaryForeground: v.string(),
					secondary: v.string(),
					secondaryForeground: v.string(),
					accent: v.string(),
					accentForeground: v.string(),
					destructive: v.string(),
					destructiveForeground: v.string(),
					ring: v.string(),
					chart1: v.string(),
					chart2: v.string(),
					chart3: v.string(),
					chart4: v.string(),
					chart5: v.string(),
				}),
			}),
		),
		elementFiles: v.optional(
			v.array(
				v.object({
					filePath: v.string(),
					content: v.string(),
				}),
			),
		),
	},
	handler: async (
		ctx,
		{ sandboxId, theme, elementFiles },
	): Promise<
		| { success: true; filesWritten: number; error: null }
		| { success: false; filesWritten: 0; error: { message: string } }
	> => {
		// Verify sandbox exists
		const sandbox = await ctx.runQuery(
			internal.collections.sandboxes.queries.getByIdInternal,
			{ id: sandboxId },
		);

		if (!sandbox) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		const filesToWrite: Array<{ path: string; content: string }> = [];

		// Add theme files if theme is provided
		if (theme) {
			// Generate tailwind.config.js (ES6 module for template compatibility)
			const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
	darkMode: ["class"],
	content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
	theme: {
		extend: {
			fontFamily: {
				sans: ["var(--font-sans)", "sans-serif"],
				serif: ["var(--font-serif)", "serif"],
				mono: ["var(--font-mono)", "monospace"],
			},
			borderRadius: {
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
			},
			colors: {
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				primary: {
					DEFAULT: "hsl(var(--primary))",
					foreground: "hsl(var(--primary-foreground))",
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))",
				},
				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				accent: {
					DEFAULT: "hsl(var(--accent))",
					foreground: "hsl(var(--accent-foreground))",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))",
				},
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				chart: {
					"1": "hsl(var(--chart-1))",
					"2": "hsl(var(--chart-2))",
					"3": "hsl(var(--chart-3))",
					"4": "hsl(var(--chart-4))",
					"5": "hsl(var(--chart-5))",
				},
			},
			keyframes: {
				"accordion-down": {
					from: { height: "0" },
					to: { height: "var(--radix-accordion-content-height)" },
				},
				"accordion-up": {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: "0" },
				},
			},
			animation: {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
			},
		},
	},
	plugins: [require("tailwindcss-animate")],
};`;

			// Generate src/index.css
			const globalsCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --font-sans: ${theme.fonts.sans};
    --font-serif: ${theme.fonts.serif};
    --font-mono: ${theme.fonts.mono};

    --background: ${theme.lightTheme.background};

    --foreground: ${theme.lightTheme.foreground};

    --card: ${theme.lightTheme.card};

    --card-foreground: ${theme.lightTheme.cardForeground};

    --popover: ${theme.lightTheme.popover};

    --popover-foreground: ${theme.lightTheme.popoverForeground};

    --primary: ${theme.lightTheme.primary};

    --primary-foreground: ${theme.lightTheme.primaryForeground};

    --secondary: ${theme.lightTheme.secondary};

    --secondary-foreground: ${theme.lightTheme.secondaryForeground};

    --muted: ${theme.lightTheme.muted};

    --muted-foreground: ${theme.lightTheme.mutedForeground};

    --accent: ${theme.lightTheme.accent};

    --accent-foreground: ${theme.lightTheme.accentForeground};

    --destructive: ${theme.lightTheme.destructive};

    --destructive-foreground: ${theme.lightTheme.destructiveForeground};

    --border: ${theme.lightTheme.border};

    --input: ${theme.lightTheme.input};

    --ring: ${theme.lightTheme.ring};

    --chart-1: ${theme.lightTheme.chart1};

    --chart-2: ${theme.lightTheme.chart2};

    --chart-3: ${theme.lightTheme.chart3};

    --chart-4: ${theme.lightTheme.chart4};

    --chart-5: ${theme.lightTheme.chart5};

    --radius: ${theme.lightTheme.radius};
  }
  .dark {
    --background: ${theme.darkTheme.background};

    --foreground: ${theme.darkTheme.foreground};

    --card: ${theme.darkTheme.card};

    --card-foreground: ${theme.darkTheme.cardForeground};

    --popover: ${theme.darkTheme.popover};

    --popover-foreground: ${theme.darkTheme.popoverForeground};

    --primary: ${theme.darkTheme.primary};

    --primary-foreground: ${theme.darkTheme.primaryForeground};

    --secondary: ${theme.darkTheme.secondary};

    --secondary-foreground: ${theme.darkTheme.secondaryForeground};

    --muted: ${theme.darkTheme.muted};

    --muted-foreground: ${theme.darkTheme.mutedForeground};

    --accent: ${theme.darkTheme.accent};

    --accent-foreground: ${theme.darkTheme.accentForeground};

    --destructive: ${theme.darkTheme.destructive};

    --destructive-foreground: ${theme.darkTheme.destructiveForeground};

    --border: ${theme.darkTheme.border};

    --input: ${theme.darkTheme.input};

    --ring: ${theme.darkTheme.ring};

    --chart-1: ${theme.darkTheme.chart1};

    --chart-2: ${theme.darkTheme.chart2};

    --chart-3: ${theme.darkTheme.chart3};

    --chart-4: ${theme.darkTheme.chart4};

    --chart-5: ${theme.darkTheme.chart5};
  }
}

* {
  border-color: hsl(var(--border));
}

body {
  color: hsl(var(--foreground));
  background: hsl(var(--background));
}`;

			filesToWrite.push(
				{ path: "tailwind.config.js", content: tailwindConfig },
				{ path: "src/index.css", content: globalsCss },
			);
		}

		// Add element files if provided
		if (elementFiles && elementFiles.length > 0) {
			console.log(
				"[saveDesignModeChangesToSandbox] Processing element files:",
				elementFiles.map((f) => ({
					path: f.filePath,
					contentLength: f.content.length,
					contentPreview: f.content.slice(0, 200),
				})),
			);

			for (const file of elementFiles) {
				console.log(
					`[saveDesignModeChangesToSandbox] Adding file to write queue: ${file.filePath}`,
				);
				filesToWrite.push({
					path: file.filePath,
					content: file.content,
				});
			}
		}

		// Write all files in one go
		if (filesToWrite.length > 0) {
			console.log(
				"[saveDesignModeChangesToSandbox] Writing files to sandbox:",
				filesToWrite.map((f) => f.path),
			);

			const result:
				| {
						success: true;
						filesWritten: number;
						error: null;
				  }
				| {
						success: false;
						filesWritten: 0;
						error: {
							message: string;
						};
				  } = await ctx.runAction(
				internal.collections.sandboxes.actions.writeFilesTool,
				{
					sandboxId,
					files: filesToWrite,
				},
			);

			if (!result.success) {
				return { success: false, filesWritten: 0, error: result.error };
			}

			return { success: true, filesWritten: result.filesWritten, error: null };
		}

		return { success: true, filesWritten: 0, error: null };
	},
});

export const quickEditTool = internalAction({
	args: {
		sandboxId: v.id("sandboxes"),
		filePath: v.string(),
		oldString: v.string(),
		newString: v.string(),
		replaceAll: v.optional(v.boolean()),
	},
	handler: async (
		ctx,
		{ sandboxId, filePath, oldString, newString, replaceAll },
	): Promise<
		| { success: true; replacements: number; error: null }
		| { success: false; replacements: 0; error: { message: string } }
	> => {
		const sandbox = await ctx.runQuery(
			internal.collections.sandboxes.queries.getByIdInternal,
			{ id: sandboxId },
		);

		if (!sandbox) {
			return {
				success: false,
				replacements: 0,
				error: { message: "Sandbox not found" },
			};
		}

		if (sandbox.status !== "running") {
			return {
				success: false,
				replacements: 0,
				error: { message: "Sandbox is not running" },
			};
		}

		try {
			const credentials = getCredentials();
			const instance = await SandboxClass.get({
				sandboxId: sandbox.sandboxExternalId,
				...credentials,
			});

			// Read the file
			const stream = await instance.readFile({ path: filePath });

			if (!stream) {
				return {
					success: false,
					replacements: 0,
					error: { message: `File not found: ${filePath}` },
				};
			}

			// Convert stream to string using async iteration
			const chunks: Uint8Array[] = [];

			try {
				// Try to use async iteration if available
				for await (const chunk of stream as AsyncIterable<Uint8Array>) {
					chunks.push(chunk);
				}
			} catch {
				// Fallback: try getReader if async iteration fails
				try {
					// @ts-expect-error - ReadableStream might have getReader
					const reader = stream.getReader();
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						if (value) chunks.push(value);
					}
				} catch (readerError) {
					return {
						success: false,
						replacements: 0,
						error: {
							message: `Failed to read stream: ${readerError instanceof Error ? readerError.message : String(readerError)}`,
						},
					};
				}
			}

			const originalContent = Buffer.concat(chunks).toString("utf-8");

			// Check if old string exists
			if (!originalContent.includes(oldString)) {
				return {
					success: false,
					replacements: 0,
					error: {
						message: `String not found in file: "${oldString.slice(0, 50)}${oldString.length > 50 ? "..." : ""}"`,
					},
				};
			}

			// Perform replacement
			let newContent: string;
			let replacements = 0;

			if (replaceAll) {
				// Replace all occurrences
				const regex = new RegExp(
					oldString.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
					"g",
				);
				const matches = originalContent.match(regex);
				replacements = matches ? matches.length : 0;
				newContent = originalContent.replace(regex, newString);
			} else {
				// Replace only first occurrence
				const occurrences = originalContent.split(oldString).length - 1;

				if (occurrences > 1) {
					return {
						success: false,
						replacements: 0,
						error: {
							message: `String appears ${occurrences} times in file. Use replaceAll: true to replace all occurrences, or provide a more unique string.`,
						},
					};
				}

				newContent = originalContent.replace(oldString, newString);
				replacements = 1;
			}

			// Write back
			await instance.writeFiles([
				{
					path: filePath,
					content: Buffer.from(newContent, "utf-8"),
				},
			]);

			return {
				success: true,
				replacements,
				error: null,
			};
		} catch (error) {
			return {
				success: false,
				replacements: 0,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});

// Helper to run build command
const buildLandingPage = async (
	sandbox: Sandbox,
	ctx: ActionCtx,
	sandboxDbId: Id<"sandboxes">,
	sessionDoc: Doc<"agentSessions">,
	config: Infer<typeof sandboxConfigSchema>,
): Promise<
	{ success: true; error: null } | { success: false; error: string }
> => {
	// Run build command
	const build = await sandbox.runCommand({
		cmd: "pnpm",
		args: ["run", "build"],
		cwd: config.cwd,
	});

	// Create command record in Convex
	const commandId = await ctx.runMutation(
		internal.collections.sandboxes.commands.mutations.createCommand,
		{
			cmdId: build.cmdId,
			sandboxId: sandboxDbId,
			status: "running",
			command: "pnpm",
			args: ["run", "build"],
			cwd: config.cwd,
			type: "build",
			workspaceId: sessionDoc.workspaceId,
			projectId: sessionDoc.projectId,
			campaignId: sessionDoc.campaignId,
			agentSessionId: sessionDoc._id,
			createdBy: sessionDoc.createdBy,
		},
	);

	// Update sandbox with build cmdId
	await ctx.runMutation(
		internal.collections.sandboxes.mutations.updateCommandIdsInternal,
		{ id: sandboxDbId, buildCmdId: commandId },
	);

	// Capture logs regardless of success/failure
	const logs: {
		stream: "stdout" | "stderr";
		data: string;
		timestamp: string;
	}[] = [];
	let buildOutput = "";

	for await (const log of build.logs()) {
		// Remove ANSI escape codes for cleaner output
		// biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional ANSI escape code removal
		const cleanedData = log.data.replace(/\u001b\[[0-9;]*[mGKH]/g, "");
		buildOutput += cleanedData;

		logs.push({
			stream: log.stream,
			data: log.data,
			timestamp: new Date().toISOString(),
		});
	}

	// Append logs to command
	if (logs.length > 0) {
		await ctx.runMutation(
			internal.collections.sandboxes.commands.mutations.appendCommandLogs,
			{
				cmdId: build.cmdId,
				logs: logs.map((log) => ({
					stream: log.stream,
					data: log.data,
					timestamp: log.timestamp,
				})),
			},
		);
	}

	if (build.exitCode !== 0) {
		// Update command to failed
		await ctx.runMutation(
			internal.collections.sandboxes.commands.mutations.updateCommandStatus,
			{ id: commandId, status: "failed", exitCode: build.exitCode },
		);

		return {
			success: false,
			error: buildOutput,
		};
	}

	// Update command to completed
	await ctx.runMutation(
		internal.collections.sandboxes.commands.mutations.updateCommandStatus,
		{ id: commandId, status: "completed", exitCode: 0 },
	);

	return {
		success: true,
		error: null,
	};
};

export const buildLandingPageTool = internalAction({
	args: {
		sandboxId: v.id("sandboxes"),
	},
	handler: async (
		ctx,
		{ sandboxId },
	): Promise<
		{ success: true; error: null } | { success: false; error: string }
	> => {
		const sandboxDoc = await ctx.runQuery(
			internal.collections.sandboxes.queries.getByIdInternal,
			{ id: sandboxId },
		);

		if (!sandboxDoc) {
			return {
				success: false,
				error: "Sandbox not found",
			};
		}

		if (sandboxDoc.status !== "running") {
			return {
				success: false,
				error: "Sandbox is not running",
			};
		}

		// Get session for workspace/project/campaign context
		const session = await ctx.runQuery(
			internal.collections.agentSessions.queries.getByIdInternal,
			{ id: sandboxDoc.agentSessionId },
		);

		if (!session) {
			return {
				success: false,
				error: "Session not found",
			};
		}

		// Set isBuilding = true
		await ctx.runMutation(
			internal.collections.sandboxes.mutations.updateInternal,
			{ id: sandboxId, isBuilding: true },
		);

		try {
			const credentials = getCredentials();
			const instance = await SandboxClass.get({
				sandboxId: sandboxDoc.sandboxExternalId,
				...credentials,
			});

			const config: Infer<typeof sandboxConfigSchema> = {
				vcpus: sandboxDoc.vcpus,
				runtime: sandboxDoc.runtime,
				timeout: sandboxDoc.timeout,
				cwd: sandboxDoc.cwd,
				ports: sandboxDoc.ports,
			};

			// Run build
			const result = await buildLandingPage(
				instance,
				ctx,
				sandboxId,
				session,
				config,
			);

			return result;
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		} finally {
			// Always clear building flag
			await ctx.runMutation(
				internal.collections.sandboxes.mutations.updateInternal,
				{ id: sandboxId, isBuilding: false },
			);
		}
	},
});

export const extractBuildOutputTool = internalAction({
	args: {
		sandboxId: v.id("sandboxes"),
		landingPageId: v.id("landingPages"),
	},
	handler: async (
		ctx,
		{ sandboxId, landingPageId },
	): Promise<
		| { success: true; html: string; js: string; css: string; error: null }
		| { success: false; html: null; js: null; css: null; error: string }
	> => {
		try {
			// 1. Read index.html
			const htmlResult = await ctx.runAction(
				internal.collections.sandboxes.actions.readFileTool,
				{
					sandboxId,
					filePath: "dist/index.html",
				},
			);

			if (!htmlResult.success) {
				return {
					success: false,
					html: null,
					js: null,
					css: null,
					error: "Failed to read index.html",
				};
			}

			// 2. List assets in dist/assets
			const listResult = await ctx.runAction(
				internal.collections.sandboxes.actions.runCommandTool,
				{
					sandboxId,
					command: "ls",
					args: ["-1", "dist/assets"],
					cwd: "/vercel/sandbox",
				},
			);

			if (!listResult.success) {
				return {
					success: false,
					html: null,
					js: null,
					css: null,
					error: "Failed to list dist/assets directory",
				};
			}

			// Parse file list
			const files = listResult.stdout.split("\n").filter(Boolean);
			const jsFile = files.find((f) => f.includes(".js"));
			const cssFile = files.find((f) => f.includes(".css"));

			if (!jsFile || !cssFile) {
				return {
					success: false,
					html: null,
					js: null,
					css: null,
					error: `Missing assets: JS=${!jsFile}, CSS=${!cssFile}`,
				};
			}

			// 3. Read JS and CSS files
			const [jsResult, cssResult] = await Promise.all([
				ctx.runAction(internal.collections.sandboxes.actions.readFileTool, {
					sandboxId,
					filePath: `dist/assets/${jsFile}`,
				}),
				ctx.runAction(internal.collections.sandboxes.actions.readFileTool, {
					sandboxId,
					filePath: `dist/assets/${cssFile}`,
				}),
			]);

			if (!jsResult.success || !cssResult.success) {
				return {
					success: false,
					html: null,
					js: null,
					css: null,
					error: "Failed to read JS or CSS files",
				};
			}

			// 4. Transform HTML to update asset paths
			// Replace: /assets/${jsFile} → /landing/${landingPageId}/assets/script
			// Replace: /assets/${cssFile} → /landing/${landingPageId}/assets/styles
			const updatedHTML = htmlResult.content
				.replace(`/assets/${jsFile}`, `/landing/${landingPageId}/assets/script`)
				.replace(
					`/assets/${cssFile}`,
					`/landing/${landingPageId}/assets/styles`,
				);

			return {
				success: true,
				html: updatedHTML,
				js: jsResult.content,
				css: cssResult.content,
				error: null,
			};
		} catch (error) {
			return {
				success: false,
				html: null,
				js: null,
				css: null,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	},
});

export const runCommandTool = internalAction({
	args: {
		sandboxId: v.id("sandboxes"),
		command: v.string(),
		args: v.optional(v.array(v.string())),
		cwd: v.optional(v.string()),
		detached: v.optional(v.boolean()),
	},
	handler: async (
		ctx,
		{ sandboxId, command, args = [], cwd, detached },
	): Promise<
		| {
				success: true;
				exitCode: number;
				stdout: string;
				stderr: string;
				error: null;
		  }
		| {
				success: false;
				exitCode: number | null;
				stdout: string;
				stderr: string;
				error: { message: string };
		  }
	> => {
		const sandboxDoc = await ctx.runQuery(
			internal.collections.sandboxes.queries.getByIdInternal,
			{ id: sandboxId },
		);

		if (!sandboxDoc) {
			return {
				success: false,
				exitCode: null,
				stdout: "",
				stderr: "",
				error: { message: "Sandbox not found" },
			};
		}

		if (sandboxDoc.status !== "running") {
			return {
				success: false,
				exitCode: null,
				stdout: "",
				stderr: "",
				error: { message: "Sandbox is not running" },
			};
		}

		// Get session for workspace/project/campaign context
		const session = await ctx.runQuery(
			internal.collections.agentSessions.queries.getByIdInternal,
			{ id: sandboxDoc.agentSessionId },
		);

		if (!session) {
			return {
				success: false,
				exitCode: null,
				stdout: "",
				stderr: "",
				error: { message: "Session not found" },
			};
		}

		try {
			const credentials = getCredentials();
			const instance = await SandboxClass.get({
				sandboxId: sandboxDoc.sandboxExternalId,
				...credentials,
			});

			// Run command
			const cmd = await instance.runCommand({
				cmd: command,
				args,
				cwd,
				detached,
			});

			// Create command record in Convex
			const commandId = await ctx.runMutation(
				internal.collections.sandboxes.commands.mutations.createCommand,
				{
					cmdId: cmd.cmdId,
					sandboxId: sandboxId,
					status: detached ? "running" : "completed",
					command,
					args,
					cwd: cwd ?? sandboxDoc.cwd,
					type: "other",
					workspaceId: session.workspaceId,
					projectId: session.projectId,
					campaignId: session.campaignId,
					agentSessionId: session._id,
					createdBy: session.createdBy,
				},
			);

			// If detached, register monitoring and return immediately
			if (detached) {
				await registerMonitoring(instance.sandboxId, cmd.cmdId, "other");

				return {
					success: true,
					exitCode: 0,
					stdout: "",
					stderr: "",
					error: null,
				};
			}

			// Capture logs for non-detached commands
			const logs: {
				stream: "stdout" | "stderr";
				data: string;
				timestamp: string;
			}[] = [];
			let stdout = "";
			let stderr = "";

			for await (const log of cmd.logs()) {
				logs.push({
					stream: log.stream,
					data: log.data,
					timestamp: new Date().toISOString(),
				});

				if (log.stream === "stdout") {
					stdout += log.data;
				} else {
					stderr += log.data;
				}
			}

			// Append logs to command
			if (logs.length > 0) {
				await ctx.runMutation(
					internal.collections.sandboxes.commands.mutations.appendCommandLogs,
					{
						cmdId: cmd.cmdId,
						logs: logs.map((log) => ({
							stream: log.stream,
							data: log.data,
							timestamp: log.timestamp,
						})),
					},
				);
			}

			// Update command status
			await ctx.runMutation(
				internal.collections.sandboxes.commands.mutations.updateCommandStatus,
				{
					id: commandId,
					status: cmd.exitCode === 0 ? "completed" : "failed",
					exitCode: cmd.exitCode,
				},
			);

			if (cmd.exitCode !== 0) {
				return {
					success: false,
					exitCode: cmd.exitCode,
					stdout,
					stderr,
					error: { message: `Command failed with exit code ${cmd.exitCode}` },
				};
			}

			return {
				success: true,
				exitCode: cmd.exitCode,
				stdout,
				stderr,
				error: null,
			};
		} catch (error) {
			return {
				success: false,
				exitCode: null,
				stdout: "",
				stderr: "",
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});

export const saveLandingPageVersionTool = internalAction({
	args: {
		sandboxId: v.id("sandboxes"),
		landingPageId: v.id("landingPages"),
		commitMessage: v.string(),
		description: v.optional(v.string()),
		messageId: v.optional(v.string()),
	},
	handler: async (
		ctx,
		{ sandboxId, landingPageId, commitMessage, description, messageId },
	): Promise<
		| { success: true; versionNumber: number; versionId: string; error: null }
		| {
				success: false;
				versionNumber: null;
				versionId: null;
				error: { message: string };
		  }
	> => {
		const sandbox = await ctx.runQuery(
			internal.collections.sandboxes.queries.getByIdInternal,
			{ id: sandboxId },
		);

		if (!sandbox) {
			return {
				success: false,
				versionNumber: null,
				versionId: null,
				error: { message: "Sandbox not found" },
			};
		}

		if (sandbox.status !== "running") {
			return {
				success: false,
				versionNumber: null,
				versionId: null,
				error: { message: "Sandbox is not running" },
			};
		}

		// Get landing page to verify it exists
		const landingPage = await ctx.runQuery(
			internal.collections.landingPages.queries.getByIdInternal,
			{ id: landingPageId },
		);

		if (!landingPage) {
			return {
				success: false,
				versionNumber: null,
				versionId: null,
				error: { message: "Landing page not found" },
			};
		}

		try {
			console.log(
				"[saveLandingPageVersionTool] Starting version save for landingPage:",
				landingPageId,
			);

			const credentials = getCredentials();
			const instance = await SandboxClass.get({
				sandboxId: sandbox.sandboxExternalId,
				...credentials,
			});

			console.log("[saveLandingPageVersionTool] Creating tar archive...");

			// Create tar archive of the project (exclude node_modules, .next, etc.)
			const tarPath = "/tmp/version.tar.gz";
			const createTarCmd = await instance.runCommand({
				cmd: "tar",
				args: [
					"-czf",
					tarPath,
					"-C",
					"/vercel/sandbox",
					// Package managers & dependencies
					"--exclude=node_modules",
					"--exclude=.pnpm-store",
					"--exclude=.yarn",
					"--exclude=.npm",
					// Build artifacts
					"--exclude=dist",
					"--exclude=.next",
					"--exclude=.turbo",
					"--exclude=build",
					"--exclude=out",
					// Development & caches
					"--exclude=.git",
					"--exclude=.cache",
					"--exclude=.vite",
					"--exclude=.vercel",
					// Archives (prevent recursive tar bloat)
					"--exclude=*.tar",
					"--exclude=*.tar.gz",
					"--exclude=*.tgz",
					"--exclude=*.zip",
					// Logs & temp files
					"--exclude=*.log",
					"--exclude=.DS_Store",
					"--exclude=coverage",
					"--exclude=.env.local",
					"--exclude=.env.*.local",
					".",
				],
				cwd: "/vercel/sandbox",
			});

			// Wait for tar command to complete
			for await (const _log of createTarCmd.logs()) {
				// Consume logs to ensure command completes
			}

			if (createTarCmd.exitCode !== 0) {
				console.error(
					"[saveLandingPageVersionTool] Tar creation failed with exit code:",
					createTarCmd.exitCode,
				);
				return {
					success: false,
					versionNumber: null,
					versionId: null,
					error: { message: "Failed to create tar archive" },
				};
			}

			console.log(
				"[saveLandingPageVersionTool] Tar created successfully, reading file...",
			);

			// Read the tar file
			const tarStream = await instance.readFile({ path: tarPath });

			if (!tarStream) {
				return {
					success: false,
					versionNumber: null,
					versionId: null,
					error: { message: "Failed to read tar file" },
				};
			}

			// Convert stream to Buffer
			const chunks: Uint8Array[] = [];
			try {
				for await (const chunk of tarStream as AsyncIterable<Uint8Array>) {
					chunks.push(chunk);
				}
			} catch {
				try {
					// @ts-expect-error - ReadableStream might have getReader
					const reader = tarStream.getReader();
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						if (value) chunks.push(value);
					}
				} catch (readerError) {
					return {
						success: false,
						versionNumber: null,
						versionId: null,
						error: {
							message: `Failed to read tar stream: ${readerError instanceof Error ? readerError.message : String(readerError)}`,
						},
					};
				}
			}

			const tarBuffer = Buffer.concat(chunks);

			const tarSizeKB = (tarBuffer.length / 1024).toFixed(2);
			console.log(
				"[saveLandingPageVersionTool] Tar buffer size:",
				tarSizeKB,
				"KB",
			);

			// Validate tar size (warn if unusually large, likely missing exclusions)
			const MAX_EXPECTED_SIZE = 5 * 1024 * 1024; // 5MB
			if (tarBuffer.length > MAX_EXPECTED_SIZE) {
				console.warn(
					`[saveLandingPageVersionTool] WARNING: Tar file is unusually large (${tarSizeKB} KB). Check if exclusions are working correctly.`,
				);
			}

			// Generate R2 key
			const key = `landing-page-versions/${landingPageId}/${crypto.randomUUID()}.tar.gz`;

			console.log("[saveLandingPageVersionTool] Storing in R2 with key:", key);

			// Store in R2 directly (can't pass large buffers through ctx.runAction)
			await r2.store(ctx, tarBuffer, key);

			console.log(
				"[saveLandingPageVersionTool] Stored in R2, creating version record...",
			);

			// Create version record
			const versionResult = await ctx.runMutation(
				internal.collections.landingPages.versions.mutations.createWithCommit,
				{
					landingPageId,
					key,
					commitMessage,
					description,
					messageId,
					workspaceId: landingPage.workspaceId,
					projectId: landingPage.projectId,
					campaignId: landingPage.campaignId,
					createdBy: sandbox.createdBy,
				},
			);

			console.log(
				"[saveLandingPageVersionTool] Version saved successfully! Version number:",
				versionResult.number,
			);

			return {
				success: true,
				versionNumber: versionResult.number,
				versionId: versionResult.landingPageVersionId,
				error: null,
			};
		} catch (error) {
			console.error("[saveLandingPageVersionTool] Error:", error);
			return {
				success: false,
				versionNumber: null,
				versionId: null,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});

export const listLandingPageVersionsTool = internalAction({
	args: {
		landingPageId: v.id("landingPages"),
	},
	handler: async (
		ctx,
		{ landingPageId },
	): Promise<
		| {
				success: true;
				versions: Array<{
					_id: string;
					number: number;
					commitMessage?: string;
					_creationTime: number;
				}>;
				error: null;
		  }
		| { success: false; versions: null; error: { message: string } }
	> => {
		try {
			const versions = await ctx.runQuery(
				internal.collections.landingPages.versions.queries
					.listByLandingPageIdInternal,
				{ landingPageId },
			);

			return {
				success: true,
				versions,
				error: null,
			};
		} catch (error) {
			console.error("[listLandingPageVersionsTool] Error:", error);
			return {
				success: false,
				versions: null,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});

// Helper to parse rsync dry-run output
interface RsyncChanges {
	modified: string[];
	added: string[];
	deleted: string[];
}

function parseRsyncOutput(stdout: string): RsyncChanges {
	const lines = stdout.split("\n").filter((line) => line.trim());
	const changes: RsyncChanges = {
		modified: [],
		added: [],
		deleted: [],
	};

	for (const line of lines) {
		// Skip summary lines and directory listings
		if (
			line.startsWith("sending") ||
			line.startsWith("sent") ||
			line.startsWith("total") ||
			line.includes("speedup") ||
			line.endsWith("/")
		) {
			continue;
		}

		// rsync output format: "deleting filename" or ">f+++++++++ filename" or ">f.st...... filename"
		if (line.startsWith("deleting ")) {
			const file = line.replace("deleting ", "").trim();
			if (file && !file.includes("node_modules")) {
				changes.deleted.push(file);
			}
		} else if (line.startsWith(">f")) {
			// >f+++++++++ = new file
			// >f.st...... = modified file (size or time changed)
			const parts = line.split(" ");
			const file = parts[parts.length - 1]?.trim();
			if (file && !file.includes("node_modules")) {
				if (line.includes("+++++++++")) {
					changes.added.push(file);
				} else {
					changes.modified.push(file);
				}
			}
		}
	}

	return changes;
}

export const previewVersionRevertTool = internalAction({
	args: {
		sandboxId: v.id("sandboxes"),
		versionId: v.id("landingPageVersions"),
	},
	handler: async (
		ctx,
		{ sandboxId, versionId },
	): Promise<
		| {
				success: true;
				filesChanged: number;
				filesAdded: number;
				filesDeleted: number;
				modified: string[];
				added: string[];
				deleted: string[];
				dependenciesChanged: boolean;
				willReinstall: boolean;
				error: null;
		  }
		| {
				success: false;
				filesChanged: 0;
				filesAdded: 0;
				filesDeleted: 0;
				modified: [];
				added: [];
				deleted: [];
				dependenciesChanged: false;
				willReinstall: false;
				error: { message: string };
		  }
	> => {
		const sandbox = await ctx.runQuery(
			internal.collections.sandboxes.queries.getByIdInternal,
			{ id: sandboxId },
		);

		if (!sandbox) {
			return {
				success: false,
				filesChanged: 0,
				filesAdded: 0,
				filesDeleted: 0,
				modified: [],
				added: [],
				deleted: [],
				dependenciesChanged: false,
				willReinstall: false,
				error: { message: "Sandbox not found" },
			};
		}

		if (sandbox.status !== "running") {
			return {
				success: false,
				filesChanged: 0,
				filesAdded: 0,
				filesDeleted: 0,
				modified: [],
				added: [],
				deleted: [],
				dependenciesChanged: false,
				willReinstall: false,
				error: { message: "Sandbox is not running" },
			};
		}

		try {
			console.log(
				"[previewVersionRevertTool] Previewing revert to version:",
				versionId,
			);

			const credentials = getCredentials();
			const instance = await SandboxClass.get({
				sandboxId: sandbox.sandboxExternalId,
				...credentials,
			});

			// Get version record
			const version = await ctx.runQuery(
				internal.collections.landingPages.versions.queries.getByIdInternal,
				{ id: versionId },
			);

			if (!version || !version.key) {
				return {
					success: false,
					filesChanged: 0,
					filesAdded: 0,
					filesDeleted: 0,
					modified: [],
					added: [],
					deleted: [],
					dependenciesChanged: false,
					willReinstall: false,
					error: { message: "Version not found or has no stored files" },
				};
			}

			console.log(
				"[previewVersionRevertTool] Getting R2 URL for version:",
				version.key,
			);

			// Get signed URL from R2 (avoid loading large file into memory)
			const tarUrl = await r2.getUrl(version.key);

			console.log(
				"[previewVersionRevertTool] Downloading tar directly to sandbox...",
			);

			// Download tar directly to sandbox using curl (avoids memory limit)
			const downloadCmd = await instance.runCommand({
				cmd: "curl",
				args: ["-L", "-o", "/tmp/restore.tar.gz", tarUrl],
			});

			if (downloadCmd.exitCode !== 0) {
				return {
					success: false,
					filesChanged: 0,
					filesAdded: 0,
					filesDeleted: 0,
					modified: [],
					added: [],
					deleted: [],
					dependenciesChanged: false,
					willReinstall: false,
					error: {
						message: `Failed to download version: ${downloadCmd.stderr}`,
					},
				};
			}

			// Create temp extraction directory
			await instance.runCommand({
				cmd: "mkdir",
				args: ["-p", "/tmp/restored"],
			});

			// Extract tar
			const extractCmd = await instance.runCommand({
				cmd: "tar",
				args: ["-xzf", "/tmp/restore.tar.gz", "-C", "/tmp/restored"],
			});

			for await (const _log of extractCmd.logs()) {
				// Consume logs
			}

			if (extractCmd.exitCode !== 0) {
				return {
					success: false,
					filesChanged: 0,
					filesAdded: 0,
					filesDeleted: 0,
					modified: [],
					added: [],
					deleted: [],
					dependenciesChanged: false,
					willReinstall: false,
					error: { message: "Failed to extract version archive" },
				};
			}

			// Check if rsync is available, install if needed
			const checkRsyncCmd = await instance.runCommand({
				cmd: "which",
				args: ["rsync"],
			});

			for await (const _log of checkRsyncCmd.logs()) {
				// Consume logs
			}

			if (checkRsyncCmd.exitCode !== 0) {
				console.log("[previewVersionRevertTool] Installing rsync...");

				const installCmd = await instance.runCommand({
					cmd: "dnf",
					args: ["install", "-y", "rsync"],
					sudo: true,
				});

				for await (const _log of installCmd.logs()) {
					// Consume logs
				}

				if (installCmd.exitCode !== 0) {
					return {
						success: false,
						filesChanged: 0,
						filesAdded: 0,
						filesDeleted: 0,
						modified: [],
						added: [],
						deleted: [],
						dependenciesChanged: false,
						willReinstall: false,
						error: { message: "Failed to install rsync" },
					};
				}
			}

			console.log(
				"[previewVersionRevertTool] Running rsync dry-run to detect changes...",
			);

			// Run rsync dry-run to detect changes
			const dryRunCmd = await instance.runCommand({
				cmd: "rsync",
				args: [
					"-avcn", // a=archive, v=verbose, c=checksum, n=dry-run
					// Package managers & dependencies
					"--exclude=node_modules",
					"--exclude=.pnpm-store",
					"--exclude=.yarn",
					"--exclude=.npm",
					// Build artifacts
					"--exclude=dist",
					"--exclude=.next",
					"--exclude=.turbo",
					"--exclude=build",
					"--exclude=out",
					// Development & caches
					"--exclude=.git",
					"--exclude=.cache",
					"--exclude=.vite",
					"--exclude=.vercel",
					// Archives
					"--exclude=*.tar",
					"--exclude=*.tar.gz",
					"--exclude=*.tgz",
					"--exclude=*.zip",
					// Logs & temp
					"--exclude=*.log",
					"--exclude=.DS_Store",
					"--exclude=coverage",
					"--delete",
					"/tmp/restored/",
					"/vercel/sandbox/",
				],
			});

			let stdout = "";
			for await (const log of dryRunCmd.logs()) {
				if (log.stream === "stdout") {
					stdout += log.data;
				}
			}

			console.log("[previewVersionRevertTool] Rsync dry-run output:", stdout);

			// Parse rsync output
			const changes = parseRsyncOutput(stdout);

			// Check if dependencies will change
			const allChangedFiles = [
				...changes.modified,
				...changes.added,
				...changes.deleted,
			];
			const packageJsonChanged = allChangedFiles.some((file) =>
				file.includes("package.json"),
			);
			const pnpmLockChanged = allChangedFiles.some((file) =>
				file.includes("pnpm-lock.yaml"),
			);
			const dependenciesChanged = packageJsonChanged || pnpmLockChanged;

			// Cleanup temp files
			await instance.runCommand({
				cmd: "rm",
				args: ["-rf", "/tmp/restore.tar.gz", "/tmp/restored"],
			});

			console.log("[previewVersionRevertTool] Preview complete:", {
				modified: changes.modified.length,
				added: changes.added.length,
				deleted: changes.deleted.length,
				dependenciesChanged,
				willReinstall: dependenciesChanged,
			});

			// Limit file lists to prevent token overflow (show max 20 files each)
			const maxFiles = 20;

			return {
				success: true,
				filesChanged: changes.modified.length,
				filesAdded: changes.added.length,
				filesDeleted: changes.deleted.length,
				modified: changes.modified.slice(0, maxFiles),
				added: changes.added.slice(0, maxFiles),
				deleted: changes.deleted.slice(0, maxFiles),
				dependenciesChanged,
				willReinstall: dependenciesChanged,
				error: null,
			};
		} catch (error) {
			console.error("[previewVersionRevertTool] Error:", error);
			return {
				success: false,
				filesChanged: 0,
				filesAdded: 0,
				filesDeleted: 0,
				modified: [],
				added: [],
				deleted: [],
				dependenciesChanged: false,
				willReinstall: false,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});

// Helper to unregister monitoring from sandbox-logger
const unregisterMonitoring = async (
	sandboxId: string,
	cmdId: string,
): Promise<void> => {
	const sandboxLoggerUrl = process.env.SANDBOX_LOGGER_URL;
	const sandboxLoggerServiceToken = process.env.SANDBOX_LOGGER_SERVICE_TOKEN;

	if (!sandboxLoggerUrl || !sandboxLoggerServiceToken) {
		console.warn(
			"[unregisterMonitoring] Missing environment variables, skipping log unregister",
		);
		return;
	}

	try {
		const url = new URL(
			`/monitor/stop/${sandboxId}/${cmdId}`,
			sandboxLoggerUrl,
		);

		const response = await fetch(url.toString(), {
			method: "POST",
			headers: {
				Authorization: `Bearer ${sandboxLoggerServiceToken}`,
			},
		});

		if (!response.ok) {
			const error = await response.text();
			console.error(
				`[unregisterMonitoring] Failed to unregister monitoring: ${error}`,
			);
		} else {
			console.log(
				`[unregisterMonitoring] Successfully unregistered monitoring for ${sandboxId}/${cmdId}`,
			);
		}
	} catch (error) {
		console.error(
			"[unregisterMonitoring] Error unregistering monitoring:",
			error,
		);
	}
};

/**
 * Check dev server status and get recent logs
 */
export const checkDevServerAndLogs = internalAction({
	args: {
		sandboxId: v.id("sandboxes"),
		logLimit: v.optional(v.number()),
	},
	handler: async (
		ctx,
		{ sandboxId, logLimit = 20 },
	): Promise<
		| {
				success: true;
				status: "running" | "stopped" | "failed" | "not_started";
				logs: Array<{ timestamp: string; stream: string; data: string }>;
				previewUrl: string | null;
				port: number | null;
				error: null;
		  }
		| {
				success: false;
				status: null;
				logs: null;
				previewUrl: null;
				port: null;
				error: string;
		  }
	> => {
		try {
			const sandboxDoc = await ctx.runQuery(
				internal.collections.sandboxes.queries.getByIdInternal,
				{ id: sandboxId },
			);

			if (!sandboxDoc) {
				return {
					success: false,
					status: null,
					logs: null,
					previewUrl: null,
					port: null,
					error: "Sandbox not found",
				};
			}

			// Check if dev command exists
			if (!sandboxDoc.devCmdId) {
				return {
					success: true,
					status: "not_started",
					logs: [],
					previewUrl: sandboxDoc.previewUrl ?? null,
					port: sandboxDoc.ports[0] ?? null,
					error: null,
				};
			}

			// Get dev command with logs
			const devCommand = await ctx.runQuery(
				internal.collections.sandboxes.commands.queries.getByIdInternal,
				{ id: sandboxDoc.devCmdId },
			);

			if (!devCommand) {
				return {
					success: true,
					status: "not_started",
					logs: [],
					previewUrl: sandboxDoc.previewUrl ?? null,
					port: sandboxDoc.ports[0] ?? null,
					error: null,
				};
			}

			// Get recent logs (last N entries)
			const allLogs = devCommand.logs || [];
			const recentLogs = allLogs.slice(-logLimit);

			// Determine status
			let status: "running" | "stopped" | "failed" | "not_started";
			if (devCommand.status === "running") {
				status = "running";
			} else if (devCommand.status === "failed") {
				status = "failed";
			} else {
				status = "stopped";
			}

			return {
				success: true,
				status,
				logs: recentLogs,
				previewUrl: sandboxDoc.previewUrl ?? null,
				port: sandboxDoc.ports[0] ?? null,
				error: null,
			};
		} catch (error) {
			console.error("[checkDevServerAndLogs] Error:", error);
			return {
				success: false,
				status: null,
				logs: null,
				previewUrl: null,
				port: null,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	},
});

/**
 * Restart dev server - stops existing dev command and starts a new one
 */
export const restartDevServer = internalAction({
	args: {
		sandboxId: v.id("sandboxes"),
	},
	handler: async (
		ctx,
		{ sandboxId },
	): Promise<
		| { success: true; devCmdId: string; previewUrl: string; error: null }
		| { success: false; devCmdId: null; previewUrl: null; error: string }
	> => {
		try {
			const sandboxDoc = await ctx.runQuery(
				internal.collections.sandboxes.queries.getByIdInternal,
				{ id: sandboxId },
			);

			if (!sandboxDoc) {
				return {
					success: false,
					devCmdId: null,
					previewUrl: null,
					error: "Sandbox not found",
				};
			}

			if (sandboxDoc.status !== "running") {
				return {
					success: false,
					devCmdId: null,
					previewUrl: null,
					error: "Sandbox is not running",
				};
			}

			// Get session for workspace/project/campaign context
			const session = await ctx.runQuery(
				internal.collections.agentSessions.queries.getByIdInternal,
				{ id: sandboxDoc.agentSessionId },
			);

			if (!session) {
				return {
					success: false,
					devCmdId: null,
					previewUrl: null,
					error: "Session not found",
				};
			}

			const credentials = getCredentials();
			const instance = await SandboxClass.get({
				sandboxId: sandboxDoc.sandboxExternalId,
				...credentials,
			});

			// Step 1: Stop existing dev command if it exists
			if (sandboxDoc.devCmdId) {
				console.log("[restartDevServer] Stopping existing dev command...");

				const devCommand = await ctx.runQuery(
					internal.collections.sandboxes.commands.queries.getByIdInternal,
					{ id: sandboxDoc.devCmdId },
				);

				if (devCommand) {
					// Update command status to completed in Convex
					await ctx.runMutation(
						internal.collections.sandboxes.commands.mutations
							.updateCommandStatus,
						{ id: sandboxDoc.devCmdId, status: "completed", exitCode: 0 },
					);

					// Unregister from monitoring
					await unregisterMonitoring(
						sandboxDoc.sandboxExternalId,
						devCommand.cmdId,
					);

					// Kill the process in sandbox
					try {
						await instance.runCommand({
							cmd: "pkill",
							args: ["-f", "pnpm run dev"],
						});
						console.log("[restartDevServer] Killed dev process");
					} catch (error) {
						console.warn(
							"[restartDevServer] Failed to kill dev process:",
							error,
						);
					}

					// Wait for cleanup
					await sleep(2000);
				}
			}

			// Step 2: Start new dev command
			console.log("[restartDevServer] Starting new dev command...");

			const dev = await instance.runCommand({
				cmd: "pnpm",
				args: ["run", "dev"],
				cwd: sandboxDoc.cwd,
				detached: true,
			});

			// Create dev command record in Convex
			const devCommandId = await ctx.runMutation(
				internal.collections.sandboxes.commands.mutations.createCommand,
				{
					cmdId: dev.cmdId,
					sandboxId: sandboxId,
					status: "running",
					command: "pnpm",
					args: ["run", "dev"],
					cwd: sandboxDoc.cwd,
					type: "dev",
					workspaceId: session.workspaceId,
					projectId: session.projectId,
					campaignId: session.campaignId,
					agentSessionId: session._id,
					createdBy: session.createdBy,
				},
			);

			// Update sandbox dev cmdId
			await ctx.runMutation(
				internal.collections.sandboxes.mutations.updateCommandIdsInternal,
				{ id: sandboxId, devCmdId: devCommandId },
			);

			// Register monitoring with sandbox-logger
			await registerMonitoring(instance.sandboxId, dev.cmdId, "dev");

			// Wait for dev server to start
			await sleep(500);

			// Get preview URL
			const previewUrl = instance.domain(sandboxDoc.ports[0] ?? 5173);

			// Update preview URL in DB
			await ctx.runMutation(
				internal.collections.sandboxes.mutations.updatePreviewUrlInternal,
				{
					id: sandboxId,
					previewUrl,
				},
			);

			console.log("[restartDevServer] Dev server restarted successfully");

			return {
				success: true,
				devCmdId: devCommandId,
				previewUrl,
				error: null,
			};
		} catch (error) {
			console.error("[restartDevServer] Error:", error);
			return {
				success: false,
				devCmdId: null,
				previewUrl: null,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	},
});

/**
 * Renew sandbox session - creates a new sandbox for a renewed agent session
 * Similar to createOrGetSandboxSession but specifically for session renewals
 */
export const renewSandboxSession = internalAction({
	args: {
		sessionId: v.id("agentSessions"),
		config: v.object(sandboxConfigSchema.fields),
	},
	handler: async (ctx, { sessionId, config }): Promise<Id<"sandboxes">> => {
		const credentials = getCredentials();

		// Get session details
		const session = await ctx.runQuery(
			internal.collections.agentSessions.queries.getByIdInternal,
			{ id: sessionId },
		);

		if (!session) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (session.status !== "active") {
			throw new ConvexError(
				"Session is closed. Please join or create a new session.",
			);
		}

		// Determine asset settings from session
		const assetSettings =
			session.assetType === "landingPage"
				? { type: "landingPage" as const, id: session.landingPageId }
				: { type: "form" as const, id: session.formId };

		// Get asset signed URL
		let signedUrl: string;

		if (assetSettings.type === "landingPage") {
			// Get landing page with signed URL
			const landingPage = await ctx.runQuery(
				internal.collections.landingPages.queries.getByIdInternal,
				{ id: assetSettings.id },
			);

			if (!landingPage) {
				throw new ConvexError(ERRORS.NOT_FOUND);
			}

			// If no version exists, prepare template
			if (!landingPage.landingPageVersionId) {
				console.log(
					`[renewSandboxSession] No version found for landing page ${assetSettings.id}, preparing template inline`,
				);
				await ctx.runAction(
					internal.collections.landingPages.actions
						.prepareTemplateForLandingPage,
					{
						landingPageId: assetSettings.id,
						userId: session.createdBy,
					},
				);
			}

			// Get landing page with signed URL
			const landingPageWithUrl = await ctx.runQuery(
				internal.collections.landingPages.queries.getByIdWithSignedUrlInternal,
				{ id: assetSettings.id },
			);

			if (!landingPageWithUrl) {
				throw new ConvexError(
					"Landing page version not found after preparation",
				);
			}

			signedUrl = landingPageWithUrl.signedUrl;
		} else {
			// TODO: Implement form support
			throw new ConvexError({
				message: "Form sandboxes not yet supported",
				data: { assetType: assetSettings.type },
			});
		}

		try {
			// Create new sandbox
			const { sandboxDbId } = await createNewSandbox(
				signedUrl,
				credentials,
				ctx,
				sessionId,
				config,
			);

			return sandboxDbId;
		} catch (error) {
			console.error("Sandbox renewal failed:", error);

			if (error instanceof ConvexError) {
				throw error;
			}

			throw new ConvexError({
				message: "Failed to renew sandbox",
				data: { error: error instanceof Error ? error.message : String(error) },
			});
		}
	},
});

export const readTagsFile = action({
	args: {
		sandboxId: v.id("sandboxes"),
	},
	handler: async (
		ctx,
		{ sandboxId },
	): Promise<
		| { success: true; content: string; error: null }
		| { success: false; content: null; error: { message: string } }
	> => {
		const user = await ctx.auth.getUserIdentity();
		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// Get sandbox and verify workspace authorization
		const sandbox = await ctx.runQuery(
			internal.collections.sandboxes.queries.getByIdInternal,
			{ id: sandboxId },
		);

		if (!sandbox) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		// Get current user workspace
		const currentUser = await ctx.runQuery(
			internal.collections.users.queries.getCurrentUserInternal,
			{},
		);

		if (
			!currentUser ||
			sandbox.workspaceId !== currentUser.currentWorkspaceId
		) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		try {
			const result = await ctx.runAction(
				internal.collections.sandboxes.actions.readFileTool,
				{
					sandboxId,
					filePath: "src/configuration/tags.ts",
					cwd: "/vercel/sandbox",
				},
			);

			return result;
		} catch (error) {
			return {
				success: false,
				content: null,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});

/**
 * Read any file from the sandbox
 * Public action that users can call to read files from the sandbox
 */
export const readFile = action({
	args: {
		sandboxId: v.id("sandboxes"),
		filePath: v.string(),
		cwd: v.optional(v.string()),
		startLine: v.optional(v.number()),
		endLine: v.optional(v.number()),
	},
	handler: async (
		ctx,
		{ sandboxId, filePath, cwd, startLine, endLine },
	): Promise<
		| { success: true; content: string; error: null }
		| { success: false; content: null; error: { message: string } }
	> => {
		const user = await ctx.auth.getUserIdentity();
		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// Get sandbox and verify workspace authorization
		const sandbox = await ctx.runQuery(
			internal.collections.sandboxes.queries.getByIdInternal,
			{ id: sandboxId },
		);

		if (!sandbox) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		// Get current user workspace
		const currentUser = await ctx.runQuery(
			internal.collections.users.queries.getCurrentUserInternal,
			{},
		);

		if (
			!currentUser ||
			sandbox.workspaceId !== currentUser.currentWorkspaceId
		) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		try {
			const result = await ctx.runAction(
				internal.collections.sandboxes.actions.readFileTool,
				{
					sandboxId,
					filePath,
					cwd,
					startLine,
					endLine,
				},
			);

			return result;
		} catch (error) {
			return {
				success: false,
				content: null,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});

export const updateTagsFile = internalAction({
	args: {
		sandboxId: v.id("sandboxes"),
		tagsConfig: v.object({
			googleTagManagerId: v.union(v.string(), v.null()),
			googleAnalyticsId: v.union(v.string(), v.null()),
			googleSiteVerificationId: v.union(v.string(), v.null()),
			facebookPixelId: v.union(v.string(), v.null()),
		}),
	},
	handler: async (
		ctx,
		{ sandboxId, tagsConfig },
	): Promise<
		| { success: true; error: null }
		| { success: false; error: { message: string } }
	> => {
		try {
			// Prepare the updated configuration string with LLM directives
			const configString = `// LLM Directives:
// - You are not allowed to change any key in the tagsConfiguration object
// - If user requests to change a tag, you should notify users they can change the tags in settings > Tags

export const tagsConfiguration = ${JSON.stringify(tagsConfig, null, 2)};
`;

			const result = await ctx.runAction(
				internal.collections.sandboxes.actions.writeFilesTool,
				{
					sandboxId,
					files: [
						{
							path: "src/configuration/tags.ts",
							content: configString,
						},
					],
				},
			);

			if (!result.success) {
				return {
					success: false,
					error: result.error,
				};
			}

			return {
				success: true,
				error: null,
			};
		} catch (error) {
			return {
				success: false,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});

export const readSeoFile = action({
	args: {
		sandboxId: v.id("sandboxes"),
	},
	handler: async (
		ctx,
		{ sandboxId },
	): Promise<
		| { success: true; content: string; error: null }
		| { success: false; content: null; error: { message: string } }
	> => {
		const user = await ctx.auth.getUserIdentity();
		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// Get sandbox and verify workspace authorization
		const sandbox = await ctx.runQuery(
			internal.collections.sandboxes.queries.getByIdInternal,
			{ id: sandboxId },
		);

		if (!sandbox) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		// Get current user workspace
		const currentUser = await ctx.runQuery(
			internal.collections.users.queries.getCurrentUserInternal,
			{},
		);

		if (
			!currentUser ||
			sandbox.workspaceId !== currentUser.currentWorkspaceId
		) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		try {
			const result = await ctx.runAction(
				internal.collections.sandboxes.actions.readFileTool,
				{
					sandboxId,
					filePath: "src/configuration/seo.ts",
					cwd: "/vercel/sandbox",
				},
			);

			return result;
		} catch (error) {
			return {
				success: false,
				content: null,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});

export const updateSeoFile = internalAction({
	args: {
		sandboxId: v.id("sandboxes"),
		seoConfig: v.object({
			title: v.string(),
			description: v.string(),
			canonical: v.string(),
			indexable: v.boolean(),
			iconType: v.string(),
			icon: v.string(),
			openGraph: v.object({
				title: v.string(),
				description: v.string(),
				image: v.optional(v.string()),
				url: v.optional(v.string()),
				type: v.optional(v.string()),
			}),
		}),
	},
	handler: async (
		ctx,
		{ sandboxId, seoConfig },
	): Promise<
		| { success: true; error: null }
		| { success: false; error: { message: string } }
	> => {
		try {
			// Prepare the updated configuration string with LLM directives
			const configString = `// LLM Directives:
// - You are not allowed to change any key in the seoConfiguration object
// - You can change the values based on user requests e.g. "I want to change the meta title to 'My new title'"

export const seoConfiguration = ${JSON.stringify(seoConfig, null, 2)};
`;

			const result = await ctx.runAction(
				internal.collections.sandboxes.actions.writeFilesTool,
				{
					sandboxId,
					files: [
						{
							path: "src/configuration/seo.ts",
							content: configString,
						},
					],
				},
			);

			if (!result.success) {
				return {
					success: false,
					error: result.error,
				};
			}

			return {
				success: true,
				error: null,
			};
		} catch (error) {
			return {
				success: false,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});

export const saveSeoAndVersion = action({
	args: {
		sandboxId: v.id("sandboxes"),
		landingPageId: v.id("landingPages"),
		seoConfig: v.object({
			title: v.string(),
			description: v.string(),
			canonical: v.string(),
			indexable: v.boolean(),
			iconType: v.string(),
			icon: v.string(),
			openGraph: v.object({
				title: v.string(),
				description: v.string(),
				image: v.optional(v.string()),
				url: v.optional(v.string()),
				type: v.optional(v.string()),
			}),
		}),
	},
	handler: async (
		ctx,
		{ sandboxId, landingPageId, seoConfig },
	): Promise<
		| {
				success: true;
				versionNumber: number;
				versionId: string;
				error: null;
		  }
		| {
				success: false;
				versionNumber: null;
				versionId: null;
				error: { message: string };
		  }
	> => {
		const user = await ctx.auth.getUserIdentity();
		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// Get sandbox and verify workspace authorization
		const sandbox = await ctx.runQuery(
			internal.collections.sandboxes.queries.getByIdInternal,
			{ id: sandboxId },
		);

		if (!sandbox) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		// Get current user workspace
		const currentUser = await ctx.runQuery(
			internal.collections.users.queries.getCurrentUserInternal,
			{},
		);

		if (
			!currentUser ||
			sandbox.workspaceId !== currentUser.currentWorkspaceId
		) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		try {
			// Step 1: Update SEO file
			console.log("[saveSeoAndVersion] Updating SEO file...");
			const updateResult = await ctx.runAction(
				internal.collections.sandboxes.actions.updateSeoFile,
				{ sandboxId, seoConfig },
			);

			if (!updateResult.success) {
				return {
					success: false,
					versionNumber: null,
					versionId: null,
					error: updateResult.error,
				};
			}

			// Step 2: Save version with commit message
			console.log("[saveSeoAndVersion] Saving version...");
			const versionResult = await ctx.runAction(
				internal.collections.sandboxes.actions.saveLandingPageVersionTool,
				{
					sandboxId,
					landingPageId,
					commitMessage: "chore: update SEO configuration",
					description:
						"Updated SEO configuration including meta tags, Open Graph, and Twitter Card settings",
				},
			);

			if (!versionResult.success) {
				return {
					success: false,
					versionNumber: null,
					versionId: null,
					error: versionResult.error,
				};
			}

			console.log(
				"[saveSeoAndVersion] Successfully saved SEO and version:",
				versionResult.versionNumber,
			);

			return {
				success: true,
				versionNumber: versionResult.versionNumber,
				versionId: versionResult.versionId,
				error: null,
			};
		} catch (error) {
			console.error("[saveSeoAndVersion] Error:", error);
			return {
				success: false,
				versionNumber: null,
				versionId: null,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});

/**
 * Save marketing tags and create a new version
 * Public action that users can call to update tags and save the current state
 */
export const saveTagsAndVersion = action({
	args: {
		sandboxId: v.id("sandboxes"),
		landingPageId: v.id("landingPages"),
		tagsConfig: v.object({
			googleTagManagerId: v.union(v.string(), v.null()),
			googleAnalyticsId: v.union(v.string(), v.null()),
			googleSiteVerificationId: v.union(v.string(), v.null()),
			facebookPixelId: v.union(v.string(), v.null()),
		}),
	},
	handler: async (
		ctx,
		{ sandboxId, landingPageId, tagsConfig },
	): Promise<
		| {
				success: true;
				versionNumber: number;
				versionId: string;
				error: null;
		  }
		| {
				success: false;
				versionNumber: null;
				versionId: null;
				error: { message: string };
		  }
	> => {
		const user = await ctx.auth.getUserIdentity();
		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		// Get sandbox and verify workspace authorization
		const sandbox = await ctx.runQuery(
			internal.collections.sandboxes.queries.getByIdInternal,
			{ id: sandboxId },
		);

		if (!sandbox) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		// Get current user workspace
		const currentUser = await ctx.runQuery(
			internal.collections.users.queries.getCurrentUserInternal,
			{},
		);

		if (
			!currentUser ||
			sandbox.workspaceId !== currentUser.currentWorkspaceId
		) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		try {
			// Step 1: Update tags file
			console.log("[saveTagsAndVersion] Updating tags file...");
			const updateResult = await ctx.runAction(
				internal.collections.sandboxes.actions.updateTagsFile,
				{ sandboxId, tagsConfig },
			);

			if (!updateResult.success) {
				return {
					success: false,
					versionNumber: null,
					versionId: null,
					error: updateResult.error,
				};
			}

			// Step 2: Save version with commit message
			console.log("[saveTagsAndVersion] Saving version...");
			const versionResult = await ctx.runAction(
				internal.collections.sandboxes.actions.saveLandingPageVersionTool,
				{
					sandboxId,
					landingPageId,
					commitMessage: "chore: update marketing tags",
					description:
						"Updated marketing tags configuration (Google Tag Manager, Google Analytics, Google Site Verification, Facebook Pixel)",
				},
			);

			if (!versionResult.success) {
				return {
					success: false,
					versionNumber: null,
					versionId: null,
					error: versionResult.error,
				};
			}

			console.log(
				"[saveTagsAndVersion] Successfully saved tags and version:",
				versionResult.versionNumber,
			);

			return {
				success: true,
				versionNumber: versionResult.versionNumber,
				versionId: versionResult.versionId,
				error: null,
			};
		} catch (error) {
			console.error("[saveTagsAndVersion] Error:", error);
			return {
				success: false,
				versionNumber: null,
				versionId: null,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});

export const revertToVersionTool = internalAction({
	args: {
		sandboxId: v.id("sandboxes"),
		versionId: v.id("landingPageVersions"),
	},
	handler: async (
		ctx,
		{ sandboxId, versionId },
	): Promise<
		| { success: true; error: null }
		| { success: false; error: { message: string } }
	> => {
		const sandbox = await ctx.runQuery(
			internal.collections.sandboxes.queries.getByIdInternal,
			{ id: sandboxId },
		);

		if (!sandbox) {
			return {
				success: false,
				error: { message: "Sandbox not found" },
			};
		}

		if (sandbox.status !== "running") {
			return {
				success: false,
				error: { message: "Sandbox is not running" },
			};
		}

		try {
			console.log("[revertToVersionTool] Reverting to version:", versionId);

			const credentials = getCredentials();
			const instance = await SandboxClass.get({
				sandboxId: sandbox.sandboxExternalId,
				...credentials,
			});

			// Get version record
			const version = await ctx.runQuery(
				internal.collections.landingPages.versions.queries.getByIdInternal,
				{ id: versionId },
			);

			if (!version || !version.key) {
				return {
					success: false,
					error: { message: "Version not found or has no stored files" },
				};
			}

			console.log(
				"[revertToVersionTool] Getting R2 URL for version:",
				version.key,
			);

			// Get signed URL from R2 (avoid loading large file into memory)
			const tarUrl = await r2.getUrl(version.key);

			console.log(
				"[revertToVersionTool] Downloading tar directly to sandbox...",
			);

			// Download tar directly to sandbox using curl (avoids memory limit)
			const downloadCmd = await instance.runCommand({
				cmd: "curl",
				args: ["-L", "-o", "/tmp/restore.tar.gz", tarUrl],
			});

			if (downloadCmd.exitCode !== 0) {
				return {
					success: false,
					error: {
						message: `Failed to download version: ${downloadCmd.stderr}`,
					},
				};
			}

			// Create temp extraction directory
			await instance.runCommand({
				cmd: "mkdir",
				args: ["-p", "/tmp/restored"],
			});

			// Extract tar
			const extractCmd = await instance.runCommand({
				cmd: "tar",
				args: ["-xzf", "/tmp/restore.tar.gz", "-C", "/tmp/restored"],
			});

			for await (const _log of extractCmd.logs()) {
				// Consume logs
			}

			if (extractCmd.exitCode !== 0) {
				return {
					success: false,
					error: { message: "Failed to extract version archive" },
				};
			}

			// Check if rsync is available, install if needed
			const checkRsyncCmd = await instance.runCommand({
				cmd: "which",
				args: ["rsync"],
			});

			for await (const _log of checkRsyncCmd.logs()) {
				// Consume logs
			}

			if (checkRsyncCmd.exitCode !== 0) {
				console.log("[revertToVersionTool] Installing rsync...");

				const installCmd = await instance.runCommand({
					cmd: "dnf",
					args: ["install", "-y", "rsync"],
					sudo: true,
				});

				for await (const _log of installCmd.logs()) {
					// Consume logs
				}

				if (installCmd.exitCode !== 0) {
					return {
						success: false,
						error: { message: "Failed to install rsync" },
					};
				}
			}

			console.log("[revertToVersionTool] Detecting file changes...");

			// First, do a dry-run to see what would change
			const dryRunCmd = await instance.runCommand({
				cmd: "rsync",
				args: [
					"-avcn", // a=archive, v=verbose, c=checksum, n=dry-run
					"--exclude=node_modules",
					"--exclude=.pnpm-store",
					"--exclude=.yarn",
					"--exclude=.npm",
					"--exclude=.git",
					"--exclude=.next",
					"--exclude=dist",
					"--exclude=build",
					"--exclude=out",
					"--exclude=.turbo",
					"--exclude=.cache",
					"--exclude=.vite",
					"--exclude=.vercel",
					"--exclude=*.tar",
					"--exclude=*.tar.gz",
					"--exclude=*.tgz",
					"--exclude=*.zip",
					"--exclude=*.log",
					"--exclude=.DS_Store",
					"--exclude=coverage",
					"--delete",
					"/tmp/restored/",
					"/vercel/sandbox/",
				],
			});

			let packageJsonChanged = false;
			let pnpmLockChanged = false;
			const changedFiles: string[] = [];

			for await (const log of dryRunCmd.logs()) {
				if (log.stream === "stdout") {
					const line = log.data.trim();
					// rsync outputs changed files in format like: "package.json"
					if (
						line &&
						!line.startsWith("sending") &&
						!line.startsWith("total")
					) {
						changedFiles.push(line);
						if (line.includes("package.json")) packageJsonChanged = true;
						if (line.includes("pnpm-lock.yaml")) pnpmLockChanged = true;
					}
				}
			}

			console.log(
				`[revertToVersionTool] Found ${changedFiles.length} changed files`,
			);

			// Now apply the changes for real
			console.log("[revertToVersionTool] Applying changes with rsync...");
			const rsyncCmd = await instance.runCommand({
				cmd: "rsync",
				args: [
					"-avc", // a=archive, v=verbose, c=checksum (no dry-run)
					"--exclude=node_modules",
					"--exclude=.pnpm-store",
					"--exclude=.yarn",
					"--exclude=.npm",
					"--exclude=.git",
					"--exclude=.next",
					"--exclude=dist",
					"--exclude=build",
					"--exclude=out",
					"--exclude=.turbo",
					"--exclude=.cache",
					"--exclude=.vite",
					"--exclude=.vercel",
					"--exclude=*.tar",
					"--exclude=*.tar.gz",
					"--exclude=*.tgz",
					"--exclude=*.zip",
					"--exclude=*.log",
					"--exclude=.DS_Store",
					"--exclude=coverage",
					"--delete",
					"/tmp/restored/",
					"/vercel/sandbox/",
				],
			});

			for await (const _log of rsyncCmd.logs()) {
				// Consume logs
			}

			if (rsyncCmd.exitCode !== 0) {
				return {
					success: false,
					error: { message: "Failed to apply version changes" },
				};
			}

			// If package.json or pnpm-lock.yaml changed, reinstall dependencies
			if (packageJsonChanged || pnpmLockChanged) {
				console.log(
					"[revertToVersionTool] Dependencies changed, reinstalling...",
				);

				const reinstallCmd = await instance.runCommand({
					cmd: "pnpm",
					args: ["install", "--loglevel", "info"],
					cwd: "/vercel/sandbox",
				});

				for await (const _log of reinstallCmd.logs()) {
					// Consume logs
				}

				if (reinstallCmd.exitCode !== 0) {
					console.warn(
						"[revertToVersionTool] Warning: Failed to reinstall dependencies.",
					);
				} else {
					console.log(
						"[revertToVersionTool] Dependencies reinstalled successfully",
					);
				}
			} else {
				console.log(
					"[revertToVersionTool] No dependency changes, skipping reinstall",
				);
			}

			// Cleanup temp files
			await instance.runCommand({
				cmd: "rm",
				args: ["-rf", "/tmp/restore.tar.gz", "/tmp/restored"],
			});

			console.log(
				"[revertToVersionTool] Updating landing page version reference...",
			);

			// Update the landing page's current version to the reverted version and clear reverting state
			await ctx.runMutation(
				internal.collections.landingPages.mutations.updateInternal,
				{
					id: version.landingPageId,
					landingPageVersionId: versionId,
					revertingToVersionId: undefined,
				},
			);

			console.log("[revertToVersionTool] Revert complete!");

			return {
				success: true,
				error: null,
			};
		} catch (error) {
			console.error("[revertToVersionTool] Error:", error);

			// Clear reverting state on error
			try {
				const version = await ctx.runQuery(
					internal.collections.landingPages.versions.queries.getByIdInternal,
					{ id: versionId },
				);
				if (version) {
					await ctx.runMutation(
						internal.collections.landingPages.mutations.updateInternal,
						{
							id: version.landingPageId,
							revertingToVersionId: undefined,
						},
					);
				}
			} catch (clearError) {
				console.error(
					"[revertToVersionTool] Failed to clear reverting state:",
					clearError,
				);
			}

			return {
				success: false,
				error: {
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	},
});

// ============================================================================
// DESIGN MODE FILE PERSISTENCE
// ============================================================================

export const saveDesignModeChanges = internalAction({
	args: {
		sandboxId: v.id("sandboxes"),
		sessionId: v.id("agentSessions"),
		files: v.array(
			v.object({
				filePath: v.string(),
				content: v.string(),
			}),
		),
		changeIds: v.array(v.string()),
	},
	handler: async (
		ctx,
		{ sandboxId, sessionId, files, changeIds },
	): Promise<{
		success: boolean;
		savedChanges: string[];
		failedChanges: Array<{ id: string; error: string }>;
	}> => {
		console.log("[Design Mode] saveDesignModeChanges started (AST-based)", {
			sandboxId,
			sessionId,
			fileCount: files.length,
			changeIds,
		});

		const savedChanges: string[] = [];
		const failedChanges: Array<{ id: string; error: string }> = [];

		// Save all files using writeFilesTool (batch write)
		try {
			console.log(`[Design Mode] Saving ${files.length} files...`);
			console.log(
				"[Design Mode] Files to save:",
				files.map((f) => ({
					path: f.filePath,
					contentLength: f.content.length,
				})),
			);

			// Log the actual content for debugging
			for (const file of files) {
				console.log(
					`[Design Mode] Content for ${file.filePath} (first 500 chars):`,
					file.content.substring(0, 500),
				);
			}

			const writeResult = await ctx.runAction(
				internal.collections.sandboxes.actions.writeFilesTool,
				{
					sandboxId,
					files: files.map((f) => ({
						path: f.filePath,
						content: f.content,
					})),
				},
			);

			console.log("[Design Mode] Write result:", writeResult);

			if (!writeResult.success) {
				console.error(
					"[Design Mode] Failed to write files:",
					writeResult.error,
				);
			} else {
				console.log("[Design Mode] Successfully saved all files");
			}
		} catch (error) {
			console.error("[Design Mode] Error saving files:", error);
		}

		// Mark all changes as saved
		for (const changeId of changeIds) {
			try {
				await ctx.runMutation(
					internal.collections.agentSessions.mutations.markChangeAsSaved,
					{
						sessionId,
						changeId,
					},
				);
				savedChanges.push(changeId);
			} catch (error) {
				failedChanges.push({
					id: changeId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		return {
			success: failedChanges.length === 0,
			savedChanges,
			failedChanges,
		};
	},
});

const readFileHelper = async (
	sandbox: Sandbox,
	filePath: string,
	cwd: string,
): Promise<{
	success: boolean;
	content: string | null;
	error: { message: string } | null;
}> => {
	try {
		const stream = await sandbox.readFile({
			path: filePath,
			cwd: cwd ?? "/vercel/sandbox",
		});
		if (!stream) {
			return {
				success: false,
				content: null,
				error: { message: `File not found: ${filePath}` },
			};
		}

		// Convert ReadableStream to string using async iteration
		const chunks: Uint8Array[] = [];

		try {
			// Try to use async iteration if available
			for await (const chunk of stream as AsyncIterable<Uint8Array>) {
				chunks.push(chunk);
			}
		} catch {
			// Fallback: try getReader if async iteration fails
			try {
				// @ts-expect-error - ReadableStream might have getReader
				const reader = stream.getReader();
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					if (value) chunks.push(value);
				}
			} catch (readerError) {
				return {
					success: false,
					content: null,
					error: {
						message: `Failed to read stream: ${readerError instanceof Error ? readerError.message : String(readerError)}`,
					},
				};
			}
		}

		const content = Buffer.concat(chunks).toString("utf-8");

		return {
			success: true,
			content,
			error: null,
		};
	} catch (error) {
		return {
			success: false,
			content: null,
			error: {
				message: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
			},
		};
	}
};

/**
 * Read file from sandbox for design mode (public action wrapper)
 */
export const readFileForDesignMode = action({
	args: {
		sandboxId: v.id("sandboxes"),
		filePath: v.string(),
	},
	handler: async (
		ctx,
		{ sandboxId, filePath },
	): Promise<{
		success: boolean;
		content: string | null;
		error: { message: string } | null;
	}> => {
		const user = await ctx.runQuery(
			internal.collections.users.queries.getCurrentUserInternal,
			{},
		);
		if (!user) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		const sandbox = await ctx.runQuery(
			internal.collections.sandboxes.queries.getByIdInternal,
			{ id: sandboxId },
		);
		if (!sandbox) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		try {
			const credentials = getCredentials();
			const instance = await SandboxClass.get({
				sandboxId: sandbox.sandboxExternalId,
				...credentials,
			});

			return await readFileHelper(instance, filePath, sandbox.cwd);
		} catch (error) {
			return {
				success: false,
				content: null,
				error: {
					message: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
				},
			};
		}
	},
});

/**
 * Get initial theme from sandbox files
 * Reads tailwind.config.js and src/index.css to extract theme configuration
 */
export const getInitialThemeFromSandboxInternal = internalAction({
	args: {
		sessionId: v.id("agentSessions"),
		sandboxId: v.id("sandboxes"),
	},
	handler: async (ctx, { sessionId, sandboxId }) => {
		const sandbox = await ctx.runQuery(
			internal.collections.sandboxes.queries.getByIdInternal,
			{
				id: sandboxId,
			},
		);

		if (!sandbox) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (sandbox.status !== "running") {
			throw new ConvexError("Sandbox is not running.");
		}

		try {
			const credentials = getCredentials();
			const instance = await SandboxClass.get({
				sandboxId: sandbox.sandboxExternalId,
				...credentials,
			});

			const configResultPromise = readFileHelper(
				instance,
				"tailwind.config.js",
				sandbox.cwd,
			);
			const cssResultPromise = readFileHelper(
				instance,
				"src/index.css",
				sandbox.cwd,
			);

			const [configResult, cssResult] = await Promise.allSettled([
				configResultPromise,
				cssResultPromise,
			]);

			if (
				configResult.status === "rejected" ||
				cssResult.status === "rejected" ||
				!configResult.value.success ||
				!cssResult.value.success
			) {
				throw new ConvexError(
					configResult.status === "fulfilled"
						? configResult.value.error?.message
						: configResult.reason ||
								(cssResult.status === "fulfilled"
									? cssResult.value.error?.message
									: cssResult.reason) ||
								"Failed to read theme files",
				);
			}

			// Parse theme from files
			const theme = parseThemeFromFiles(
				configResult.value.content || "",
				cssResult.value.content || "",
			);

			// Initialize theme state with mutation
			await ctx.runMutation(
				internal.collections.agentSessions.mutations.initializeTheme,
				{
					sessionId,
					theme,
				},
			);

			return { success: true, theme };
		} catch (error) {
			// Set error status
			await ctx.runMutation(
				internal.collections.agentSessions.mutations.setThemeStatus,
				{
					sessionId,
					status: "error",
					error:
						error instanceof Error ? error.message : "Unknown error occurred",
				},
			);

			return {
				success: false,
				error:
					error instanceof Error ? error.message : "Unknown error occurred",
			};
		}
	},
});

/**
 * Parse theme from tailwind.config.js and index.css files
 * Extracts fonts and theme variables
 */
function parseThemeFromFiles(
	_tailwindConfig: string,
	indexCss: string,
): {
	fonts: { sans: string; serif: string; mono: string };
	lightTheme: {
		background: string;
		foreground: string;
		muted: string;
		mutedForeground: string;
		popover: string;
		popoverForeground: string;
		border: string;
		input: string;
		card: string;
		cardForeground: string;
		primary: string;
		primaryForeground: string;
		secondary: string;
		secondaryForeground: string;
		accent: string;
		accentForeground: string;
		destructive: string;
		destructiveForeground: string;
		ring: string;
		chart1: string;
		chart2: string;
		chart3: string;
		chart4: string;
		chart5: string;
		radius: string;
	};
	darkTheme: {
		background: string;
		foreground: string;
		muted: string;
		mutedForeground: string;
		popover: string;
		popoverForeground: string;
		border: string;
		input: string;
		card: string;
		cardForeground: string;
		primary: string;
		primaryForeground: string;
		secondary: string;
		secondaryForeground: string;
		accent: string;
		accentForeground: string;
		destructive: string;
		destructiveForeground: string;
		ring: string;
		chart1: string;
		chart2: string;
		chart3: string;
		chart4: string;
		chart5: string;
	};
} {
	console.log("[parseThemeFromFiles] Parsing theme from files");
	console.log(
		"[parseThemeFromFiles] CSS content preview:",
		indexCss.slice(0, 500),
	);

	// Extract font CSS variables from :root (separate from theme colors)
	const fonts = {
		sans: "Inter",
		serif: "Georgia",
		mono: "JetBrains Mono",
	};

	// Extract CSS variables from :root for light theme
	const lightTheme: Record<string, string> = {};
	const rootMatch = indexCss.match(/:root\s*\{([\s\S]+?)\}/);
	console.log("[parseThemeFromFiles] :root match found:", !!rootMatch);
	if (rootMatch?.[1]) {
		const rootVars = rootMatch[1];
		console.log(
			"[parseThemeFromFiles] Root vars extracted:",
			rootVars.slice(0, 300),
		);
		const varMatches = rootVars.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g);
		for (const match of varMatches) {
			if (match[1] && match[2]) {
				const cssVarName = match[1];
				const value = match[2].trim();

				// Extract fonts separately (skip them from lightTheme)
				if (cssVarName === "font-sans") {
					console.log("[parseThemeFromFiles] Found font-sans:", value);
					fonts.sans = value.replace(/['"]/g, "");
					continue;
				}
				if (cssVarName === "font-serif") {
					console.log("[parseThemeFromFiles] Found font-serif:", value);
					fonts.serif = value.replace(/['"]/g, "");
					continue;
				}
				if (cssVarName === "font-mono") {
					console.log("[parseThemeFromFiles] Found font-mono:", value);
					fonts.mono = value.replace(/['"]/g, "");
					continue;
				}

				// Convert kebab-case to camelCase (chart-1 -> chart1, muted-foreground -> mutedForeground)
				const varName = cssVarName
					.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
					.replace(/-/g, ""); // Remove remaining hyphens (for chart-1 -> chart1)

				lightTheme[varName] = value;
			}
		}
	}

	// Extract CSS variables from .dark for dark theme
	const darkTheme: Record<string, string> = {};
	const darkMatch = indexCss.match(/\.dark\s*\{([\s\S]+?)\}/);
	if (darkMatch?.[1]) {
		const darkVars = darkMatch[1];
		const varMatches = darkVars.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g);
		for (const match of varMatches) {
			if (match[1] && match[2]) {
				// Convert kebab-case to camelCase (chart-1 -> chart1, muted-foreground -> mutedForeground)
				const varName = match[1]
					.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
					.replace(/-/g, ""); // Remove remaining hyphens (for chart-1 -> chart1)
				const value = match[2].trim();
				darkTheme[varName] = value;
			}
		}
	}

	// NOTE: We no longer parse fonts from tailwind.config.js
	// The config uses CSS variables: sans: ["var(--font-sans)", "sans-serif"]
	// We already extracted the actual font names from CSS variables above (--font-sans: "Inter")

	// Define default theme with all required fields
	const defaultLightTheme = {
		background: "0 0% 100%",
		foreground: "240 10% 3.9%",
		muted: "240 4.8% 95.9%",
		mutedForeground: "240 3.8% 46.1%",
		popover: "0 0% 100%",
		popoverForeground: "240 10% 3.9%",
		border: "240 5.9% 90%",
		input: "240 5.9% 90%",
		card: "0 0% 100%",
		cardForeground: "240 10% 3.9%",
		primary: "240 5.9% 10%",
		primaryForeground: "0 0% 98%",
		secondary: "240 4.8% 95.9%",
		secondaryForeground: "240 5.9% 10%",
		accent: "240 4.8% 95.9%",
		accentForeground: "240 5.9% 10%",
		destructive: "0 84.2% 60.2%",
		destructiveForeground: "0 0% 98%",
		ring: "240 5.9% 10%",
		chart1: "12 76% 61%",
		chart2: "173 58% 39%",
		chart3: "197 37% 24%",
		chart4: "43 74% 66%",
		chart5: "27 87% 67%",
		radius: "0.5rem",
	};

	const defaultDarkTheme = {
		background: "240 10% 3.9%",
		foreground: "0 0% 98%",
		muted: "240 3.7% 15.9%",
		mutedForeground: "240 5% 64.9%",
		popover: "240 10% 3.9%",
		popoverForeground: "0 0% 98%",
		border: "240 3.7% 15.9%",
		input: "240 3.7% 15.9%",
		card: "240 10% 3.9%",
		cardForeground: "0 0% 98%",
		primary: "0 0% 98%",
		primaryForeground: "240 5.9% 10%",
		secondary: "240 3.7% 15.9%",
		secondaryForeground: "0 0% 98%",
		accent: "240 3.7% 15.9%",
		accentForeground: "0 0% 98%",
		destructive: "0 62.8% 30.6%",
		destructiveForeground: "0 0% 98%",
		ring: "240 4.9% 83.9%",
		chart1: "220 70% 50%",
		chart2: "160 60% 45%",
		chart3: "30 80% 55%",
		chart4: "280 65% 60%",
		chart5: "340 75% 55%",
	};

	// Merge parsed values with defaults (parsed values override defaults)
	return {
		fonts,
		lightTheme: {
			...defaultLightTheme,
			...lightTheme,
		} as typeof defaultLightTheme,
		darkTheme: {
			...defaultDarkTheme,
			...darkTheme,
		} as typeof defaultDarkTheme,
	};
}
