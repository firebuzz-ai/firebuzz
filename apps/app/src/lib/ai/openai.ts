import { createOpenAI } from "@ai-sdk/openai";
import { envOpenai } from "@firebuzz/env";
import "server-only";

export const openAI = createOpenAI({
  apiKey: envOpenai().OPENAI_API_KEY,
});
