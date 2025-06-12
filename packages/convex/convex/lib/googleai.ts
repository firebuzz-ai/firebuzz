import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { ERRORS } from "../utils/errors";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!apiKey) throw new Error(ERRORS.ENVS_NOT_INITIALIZED);

export const googleai = createGoogleGenerativeAI({
  apiKey,
})
