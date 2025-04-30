import { createAzure } from "@ai-sdk/azure";
import { createOpenAI } from "@ai-sdk/openai";

export const azureOpenAI = createAzure({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  resourceName: process.env.AZURE_OPENAI_RESOURCE_NAME,
});

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
