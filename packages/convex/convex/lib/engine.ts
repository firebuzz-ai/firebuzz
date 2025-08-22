import type { App } from "@firebuzz/shared-types/api/client-types";
import { hc } from "hono/client";
import { ERRORS } from "../utils/errors";

const engineUrl = process.env.ENGINE_URL;
const engineServiceToken = process.env.ENGINE_SERVICE_TOKEN;

if (!engineUrl || !engineServiceToken)
  throw new Error(ERRORS.ENVS_NOT_INITIALIZED);

// Create the client directly here to avoid bundling engine implementation
// Using type assertion to bypass Hono constraint - we provide the actual client structure
export const engineAPIClient = hc(`${engineUrl}/api/v1`, {
  headers: {
    Authorization: `Bearer ${engineServiceToken}`,
  },
}) as unknown as App;
