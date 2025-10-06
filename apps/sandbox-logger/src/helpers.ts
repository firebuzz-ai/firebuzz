import type { VercelCredentials, WebhookConfig } from "./types";

export const getEnv = (key: string, fallback?: string): string => {
  const value = process.env[key];
  if (!value && !fallback) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || fallback || "";
};

export const getServiceToken = (): string => {
  const token = process.env.SANDBOX_LOGGER_SERVICE_TOKEN;
  if (!token) {
    console.warn(
      "SANDBOX_LOGGER_SERVICE_TOKEN not set, authentication will fail"
    );
    return "";
  }
  return token;
};

export const getWebhookConfig = (): WebhookConfig => {
  const baseUrl = process.env.CONVEX_SITE_URL?.trim();
  const token = process.env.SANDBOX_LOGGER_WEBHOOK_SECRET?.trim();

  if (!baseUrl || !token) {
    console.error("[getWebhookConfig] Environment variables:", {
      CONVEX_SITE_URL: process.env.CONVEX_SITE_URL ? "set" : "missing",
      SANDBOX_LOGGER_WEBHOOK_SECRET: process.env.SANDBOX_LOGGER_WEBHOOK_SECRET ? "set" : "missing",
      baseUrlLength: baseUrl?.length || 0,
      tokenLength: token?.length || 0,
    });
    throw new Error(
      "Missing webhook configuration: CONVEX_SITE_URL, SANDBOX_LOGGER_WEBHOOK_SECRET"
    );
  }

  return { url: baseUrl, token };
};

export const getVercelCredentials = (): VercelCredentials => {
  const teamId = process.env.VERCEL_TEAM_ID;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const token = process.env.VERCEL_TOKEN;

  if (!teamId || !projectId || !token) {
    throw new Error(
      "Missing Vercel credentials: VERCEL_TEAM_ID, VERCEL_PROJECT_ID, VERCEL_TOKEN"
    );
  }

  return { teamId, projectId, token };
};
