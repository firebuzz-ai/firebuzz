import { createAnthropic } from "@ai-sdk/anthropic";
import { ERRORS } from "../utils/errors";

const baseURL =
	"https://gateway.ai.cloudflare.com/v1/560a894a506b2db116cc83038f514f4e/firebuzz/anthropic";

const apiToken = process.env.CLOUDFLARE_AI_GATEWAY_TOKEN;

if (!apiToken) throw new Error(ERRORS.ENVS_NOT_INITIALIZED);

export const anthropic = createAnthropic({
	baseURL,
	headers: {
		"cf-aig-authorization": `Bearer ${apiToken}`,
	},
});
