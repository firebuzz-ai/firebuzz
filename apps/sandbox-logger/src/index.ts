import { serve } from "@hono/node-server";
import type { Sandbox } from "@vercel/sandbox";
import { Sandbox as SandboxClass } from "@vercel/sandbox";
import { config } from "dotenv";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
  CONVEX_SITE_URL: process.env.CONVEX_SITE_URL ? `set (${process.env.CONVEX_SITE_URL.length} chars)` : "MISSING",
  SANDBOX_LOGGER_WEBHOOK_SECRET: process.env.SANDBOX_LOGGER_WEBHOOK_SECRET ? `set (${process.env.SANDBOX_LOGGER_WEBHOOK_SECRET.length} chars)` : "MISSING",
  SANDBOX_LOGGER_SERVICE_TOKEN: process.env.SANDBOX_LOGGER_SERVICE_TOKEN ? `set (${process.env.SANDBOX_LOGGER_SERVICE_TOKEN.length} chars)` : "MISSING",
  VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID ? "set" : "MISSING",
  VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID ? "set" : "MISSING",
  VERCEL_TOKEN: process.env.VERCEL_TOKEN ? "set" : "MISSING",
});

const PORT = getEnv("PORT", "3000");
const ALLOWED_ORIGINS = getEnv(
  "ALLOWED_ORIGINS",
  "http://localhost:3000,https://app.firebuzz.dev"
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
      error
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
  exitCode: number | undefined
): Promise<void> {
  // If dev/build command exits with non-zero, check sandbox immediately
  if ((commandType === "dev" || commandType === "build") && exitCode !== 0) {
    console.log(
      `[Sandbox] ${commandType} command exited with code ${exitCode}, checking sandbox health...`
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
  commandType: "install" | "dev" | "build" | "typecheck" | "other" = "other"
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
    `[Monitor] Starting log monitoring for ${key} (type: ${commandType})`
  );
  console.log(`[Monitor] Webhook: ${webhookUrl}`);

  try {
    const credentials = getVercelCredentials();

    // Try to get sandbox - if it fails, sandbox is gone
    let sandbox: Sandbox;
    try {
      sandbox = await SandboxClass.get({ sandboxId, ...credentials });
    } catch (error) {
      console.error(
        `[Monitor] Sandbox ${sandboxId} not found or stopped:`,
        error
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

    const command = await sandbox.getCommand(cmdId);

    if (!command) {
      console.error(`[Monitor] Command ${cmdId} not found`);

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

    // Batch logs before sending
    const LOG_BATCH_SIZE = 10;
    const LOG_BATCH_INTERVAL = 500; // ms
    let logBuffer: Array<{
      stream: "stdout" | "stderr";
      data: string;
      timestamp: string;
    }> = [];
    let lastSent = Date.now();

    const flushLogs = async () => {
      if (logBuffer.length === 0) return;

      const logsToSend = [...logBuffer];
      logBuffer = [];

      try {
        await fetch(webhookUrl, {
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
      } catch (error) {
        console.error(`[Monitor] Failed to send logs for ${key}:`, error);
      }
    };

    // Setup periodic flush
    const flushInterval = setInterval(() => {
      if (Date.now() - lastSent >= LOG_BATCH_INTERVAL) {
        flushLogs().catch(console.error);
        lastSent = Date.now();
      }
    }, LOG_BATCH_INTERVAL);

    const stream = command.logs({
      signal: abortController.signal,
    });

    for await (const chunk of stream) {
      if (abortController.signal.aborted) break;

      logBuffer.push({
        stream: chunk.stream,
        data: chunk.data,
        timestamp: new Date().toISOString(),
      });

      if (logBuffer.length >= LOG_BATCH_SIZE) {
        await flushLogs();
        lastSent = Date.now();
      }
    }

    // Final flush
    clearInterval(flushInterval);
    await flushLogs();

    // Check if command is done
    const finalCommand = await sandbox.getCommand(cmdId);
    const exitCode = finalCommand?.exitCode ?? undefined;
    const status = exitCode === 0 ? "completed" : "error";

    console.log(`[Monitor] Command ${cmdId} finished with status: ${status}`);

    // Handle command exit and check sandbox health
    await handleCommandExit(sandboxId, commandType, exitCode);

    // Send completion status
    try {
      await fetch(webhookUrl, {
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
    } catch (error) {
      console.error(`[Monitor] Failed to send completion for ${key}:`, error);
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
          `[Sandbox] No more commands for ${sandboxId}, will stop monitoring in 30s if no new commands`
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
    if ((error as Error).name === "AbortError") {
      console.log(`[Monitor] Monitoring aborted for ${key}`);
    } else {
      console.error(`[Monitor] Error monitoring ${key}:`, error);

      // Notify Convex of error
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
            error: error instanceof Error ? error.message : "Unknown error",
          }),
          signal: AbortSignal.timeout(5000),
        });
      } catch {
        // Ignore webhook errors
      }
    }

    // Clean up command monitor
    monitoredCommands.delete(key);

    // Remove from sandbox monitor
    const sandboxMonitor = sandboxMonitors.get(sandboxId);
    if (sandboxMonitor) {
      sandboxMonitor.commandMonitors.delete(cmdId);
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
  })
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
      validated.commandType
    ).catch((error) => {
      console.error(
        `[Monitor] Failed to start monitoring for ${validated.sandboxId}/${validated.cmdId}:`,
        error
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
        400
      );
    }
    console.error("[Monitor] Registration error:", error);
    return c.json(
      {
        error: error instanceof Error ? error.message : "Registration failed",
      },
      500
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
        404
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
        400
      );
    }
    console.error("[Monitor] Stop error:", error);
    return c.json(
      {
        error: error instanceof Error ? error.message : "Stop failed",
      },
      500
    );
  }
});

// Start server
serve(
  {
    fetch: app.fetch,
    port: Number.parseInt(PORT),
  },
  (info) => {
    console.log(`🚀 Sandbox Logger running on http://localhost:${info.port}`);
    console.log(`📝 Allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
  }
);
