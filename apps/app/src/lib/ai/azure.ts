import { createAzure } from "@ai-sdk/azure";
import { envAzure } from "@firebuzz/env";
import "server-only";

export const azureOpenAI = createAzure({
  apiKey: envAzure().AZURE_OPENAI_API_KEY,
  resourceName: envAzure().AZURE_OPENAI_RESOURCE_NAME,
});
