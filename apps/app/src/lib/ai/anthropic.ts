import { createAnthropic } from "@ai-sdk/anthropic";
import { envAnthropic } from "@firebuzz/env";
import "server-only";

export const anthropic = createAnthropic({
	apiKey: envAnthropic().ANTHROPIC_API_KEY,
});
