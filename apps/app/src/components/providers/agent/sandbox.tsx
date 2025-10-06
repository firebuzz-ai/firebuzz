"use client";
import { useAgentSession } from "@/hooks/agent/use-agent-session";
import { api, useCachedRichQuery } from "@firebuzz/convex";
import { createContext, useMemo } from "react";

interface SanboxContextType {
  sandboxId: string | undefined;
  sandboxDbId: string | undefined;
  sandboxStatus: "pending" | "running" | "stopping" | "stopped" | "failed";
  previewURL: string | undefined;
  installCmdId: string | undefined;
  devCmdId: string | undefined;
  ports: number[];
  cwd: string;
  vcpus: number;
  runtime: string;
  timeout: number;
}

export const SanboxContext = createContext<SanboxContextType>({
  sandboxId: undefined,
  sandboxDbId: undefined,
  sandboxStatus: "pending",
  previewURL: undefined,
  installCmdId: undefined,
  devCmdId: undefined,
  ports: [5173],
  cwd: "/vercel/sandbox",
  vcpus: 2,
  runtime: "node22",
  timeout: 120000,
});

export const SanboxProvider = ({ children }: { children: React.ReactNode }) => {
  const session = useAgentSession();

  const { data: sandbox } = useCachedRichQuery(
    api.collections.sandboxes.queries.getById,
    session.session?.sandboxId ? { id: session.session.sandboxId } : "skip"
  );

  const exposedSession = useMemo(() => {
    if (!sandbox) {
      return {
        sandboxId: undefined,
        sandboxDbId: undefined,
        sandboxStatus: "pending" as const,
        previewURL: undefined,
        installCmdId: undefined,
        devCmdId: undefined,
        ports: [5173],
        cwd: "/vercel/sandbox",
        vcpus: 2,
        runtime: "node22",
        timeout: 120000,
      };
    }

    return {
      sandboxId: sandbox.sandboxExternalId,
      sandboxDbId: sandbox._id,
      sandboxStatus: sandbox.status,
      previewURL: sandbox.previewUrl,
      installCmdId: sandbox.installCmdId,
      devCmdId: sandbox.devCmdId,
      ports: sandbox.ports,
      cwd: sandbox.cwd,
      vcpus: sandbox.vcpus,
      runtime: sandbox.runtime,
      timeout: sandbox.timeout,
    };
  }, [sandbox]);

  return (
    <SanboxContext.Provider value={exposedSession}>
      {children}
    </SanboxContext.Provider>
  );
};
