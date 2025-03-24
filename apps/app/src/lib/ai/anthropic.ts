import { createAnthropic } from "@ai-sdk/anthropic";
import { envAnthropic } from "@firebuzz/env";
import "server-only";

console.log("envAnthropic", envAnthropic());

export const anthropic = createAnthropic({
  apiKey: envAnthropic().ANTHROPIC_API_KEY,
});
