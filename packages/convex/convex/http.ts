import type { WebhookEvent } from "@clerk/backend";
import { httpRouter } from "convex/server";
import { Webhook } from "svix";
import { z } from "zod";
import type { Id } from "../src";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { resend } from "./components/resend";

const http = httpRouter();

// Zod schemas for validation
const scheduleSessionOverSchema = z.object({
  sessionId: z.string(),
  reason: z.enum(["idle", "max-duration"]),
  delay: z.number(),
});

const logEntrySchema = z.object({
  stream: z.enum(["stdout", "stderr"]),
  data: z.string(),
  timestamp: z.string(),
});

const updateStatusSchema = z.object({
  cmdId: z.string(),
  status: z.enum(["pending", "running", "completed", "failed", "error"]),
  exitCode: z.number().optional(),
});

const streamLogsSchema = z.object({
  cmdId: z.string(),
  logs: z.array(logEntrySchema).optional(),
  status: z.enum(["completed", "error"]).optional(),
  exitCode: z.number().optional(),
});

const sandboxClosedSchema = z.object({
  sandboxId: z.string(),
  closedAt: z.string(),
});

async function validateClerkRequest(
  req: Request
): Promise<WebhookEvent | null> {
  const payloadString = await req.text();
  const svixHeaders = {
    "svix-id": req.headers.get("svix-id")!,
    "svix-timestamp": req.headers.get("svix-timestamp")!,
    "svix-signature": req.headers.get("svix-signature")!,
  };
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  try {
    return wh.verify(payloadString, svixHeaders) as unknown as WebhookEvent;
  } catch (error) {
    console.error("Error verifying webhook event", error);
    return null;
  }
}

// Clerk Webhooks
http.route({
  path: "/webhooks/clerk",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await validateClerkRequest(request);
    if (!event) {
      return new Response("Error occured", { status: 400 });
    }
    switch (event.type) {
      case "user.created": // intentional fallthrough
      case "user.updated":
        await ctx.runMutation(
          internal.collections.users.mutations.upsertFromClerk,
          {
            data: event.data,
          }
        );
        break;
      case "user.deleted":
        if (event.data.id) {
          await ctx.runMutation(
            internal.collections.users.mutations
              .deleteUserWithAllDataByExternalId,
            {
              externalId: event.data.id,
            }
          );
        }
        break;
      /* Invitations */
      case "organizationInvitation.accepted":
      case "organizationInvitation.revoked":
        await ctx.runMutation(
          internal.collections.invitations.mutations.updateInternal,
          {
            externalId: event.data.id,
            status:
              event.type === "organizationInvitation.accepted"
                ? "accepted"
                : "revoked",
          }
        );
        break;
      /* Members */
      case "organizationMembership.created":
        await ctx.runMutation(
          internal.collections.members.mutations.createInternal,
          {
            externalId: event.data.id,
            role: event.data.role as "org:admin" | "org:member",
            organizationExternalId: event.data.organization.id,
            userExternalId: event.data.public_user_data.user_id,
          }
        );
        break;
      case "organizationMembership.deleted":
        await ctx.runMutation(
          internal.collections.members.mutations.deleteInternalByExternalId,
          {
            externalId: event.data.id,
          }
        );
        break;
      case "organizationMembership.updated":
        await ctx.runMutation(
          internal.collections.members.mutations.updateInternal,
          {
            externalId: event.data.id,
            role: event.data.role as "org:admin" | "org:member",
          }
        );
        break;
      /* Emails */
      case "email.created":
        // Detect email type based on slug
        switch (event.data.slug) {
          // OTP Email
          case "verification_code":
            // Only send if not handled by Clerk
            if (!event.data.delivered_by_clerk) {
              await ctx.runAction(internal.components.resend.sendAuthOTPEmail, {
                to: event.data.to_email_address as string,
                requestedAt: (event.data.data?.requested_at ??
                  new Date().toISOString()) as string,
                requestedBy: event.data.data?.requested_by,
                requestedFrom: event.data.data?.requested_from,
                otpCode: event.data.data?.otp_code as string,
                ttlMinutes: 10,
              });
            }
            break;
          // Invitation Email
          case "organization_invitation": {
            // Only send if not handled by Clerk
            if (!event.data.delivered_by_clerk) {
              await ctx.runAction(
                internal.components.resend.sendAuthInvitationEmail,
                {
                  to: event.data.to_email_address as string,
                  invitedByUsername: event.data.data?.inviter_name as string,
                  teamName: event.data.data?.org.name as string,
                  inviteLink: event.data.data?.action_url as string,
                }
              );
            }
            break;
          }
          // Invitation Accepted Email
          case "organization_invitation_accepted": {
            // Always send our custom email for invitation accepted
            await ctx.runAction(
              internal.components.resend.sendAuthInvitationAcceptedEmail,
              {
                to: event.data.to_email_address as string,
                memberEmail: event.data.data?.email_address as string,
                teamName: event.data.data?.org.name as string,
                appLink: event.data.data?.app.url as string,
              }
            );
            break;
          }
          default:
            console.log("Ignored Clerk Email webhook event", event.data.slug);
        }
        break;

      default:
        console.log("Ignored Clerk webhook event", event.type);
    }

    return new Response(null, { status: 200 });
  }),
});

// Stripe Webhooks
http.route({
  path: "/webhooks/stripe",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature: string = request.headers.get("stripe-signature") as string;
    const payload = await request.text();
    try {
      // Handle the event
      await ctx.runAction(internal.lib.stripe.handleStripeEvent, {
        payload,
        signature,
      });

      return new Response(null, { status: 200 });
    } catch (error) {
      console.error("Error processing Stripe webhook", error);
      return new Response("Error occurred", { status: 400 });
    }
  }),
});

// Resend Webhooks
http.route({
  path: "/webhooks/resend",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    return await resend.handleResendEventWebhook(ctx, req);
  }),
});

// Form Submissions
http.route({
  path: "/form/submit",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const token = req.headers.get("Authorization");

    if (!token || token !== process.env.ENGINE_SERVICE_TOKEN) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Payload (Already validated by engine)
    const data = await req.json();

    // Wrong payload
    if (!data.formId || !data.data) {
      return new Response("Wrong payload", { status: 422 });
    }

    // Check ratelimit
    const { ok } = await ctx.runQuery(
      internal.components.ratelimits.checkLimit,
      {
        name: "formSubmit",
        key: data.formId,
      }
    );

    // Rate limit exceeded
    if (!ok) {
      return new Response("Rate limit exceeded", { status: 429 });
    }

    // Get form
    const form = await ctx.runQuery(
      internal.collections.forms.queries.getByIdInternal,
      { id: data.formId as Id<"forms"> }
    );

    // Form not found
    if (!form) {
      return new Response("Not found", { status: 404 });
    }

    // Create submission
    const submission = await ctx.runMutation(
      internal.collections.forms.submissions.mutations.createInternal,
      {
        formId: data.formId,
        data: data.data,
        workspaceId: form.workspaceId,
        projectId: form.projectId,
        campaignId: form.campaignId,
        campaignEnvironment: data.campaignEnvironment,
      }
    );

    return new Response(JSON.stringify({ submissionId: submission }), {
      status: 200,
    });
  }),
});

// Agent Session - Schedule Session Over (DO - Agent Session)
http.route({
  path: "/agent-session/schedule-over",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const token = req.headers.get("Authorization");

    if (!token || token !== process.env.ENGINE_SERVICE_TOKEN) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const data = await req.json();
      const validated = scheduleSessionOverSchema.parse(data);

      const result = await ctx.runMutation(
        internal.collections.agentSessions.mutations.scheduleSessionOver,
        {
          sessionId: validated.sessionId as Id<"agentSessions">,
          reason: validated.reason,
          delay: validated.delay,
        }
      );

      return new Response(JSON.stringify(result), { status: 200 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({ error: "Invalid payload", details: error.errors }),
          { status: 422 }
        );
      }
      console.error("Error scheduling session over:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }),
});

// Sandbox Command - Update Status (Sandbox Logger - Sandbox Command)
http.route({
  path: "/sandbox/update-status",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const token = req.headers.get("Authorization");

    if (!token || token !== process.env.ENGINE_SERVICE_TOKEN) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const data = await req.json();
      const validated = updateStatusSchema.parse(data);

      const result = await ctx.runMutation(
        internal.collections.sandboxes.commands.mutations.updateCommandByCmdId,
        {
          cmdId: validated.cmdId,
          status: validated.status,
          exitCode: validated.exitCode,
        }
      );

      return new Response(JSON.stringify(result), { status: 200 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({ error: "Invalid payload", details: error.errors }),
          { status: 422 }
        );
      }
      console.error("Error updating command status:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }),
});

// Sandbox Command - Stream Logs (Sandbox Logger - Sandbox Command)
http.route({
  path: "/sandbox/stream-logs",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const token = req.headers.get("Authorization");
    const expectedToken = `Bearer ${process.env.SANDBOX_LOGGER_WEBHOOK_SECRET}`;

    if (!token || token !== expectedToken) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const data = await req.json();
      const validated = streamLogsSchema.parse(data);

      // Handle log batch
      if (validated.logs && validated.logs.length > 0) {
        await ctx.runMutation(
          internal.collections.sandboxes.commands.mutations.appendCommandLogs,
          {
            cmdId: validated.cmdId,
            logs: validated.logs,
          }
        );
      }

      // Handle status update
      if (validated.status) {
        await ctx.runMutation(
          internal.collections.sandboxes.commands.mutations
            .updateCommandByCmdId,
          {
            cmdId: validated.cmdId,
            status: validated.status,
            exitCode: validated.exitCode,
          }
        );
      }

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({ error: "Invalid payload", details: error.errors }),
          { status: 422 }
        );
      }
      console.error("Error processing webhook logs:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }),
});

// Sandbox - Closed (Sandbox Logger - Sandbox Status)
http.route({
  path: "/sandbox/closed",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const token = req.headers.get("Authorization");
    const expectedToken = `Bearer ${process.env.SANDBOX_LOGGER_WEBHOOK_SECRET}`;

    if (!token || token !== expectedToken) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const data = await req.json();
      const validated = sandboxClosedSchema.parse(data);

      await ctx.runMutation(
        internal.collections.sandboxes.mutations
          .killSandboxInternalByExternalId,
        {
          externalId: validated.sandboxId,
        }
      );

      console.log(
        `[Webhook] Sandbox ${validated.sandboxId} closed at ${validated.closedAt}`
      );

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({ error: "Invalid payload", details: error.issues }),
          { status: 422 }
        );
      }
      console.error("Error processing sandbox closure:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }),
});

export default http;
