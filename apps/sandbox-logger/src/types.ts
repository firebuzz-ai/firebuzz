export interface LogEntry {
  type: "log" | "connected" | "complete" | "error";
  stream?: "stdout" | "stderr";
  data?: string;
  exitCode?: number;
  error?: string;
  timestamp: number;
  sandboxId?: string;
  cmdId?: string;
}

export interface MonitoredCommand {
  sandboxId: string;
  cmdId: string;
  commandType: "install" | "dev" | "build" | "typecheck" | "other";
  abortController: AbortController;
}

export interface SandboxMonitor {
  sandboxId: string;
  healthCheckInterval: NodeJS.Timeout;
  commandMonitors: Set<string>; // Set of cmdIds
  lastActivity: number;
}

export interface WebhookConfig {
  url: string;
  token: string;
}

export interface VercelCredentials {
  teamId: string;
  projectId: string;
  token: string;
}
