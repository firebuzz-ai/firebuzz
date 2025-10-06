"use node";
import { sleep } from "@firebuzz/utils";
import type { Sandbox } from "@vercel/sandbox";
import { Sandbox as SandboxClass } from "@vercel/sandbox";
import { ConvexError, type Infer, v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { internalAction } from "../../_generated/server";
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
  commandType: "install" | "dev" | "build" | "typecheck" | "other" = "other"
): Promise<void> => {
  const sandboxLoggerUrl = process.env.SANDBOX_LOGGER_URL;
  const sandboxLoggerServiceToken = process.env.SANDBOX_LOGGER_SERVICE_TOKEN;

  if (!sandboxLoggerUrl || !sandboxLoggerServiceToken) {
    console.warn(
      "[registerMonitoring] Missing environment variables, skipping log monitoring"
    );
    console.warn(
      `[registerMonitoring] SANDBOX_LOGGER_URL: ${!!sandboxLoggerUrl}, SANDBOX_LOGGER_SERVICE_TOKEN: ${!!sandboxLoggerServiceToken}`
    );
    return;
  }

  try {
    const url = new URL(
      `/monitor/register/${sandboxId}/${cmdId}`,
      sandboxLoggerUrl
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
        `[registerMonitoring] Failed to register monitoring: ${error}`
      );
    } else {
      console.log(
        `[registerMonitoring] Successfully registered monitoring for ${sandboxId}/${cmdId} (type: ${commandType})`
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
  waitInterval: number
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
  config: Infer<typeof sandboxConfigSchema>
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
    }
  );

  // Update to session install cmdId
  await ctx.runMutation(
    internal.collections.sandboxes.mutations.updateCommandIdsInternal,
    { id: sandboxDbId, installCmdId: commandId }
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
      }
    );
  }

  if (install.exitCode !== 0) {
    //TODO: Append logs to command
    // Update command to failed
    await ctx.runMutation(
      internal.collections.sandboxes.commands.mutations.updateCommandStatus,
      { id: commandId, status: "failed", exitCode: install.exitCode }
    );
  }

  // Update command to completed
  await ctx.runMutation(
    internal.collections.sandboxes.commands.mutations.updateCommandStatus,
    { id: commandId, status: "completed", exitCode: 0 }
  );
};

// Helper to run dev command
const runDevCommand = async (
  sandbox: Sandbox,
  ctx: ActionCtx,
  sandboxDbId: Id<"sandboxes">,
  sessionDoc: Doc<"agentSessions">,
  config: Infer<typeof sandboxConfigSchema>
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
    }
  );

  // Update to Sandbox dev cmdId in DB
  await ctx.runMutation(
    internal.collections.sandboxes.mutations.updateCommandIdsInternal,
    { id: sandboxDbId, devCmdId: devCommandId }
  );

  // Register monitoring with sandbox-logger (webhook-based)
  await registerMonitoring(sandbox.sandboxId, dev.cmdId, "dev");

  // Wait for dev command to be ready
  await sleep(500);

  // Get preview URL
  const previewUrl = sandbox.domain(config.ports[0]);

  // Update preview URL in DB
  await ctx.runMutation(
    internal.collections.sandboxes.mutations.updatePreviewUrlInternal,
    {
      id: sandboxDbId,
      previewUrl,
    }
  );
};

// Helper to get existing sandbox
const getExistingSandbox = async (
  sandboxDbId: Id<"sandboxes">,
  credentials: Credentials,
  ctx: ActionCtx
): Promise<
  { sandbox: Sandbox; needsRecreation: false } | { needsRecreation: true }
> => {
  try {
    const sandboxDoc = await ctx.runQuery(
      internal.collections.sandboxes.queries.getByIdInternal,
      { id: sandboxDbId }
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
          }
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
        }
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
  config: Infer<typeof sandboxConfigSchema>
): Promise<{ sandbox: Sandbox; sandboxDbId: Id<"sandboxes"> }> => {
  // Get session details for workspace/project/campaign
  const session = await ctx.runQuery(
    internal.collections.agentSessions.queries.getByIdInternal,
    { id: sessionId }
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
    }
  );

  // Update agentSession with sandbox reference and mark creation as completed
  await ctx.runMutation(
    internal.collections.agentSessions.mutations.updateSandboxId,
    {
      sessionId,
      sandboxId: sandboxDbId,
    }
  );

  // Wait for sandbox to be ready
  const instance = await waitForSandbox(sandbox.sandboxId, credentials, 5, 500);

  if (instance.status !== "running") {
    await ctx.runMutation(
      internal.collections.sandboxes.mutations.killSandboxInternal,
      {
        id: sandboxDbId,
      }
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
    }
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
      })
    ),
  },
  handler: async (
    ctx,
    { sessionId, assetSettings, config }
  ): Promise<Id<"sandboxes">> => {
    const credentials = getCredentials();

    // First, check if the session already has a sandbox (race condition protection)
    const session = await ctx.runQuery(
      internal.collections.agentSessions.queries.getByIdInternal,
      { id: sessionId }
    );

    if (!session) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    if (session.status !== "active") {
      throw new ConvexError(
        "Session is closed. Please join or create a new session."
      );
    }

    // Get asset signed URL
    let signedUrl: string;
    let sandboxId: Id<"sandboxes"> | undefined = session.sandboxId;

    if (assetSettings.type === "landingPage") {
      const landingPage = await ctx.runQuery(
        internal.collections.landingPages.queries.getByIdWithSignedUrlInternal,
        { id: assetSettings.id }
      );
      if (!landingPage) {
        throw new ConvexError(ERRORS.NOT_FOUND);
      }
      signedUrl = landingPage.signedUrl;
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
            config
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
        config
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

/*
 * Recreate sandbox session
 * Called when a sandbox is closed during a session
 */
export const recreateSandboxSession = internalAction({
  args: {
    sessionId: v.id("agentSessions"),
    config: v.object(sandboxConfigSchema.fields),
  },
  handler: async (ctx, { sessionId, config }) => {
    const credentials = getCredentials();

    // First, check if the session already has a sandbox (race condition protection)
    const session = await ctx.runQuery(
      internal.collections.agentSessions.queries.getByIdInternal,
      { id: sessionId }
    );

    if (!session) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    if (session.status !== "active") {
      throw new ConvexError(
        "Session is closed. Please join or create a new session."
      );
    }

    const assetSettings =
      session.assetType === "landingPage"
        ? { type: "landingPage" as const, id: session.landingPageId }
        : { type: "form" as const, id: session.formId };

    // Get asset signed URL
    let signedUrl: string;

    if (assetSettings.type === "landingPage") {
      const landingPage = await ctx.runQuery(
        internal.collections.landingPages.queries.getByIdWithSignedUrlInternal,
        { id: assetSettings.id }
      );
      if (!landingPage) {
        throw new ConvexError(ERRORS.NOT_FOUND);
      }
      signedUrl = landingPage.signedUrl;
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
        config
      );

      // Update sandboxId in session
      await ctx.runMutation(
        internal.collections.agentSessions.mutations.updateSandboxId,
        {
          sessionId,
          sandboxId: sandboxDbId,
        }
      );

      return sandboxDbId;
    } catch (error) {
      console.error("Sandbox creation/retrieval failed:", error);

      if (error instanceof ConvexError) {
        throw error;
      }

      throw new ConvexError({
        message: "Failed to recreate sandbox",
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
        }
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
      internal.collections.sandboxes.queries.getAllRunningInternal
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
            }
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
      })
    );
  },
});
