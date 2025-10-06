import { z } from "zod";

export const registerMonitorSchema = z.object({
  sandboxId: z.string(),
  cmdId: z.string(),
  commandType: z
    .enum(["install", "dev", "build", "typecheck", "other"])
    .optional()
    .default("other"),
});

export const stopMonitorSchema = z.object({
  sandboxId: z.string(),
  cmdId: z.string(),
});
