import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import type { Sandbox } from "@vercel/sandbox";
import { Sandbox as SandboxClass } from "@vercel/sandbox";
import { config } from "dotenv";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import {
	getEnv,
	getServiceToken,
	getVercelCredentials,
	getWebhookConfig,
} from "./helpers";
import { registerMonitorSchema, stopMonitorSchema } from "./schemas";
import type { LogEntry, MonitoredCommand, SandboxMonitor } from "./types";

// Load .env from the correct location
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

// ============================================================================
// Environment Variables Validation
// ============================================================================

console.log("[Startup] Checking environment variables...");
console.log({
	CONVEX_SITE_URL: process.env.CONVEX_SITE_URL
		? `set (${process.env.CONVEX_SITE_URL.length} chars)`
		: "MISSING",
	SANDBOX_LOGGER_WEBHOOK_SECRET: process.env.SANDBOX_LOGGER_WEBHOOK_SECRET
		? `set (${process.env.SANDBOX_LOGGER_WEBHOOK_SECRET.length} chars)`
		: "MISSING",
	SANDBOX_LOGGER_SERVICE_TOKEN: process.env.SANDBOX_LOGGER_SERVICE_TOKEN
		? `set (${process.env.SANDBOX_LOGGER_SERVICE_TOKEN.length} chars)`
		: "MISSING",
	VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID ? "set" : "MISSING",
	VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID ? "set" : "MISSING",
	VERCEL_TOKEN: process.env.VERCEL_TOKEN ? "set" : "MISSING",
});

const PORT = getEnv("PORT", "3000");
const ALLOWED_ORIGINS = getEnv(
	"ALLOWED_ORIGINS",
	"http://localhost:3000,https://app.firebuzz.dev",
).split(",");

// ============================================================================
// Connection Management
// ============================================================================

const activeConnections = new Map<string, AbortController>();
const monitoredCommands = new Map<string, MonitoredCommand>();
const sandboxMonitors = new Map<string, SandboxMonitor>();

// ============================================================================
// Sandbox Health Monitoring
// ============================================================================

const HEALTH_CHECK_INTERVAL = 10000; // 10 seconds

// ============================================================================
// Error Detection
// ============================================================================

const ERROR_PATTERNS = [
	/Error:/i,
	/TypeError:/i,
	/ReferenceError:/i,
	/SyntaxError:/i,
	/Module not found/i,
	/Cannot find module/i,
	/Failed to resolve import/i,
	/Failed to load/i,
	/Unexpected token/i,
	/is not defined/i,
	/\[plugin:.*?\]\s+/i, // Vite plugin errors like [plugin:vite:import-analysis]
	/\s+at\s+.*:\d+:\d+/, // Stack trace line
	/ENOENT/i, // File not found errors
	/ENOTDIR/i, // Not a directory errors
	/Parse error/i,
	/Compilation failed/i,
];

interface ErrorInfo {
	errorHash: string;
	errorMessage: string;
}

/**
 * Detect error patterns in logs and generate hash for deduplication
 */
function detectAndHashError(logData: string): ErrorInfo | null {
	// Check if log contains error patterns
	const hasError = ERROR_PATTERNS.some((pattern) => pattern.test(logData));
	if (!hasError) return null;

	// Use the raw log data as error message
	const errorMessage = logData.trim();

	// Generate MD5 hash for deduplication
	const errorHash = createHash("md5").update(errorMessage).digest("hex");

	return { errorHash, errorMessage };
}

/**
 * Send error to Convex for analysis
 */
async function sendErrorToConvex(
	sandboxId: string,
	errorInfo: ErrorInfo,
): Promise<void> {
	try {
		const { url: convexSiteUrl, token: webhookToken } = getWebhookConfig();
		const webhookUrl = `${convexSiteUrl}/sandbox/dev-server-error`;

		console.log(
			`[Error] Sending error to Convex: ${sandboxId} - ${errorInfo.errorHash.substring(0, 8)}...`,
		);

		const sendStart = Date.now();
		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${webhookToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				sandboxId,
				errorHash: errorInfo.errorHash,
				errorMessage: errorInfo.errorMessage,
			}),
			signal: AbortSignal.timeout(5000),
		});

		const duration = Date.now() - sendStart;
		if (response.ok) {
			console.log(
				`[Error] Successfully sent error to Convex: ${sandboxId} - ${errorInfo.errorHash.substring(0, 8)}... (${duration}ms)`,
			);
		} else {
			console.warn(
				`[Error] Convex returned ${response.status} for error ${errorInfo.errorHash.substring(0, 8)}... (${duration}ms)`,
			);
		}
	} catch (error) {
		console.error(
			"[Error] Failed to send error to Convex:",
			error instanceof Error ? error.message : error,
		);
	}
}

/**
 * Notify Convex that a sandbox has closed
 */
async function notifyConvexSandboxClosed(sandboxId: string): Promise<void> {
	try {
		const { url: convexSiteUrl, token: webhookToken } = getWebhookConfig();
		const webhookUrl = `${convexSiteUrl}/sandbox/closed`;

		await fetch(webhookUrl, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${webhookToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				sandboxId,
				closedAt: new Date().toISOString(),
			}),
			signal: AbortSignal.timeout(5000),
		});

		console.log(`[Sandbox] Notified Convex that sandbox ${sandboxId} closed`);
	} catch (error) {
		console.error(
			`[Sandbox] Failed to notify Convex about sandbox ${sandboxId} closure:`,
			error,
		);
	}
}

/**
 * Check if sandbox is still alive
 */
async function checkSandboxHealth(sandboxId: string): Promise<boolean> {
	try {
		const credentials = getVercelCredentials();
		await SandboxClass.get({ sandboxId, ...credentials });
		return true;
	} catch (_error) {
		console.log(`[Sandbox] Sandbox ${sandboxId} is no longer available`);
		return false;
	}
}

/**
 * Stop all monitoring for a sandbox
 */
function stopSandboxMonitoring(sandboxId: string): void {
	const monitor = sandboxMonitors.get(sandboxId);

	if (monitor) {
		clearInterval(monitor.healthCheckInterval);

		// Stop all command monitors for this sandbox
		for (const cmdId of monitor.commandMonitors) {
			const key = `${sandboxId}-${cmdId}`;
			const commandMonitor = monitoredCommands.get(key);
			if (commandMonitor) {
				commandMonitor.abortController.abort();
				monitoredCommands.delete(key);
			}
		}

		sandboxMonitors.delete(sandboxId);
		console.log(`[Sandbox] Stopped monitoring sandbox ${sandboxId}`);
	}
}

/**
 * Start monitoring sandbox health
 */
async function startSandboxMonitoring(sandboxId: string): Promise<void> {
	// Don't start if already monitoring
	if (sandboxMonitors.has(sandboxId)) {
		const monitor = sandboxMonitors.get(sandboxId)!;
		monitor.lastActivity = Date.now();
		return;
	}

	console.log(`[Sandbox] Starting health monitoring for ${sandboxId}`);

	const healthCheckInterval = setInterval(async () => {
		const isAlive = await checkSandboxHealth(sandboxId);

		if (!isAlive) {
			// Sandbox is dead
			clearInterval(healthCheckInterval);
			await notifyConvexSandboxClosed(sandboxId);
			stopSandboxMonitoring(sandboxId);
		} else {
			// Update last activity
			const monitor = sandboxMonitors.get(sandboxId);
			if (monitor) {
				monitor.lastActivity = Date.now();
			}
		}
	}, HEALTH_CHECK_INTERVAL);

	sandboxMonitors.set(sandboxId, {
		sandboxId,
		healthCheckInterval,
		commandMonitors: new Set(),
		lastActivity: Date.now(),
	});
}

/**
 * Handle command exit - do immediate health check for critical commands
 */
async function handleCommandExit(
	sandboxId: string,
	commandType: string,
	exitCode: number | undefined,
): Promise<void> {
	// If dev/build command exits with non-zero, check sandbox immediately
	if ((commandType === "dev" || commandType === "build") && exitCode !== 0) {
		console.log(
			`[Sandbox] ${commandType} command exited with code ${exitCode}, checking sandbox health...`,
		);

		const isAlive = await checkSandboxHealth(sandboxId);

		if (!isAlive) {
			await notifyConvexSandboxClosed(sandboxId);
			stopSandboxMonitoring(sandboxId);
		}
	}
}

// ============================================================================
// Log Monitoring
// ============================================================================

/**
 * Start monitoring a command and push logs to webhook
 */
async function startMonitoring(
	sandboxId: string,
	cmdId: string,
	commandType: "install" | "dev" | "build" | "typecheck" | "other" = "other",
): Promise<void> {
	const key = `${sandboxId}-${cmdId}`;

	// Stop existing monitoring if any
	if (monitoredCommands.has(key)) {
		console.log(`[Monitor] Stopping existing monitor for ${key}`);
		const existing = monitoredCommands.get(key);
		existing?.abortController.abort();
		monitoredCommands.delete(key);
	}

	const abortController = new AbortController();
	monitoredCommands.set(key, {
		sandboxId,
		cmdId,
		commandType,
		abortController,
	});

	// Start sandbox health monitoring if not already started
	await startSandboxMonitoring(sandboxId);

	// Register this command with the sandbox monitor
	const sandboxMonitor = sandboxMonitors.get(sandboxId);
	if (sandboxMonitor) {
		sandboxMonitor.commandMonitors.add(cmdId);
	}

	// Get webhook config from ENV
	const { url: convexSiteUrl, token: webhookToken } = getWebhookConfig();
	const webhookUrl = `${convexSiteUrl}/sandbox/stream-logs`;

	console.log(
		`[Monitor] Starting log monitoring for ${key} (type: ${commandType})`,
	);
	console.log(`[Monitor] Webhook: ${webhookUrl}`);

	try {
		const credentials = getVercelCredentials();

		// Try to get sandbox - if it fails, sandbox is gone
		let sandbox: Sandbox;
		try {
			console.log(`[Monitor] Fetching sandbox ${sandboxId}...`);
			const sandboxFetchStart = Date.now();
			sandbox = await SandboxClass.get({ sandboxId, ...credentials });
			console.log(
				`[Monitor] Sandbox ${sandboxId} fetched (${Date.now() - sandboxFetchStart}ms)`,
			);
		} catch (error) {
			console.error(
				`[Monitor] Sandbox ${sandboxId} not found or stopped:`,
				error instanceof Error ? error.message : error,
			);

			// Notify Convex that sandbox is gone
			try {
				await fetch(webhookUrl, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${webhookToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						cmdId,
						status: "error",
						error: "Sandbox stopped or not found",
					}),
					signal: AbortSignal.timeout(5000),
				});
			} catch {
				// Ignore webhook errors
			}

			monitoredCommands.delete(key);
			return;
		}

		console.log(`[Monitor] Fetching command ${cmdId} from sandbox...`);
		const command = await sandbox.getCommand(cmdId);

		if (!command) {
			console.error(`[Monitor] Command ${cmdId} not found in sandbox`);

			// Notify Convex that command is gone
			try {
				await fetch(webhookUrl, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${webhookToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						cmdId,
						status: "error",
						error: "Command not found",
					}),
					signal: AbortSignal.timeout(5000),
				});
			} catch {
				// Ignore webhook errors
			}

			monitoredCommands.delete(key);
			return;
		}

		console.log(
			`[Monitor] Command ${cmdId} found, starting log stream (command status: ${command.exitCode !== undefined ? "exited" : "running"})`,
		);

		// Batch logs before sending
		const LOG_BATCH_SIZE = 10;
		const LOG_BATCH_INTERVAL = 500; // ms
		let logBuffer: Array<{
			stream: "stdout" | "stderr";
			data: string;
			timestamp: string;
		}> = [];
		let lastSent = Date.now();
		let isFlushingInProgress = false;

		const flushLogs = async () => {
			if (logBuffer.length === 0 || isFlushingInProgress) return;

			isFlushingInProgress = true;
			const logsToSend = [...logBuffer];
			logBuffer = [];

			const startTime = Date.now();
			console.log(
				`[Monitor] Flushing ${logsToSend.length} logs for ${key} (buffer size: ${JSON.stringify({ cmdId, logCount: logsToSend.length }).length} bytes)`,
			);

			try {
				const response = await fetch(webhookUrl, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${webhookToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						cmdId,
						logs: logsToSend,
					}),
					signal: AbortSignal.timeout(5000),
				});

				const duration = Date.now() - startTime;
				if (!response.ok) {
					console.warn(
						`[Monitor] Webhook returned ${response.status} for ${key} (${duration}ms)`,
					);
				} else {
					console.log(
						`[Monitor] Successfully sent ${logsToSend.length} logs for ${key} (${duration}ms)`,
					);
				}
			} catch (error) {
				const duration = Date.now() - startTime;
				// Handle network errors gracefully - these are transient and expected
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				const errorName = error instanceof Error ? error.name : "UnknownError";

				if (
					errorMessage.includes("terminated") ||
					errorMessage.includes("UND_ERR_SOCKET") ||
					errorMessage.includes("ECONNRESET")
				) {
					console.log(
						`[Monitor] Transient network error (${errorName}) for ${key} after ${duration}ms, will retry on next batch. Logs in batch: ${logsToSend.length}`,
					);
					// Put logs back in buffer to retry
					logBuffer.unshift(...logsToSend);
				} else {
					console.error(
						`[Monitor] Failed to send logs for ${key} after ${duration}ms:`,
						{
							errorName,
							errorMessage,
							logCount: logsToSend.length,
						},
					);
				}
			} finally {
				isFlushingInProgress = false;
			}
		};

		// Setup periodic flush - runs async, doesn't block stream
		const flushInterval = setInterval(() => {
			if (Date.now() - lastSent >= LOG_BATCH_INTERVAL) {
				// Fire and forget - don't await
				flushLogs().catch(console.error);
				lastSent = Date.now();
			}
		}, LOG_BATCH_INTERVAL);

		console.log(`[Monitor] Opening log stream for ${key}...`);
		const stream = command.logs({
			signal: abortController.signal,
		});

		let chunkCount = 0;
		let lastChunkTime = Date.now();

		try {
			for await (const chunk of stream) {
				if (abortController.signal.aborted) {
					console.log(
						`[Monitor] Stream aborted for ${key} at chunk ${chunkCount}`,
					);
					break;
				}

				chunkCount++;
				lastChunkTime = Date.now();

				// Detect errors in stderr for dev commands
				if (chunk.stream === "stderr" && commandType === "dev") {
					const errorInfo = detectAndHashError(chunk.data);
					if (errorInfo) {
						console.log(
							`[Error] Detected error in ${sandboxId}: ${errorInfo.errorHash.substring(0, 8)}... (chunk #${chunkCount})`,
						);
						console.log(
							`[Error] Error preview: ${errorInfo.errorMessage.substring(0, 200)}${errorInfo.errorMessage.length > 200 ? "..." : ""}`,
						);
						// Send to Convex asynchronously (don't block log streaming)
						const errorSendStart = Date.now();
						sendErrorToConvex(sandboxId, errorInfo)
							.then(() => {
								console.log(
									`[Error] Sent error to Convex (${Date.now() - errorSendStart}ms)`,
								);
							})
							.catch((error) => {
								console.error(
									`[Error] Failed to send error to Convex after ${Date.now() - errorSendStart}ms:`,
									error instanceof Error ? error.message : error,
								);
							});
					}
				}

				logBuffer.push({
					stream: chunk.stream,
					data: chunk.data,
					timestamp: new Date().toISOString(),
				});

				// Don't await flush - let it run async to avoid blocking stream
				if (logBuffer.length >= LOG_BATCH_SIZE && !isFlushingInProgress) {
					console.log(
						`[Monitor] Batch size reached (${LOG_BATCH_SIZE}), triggering flush for ${key}`,
					);
					flushLogs().catch(console.error);
					lastSent = Date.now();
				}
			}

			console.log(
				`[Monitor] Stream ended normally for ${key} after ${chunkCount} chunks. Buffer has ${logBuffer.length} remaining logs`,
			);
		} catch (streamError) {
			const timeSinceLastChunk = Date.now() - lastChunkTime;
			console.error(
				`[Monitor] Stream error for ${key} after ${chunkCount} chunks (${timeSinceLastChunk}ms since last chunk):`,
				streamError instanceof Error
					? `${streamError.name}: ${streamError.message}`
					: streamError,
			);

			// Check if sandbox/command still exists
			try {
				const checkSandbox = await SandboxClass.get({
					sandboxId,
					...credentials,
				});
				const checkCommand = await checkSandbox.getCommand(cmdId);

				if (!checkCommand) {
					console.log(
						`[Monitor] Command ${cmdId} no longer exists after stream error`,
					);
				} else {
					console.log(
						`[Monitor] Command ${cmdId} still exists after stream error (exitCode: ${checkCommand.exitCode})`,
					);
				}
			} catch (checkError) {
				console.error(
					`[Monitor] Failed to verify command/sandbox after stream error:`,
					checkError instanceof Error ? checkError.message : checkError,
				);
			}

			// Flush any remaining logs before handling the error
			if (logBuffer.length > 0) {
				console.log(
					`[Monitor] Flushing ${logBuffer.length} remaining logs after stream error`,
				);
				await flushLogs();
			}

			// Re-throw to be handled by outer catch
			throw streamError;
		}

		// Final flush
		clearInterval(flushInterval);
		console.log(`[Monitor] Performing final flush for ${key}`);
		await flushLogs();

		// Check if command actually exited (vs still running)
		console.log(`[Monitor] Checking final command state for ${key}`);
		const finalCommand = await sandbox.getCommand(cmdId);
		const exitCode = finalCommand?.exitCode ?? undefined;

		// Only send completion status if command actually exited
		// Dev servers can have errors in stderr but still be running
		if (exitCode !== undefined) {
			const status = exitCode === 0 ? "completed" : "error";

			console.log(
				`[Monitor] Command ${cmdId} finished with status: ${status}, exitCode: ${exitCode}`,
			);

			// Handle command exit and check sandbox health
			await handleCommandExit(sandboxId, commandType, exitCode);

			// Send completion status
			try {
				const statusSendStart = Date.now();
				const response = await fetch(webhookUrl, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${webhookToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						cmdId,
						status,
						exitCode,
					}),
					signal: AbortSignal.timeout(5000),
				});

				console.log(
					`[Monitor] Sent completion status for ${key} (${Date.now() - statusSendStart}ms, response: ${response.status})`,
				);
			} catch (error) {
				console.error(
					`[Monitor] Failed to send completion for ${key}:`,
					error instanceof Error ? error.message : error,
				);
			}
		} else {
			console.log(
				`[Monitor] Command ${cmdId} still running (no exit code), will continue monitoring`,
			);
		}

		// Clean up command monitor
		monitoredCommands.delete(key);

		// Remove from sandbox monitor
		const sandboxMonitor = sandboxMonitors.get(sandboxId);
		if (sandboxMonitor) {
			sandboxMonitor.commandMonitors.delete(cmdId);

			// If no more commands, stop sandbox monitoring after a delay
			if (sandboxMonitor.commandMonitors.size === 0) {
				console.log(
					`[Sandbox] No more commands for ${sandboxId}, will stop monitoring in 30s if no new commands`,
				);
				setTimeout(() => {
					const currentMonitor = sandboxMonitors.get(sandboxId);
					if (currentMonitor && currentMonitor.commandMonitors.size === 0) {
						stopSandboxMonitoring(sandboxId);
					}
				}, 30000); // 30 second grace period
			}
		}
	} catch (error) {
		const errorName = error instanceof Error ? error.name : "UnknownError";
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";

		if (errorName === "AbortError") {
			console.log(`[Monitor] Monitoring aborted for ${key}`);
		} else if (
			errorMessage.includes("terminated") ||
			errorMessage.includes("UND_ERR_SOCKET") ||
			errorMessage.includes("ECONNRESET")
		) {
			// Vercel sandbox stream connection error - this is somewhat expected
			console.log(
				`[Monitor] Vercel sandbox stream connection closed for ${key} (${errorName}: ${errorMessage})`,
			);
			console.log(
				`[Monitor] This is likely due to Vercel's streaming API timeout or network issue`,
			);

			// Don't notify Convex of error - the command may still be running
			// The health check will detect if sandbox is actually dead
		} else {
			console.error(
				`[Monitor] Unexpected error monitoring ${key}: ${errorName} - ${errorMessage}`,
			);

			// Notify Convex of error only for unexpected errors
			try {
				const { url: convexSiteUrl, token: webhookToken } = getWebhookConfig();
				const webhookUrl = `${convexSiteUrl}/sandbox/stream-logs`;
				await fetch(webhookUrl, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${webhookToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						cmdId,
						status: "error",
						error: errorMessage,
					}),
					signal: AbortSignal.timeout(5000),
				});
				console.log(`[Monitor] Notified Convex of error for ${key}`);
			} catch (notifyError) {
				console.error(
					`[Monitor] Failed to notify Convex of error:`,
					notifyError instanceof Error ? notifyError.message : notifyError,
				);
			}
		}

		// Clean up command monitor
		console.log(`[Monitor] Cleaning up monitor for ${key}`);
		monitoredCommands.delete(key);

		// Remove from sandbox monitor
		const sandboxMonitor = sandboxMonitors.get(sandboxId);
		if (sandboxMonitor) {
			sandboxMonitor.commandMonitors.delete(cmdId);
			console.log(
				`[Monitor] Removed ${cmdId} from sandbox monitor (${sandboxMonitor.commandMonitors.size} commands remaining)`,
			);
		}
	}
}

// ============================================================================
// HTTP Server
// ============================================================================

const app = new Hono();

// CORS middleware
app.use(
	"*",
	cors({
		origin: (origin) => {
			if (!origin) return null;
			if (ALLOWED_ORIGINS.includes(origin)) return origin;
			if (origin.endsWith(".firebuzz.dev")) return origin;
			return null;
		},
		credentials: true,
	}),
);

// Health check
app.get("/", (c) => {
	return c.json({
		status: "healthy",
		uptime: process.uptime(),
		activeConnections: activeConnections.size,
		monitoredCommands: monitoredCommands.size,
	});
});

/**
 * Get real-time logs for a command
 *
 * GET /logs/:sandboxId/:cmdId
 * Headers:
 *   - Authorization: Bearer <SERVICE_TOKEN>
 */
app.get("/logs/:sandboxId/:cmdId", async (c) => {
	const { sandboxId, cmdId } = c.req.param();

	// Authentication
	const serviceToken = getServiceToken();
	const authHeader = c.req.header("Authorization");
	if (!authHeader || authHeader !== `Bearer ${serviceToken}`) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const connectionId = `${sandboxId}-${cmdId}-${Date.now()}`;

	// Set up SSE headers
	c.header("Content-Type", "text/event-stream");
	c.header("Cache-Control", "no-cache");
	c.header("Connection", "keep-alive");

	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();
			const abortController = new AbortController();
			activeConnections.set(connectionId, abortController);

			const sendEvent = (data: LogEntry) => {
				const message = `data: ${JSON.stringify(data)}\n\n`;
				controller.enqueue(encoder.encode(message));
			};

			try {
				const credentials = getVercelCredentials();

				sendEvent({
					type: "connected",
					timestamp: Date.now(),
					sandboxId,
					cmdId,
				});

				const sandbox = await SandboxClass.get({ sandboxId, ...credentials });
				const command = await sandbox.getCommand(cmdId);

				if (!command) {
					sendEvent({
						type: "error",
						error: "Command not found",
						timestamp: Date.now(),
					});
					controller.close();
					activeConnections.delete(connectionId);
					return;
				}

				const logStream = command.logs({
					signal: abortController.signal,
				});

				for await (const chunk of logStream) {
					if (abortController.signal.aborted) break;

					sendEvent({
						type: "log",
						stream: chunk.stream,
						data: chunk.data,
						timestamp: Date.now(),
					});
				}

				const exitCode = command.exitCode;
				sendEvent({
					type: "complete",
					exitCode: exitCode ?? undefined,
					timestamp: Date.now(),
				});

				controller.close();
				activeConnections.delete(connectionId);
			} catch (error) {
				if ((error as Error).name !== "AbortError") {
					sendEvent({
						type: "error",
						error: error instanceof Error ? error.message : "Unknown error",
						timestamp: Date.now(),
					});
				}
				controller.close();
				activeConnections.delete(connectionId);
			}
		},
		cancel() {
			const abortController = activeConnections.get(connectionId);
			abortController?.abort();
			activeConnections.delete(connectionId);
		},
	});

	return new Response(stream);
});

/**
 * Get monitor status
 *
 * GET /monitor/status/:sandboxId/:cmdId
 * Headers:
 *   - Authorization: Bearer <SERVICE_TOKEN>
 */
app.get("/monitor/status/:sandboxId/:cmdId", async (c) => {
	const { sandboxId, cmdId } = c.req.param();

	// Authentication
	const serviceToken = getServiceToken();
	const authHeader = c.req.header("Authorization");
	if (!authHeader || authHeader !== `Bearer ${serviceToken}`) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const key = `${sandboxId}-${cmdId}`;
	const isMonitored = monitoredCommands.has(key);

	return c.json({
		sandboxId,
		cmdId,
		isMonitored,
		monitoredCount: monitoredCommands.size,
	});
});

/**
 * Register a command for monitoring
 *
 * POST /monitor/register/:sandboxId/:cmdId
 * Headers:
 *   - Authorization: Bearer <SERVICE_TOKEN>
 */
app.post("/monitor/register/:sandboxId/:cmdId", async (c) => {
	// Authentication
	const serviceToken = getServiceToken();
	const authHeader = c.req.header("Authorization");
	if (!authHeader || authHeader !== `Bearer ${serviceToken}`) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	try {
		const params = c.req.param();
		const query = c.req.query();

		// Merge params and query for validation
		const validated = registerMonitorSchema.parse({
			...params,
			commandType: query.commandType,
		});

		// Start monitoring in background (don't await)
		startMonitoring(
			validated.sandboxId,
			validated.cmdId,
			validated.commandType,
		).catch((error) => {
			console.error(
				`[Monitor] Failed to start monitoring for ${validated.sandboxId}/${validated.cmdId}:`,
				error,
			);
		});

		return c.json({
			success: true,
			message: `Started monitoring ${validated.sandboxId}/${validated.cmdId} (type: ${validated.commandType})`,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return c.json(
				{
					error: "Invalid payload",
					details: error.issues,
				},
				400,
			);
		}
		console.error("[Monitor] Registration error:", error);
		return c.json(
			{
				error: error instanceof Error ? error.message : "Registration failed",
			},
			500,
		);
	}
});

/**
 * Stop monitoring a command
 *
 * POST /monitor/cancel/:sandboxId/:cmdId
 * Headers:
 *   - Authorization: Bearer <SERVICE_TOKEN>
 */
app.post("/monitor/cancel/:sandboxId/:cmdId", async (c) => {
	// Authentication
	const serviceToken = getServiceToken();
	const authHeader = c.req.header("Authorization");
	if (!authHeader || authHeader !== `Bearer ${serviceToken}`) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	try {
		const params = c.req.param();
		const validated = stopMonitorSchema.parse(params);

		const key = `${validated.sandboxId}-${validated.cmdId}`;
		const monitor = monitoredCommands.get(key);

		if (!monitor) {
			return c.json(
				{
					error: "Monitor not found",
					sandboxId: validated.sandboxId,
					cmdId: validated.cmdId,
				},
				404,
			);
		}

		monitor.abortController.abort();
		monitoredCommands.delete(key);

		return c.json({
			success: true,
			message: `Stopped monitoring ${validated.sandboxId}/${validated.cmdId}`,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return c.json(
				{
					error: "Invalid payload",
					details: error.issues,
				},
				400,
			);
		}
		console.error("[Monitor] Stop error:", error);
		return c.json(
			{
				error: error instanceof Error ? error.message : "Stop failed",
			},
			500,
		);
	}
});

// Start server
serve(
	{
		fetch: app.fetch,
		port: Number.parseInt(PORT, 10),
	},
	(info) => {
		console.log(`🚀 Sandbox Logger running on http://localhost:${info.port}`);
		console.log(`📝 Allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
	},
);
