import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { envGoogle } from "@firebuzz/env";
import "server-only";

export const google = createGoogleGenerativeAI({
  apiKey: envGoogle().GOOGLE_GENERATIVE_AI_API_KEY,
});
