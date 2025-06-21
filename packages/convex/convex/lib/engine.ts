import { createClient } from "@engine/api";
import { ERRORS } from "../utils/errors";

const engineUrl = process.env.ENGINE_URL;
const engineServiceToken = process.env.ENGINE_SERVICE_TOKEN;

if (!engineUrl || !engineServiceToken)
	throw new Error(ERRORS.ENVS_NOT_INITIALIZED);

export const engineAPIClient = createClient({
	baseUrl: engineUrl,
	apiKey: engineServiceToken,
});
