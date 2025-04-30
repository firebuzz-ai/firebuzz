import { createOpenAI } from "@ai-sdk/openai";
import { envOpenai } from "@firebuzz/env";
import OpenAI from "openai";
import "server-only";

export const openAIRaw = new OpenAI({
  apiKey: envOpenai().OPENAI_API_KEY,
});

export const openAI = createOpenAI({
  apiKey: envOpenai().OPENAI_API_KEY,
});
