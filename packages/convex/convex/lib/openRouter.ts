import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { ERRORS } from "../utils/errors";

const apiKey = process.env.OPEN_ROUTER_API_KEY;

if (!apiKey) throw new Error(ERRORS.ENVS_NOT_INITIALIZED);

export const openRouter = createOpenRouter({
	apiKey,
});
