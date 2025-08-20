import { hc } from "hono/client";
import type { AppType } from "engine/api";
import { ERRORS } from "../utils/errors";

const engineUrl = process.env.ENGINE_URL;
const engineServiceToken = process.env.ENGINE_SERVICE_TOKEN;

if (!engineUrl || !engineServiceToken)
  throw new Error(ERRORS.ENVS_NOT_INITIALIZED);

// Create the client directly here to avoid bundling engine implementation
export const engineAPIClient = hc<AppType>(`${engineUrl}/api/v1`, {
  headers: {
    Authorization: `Bearer ${engineServiceToken}`,
  },
});
