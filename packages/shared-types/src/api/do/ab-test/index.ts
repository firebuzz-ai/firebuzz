import { z } from "zod";
import { cleanedABTestSchema } from "../../../campaign";

// Re-export cleanedABTestSchema for local use
export { cleanedABTestSchema };

// AB Test API specific error responses (different format from standard errors)
export const abTestErrorResponses = {
  400: {
    content: {
      "application/json": {
        schema: z.object({
          error: z.string(),
        }),
      },
    },
    description: "Bad Request",
  },
  404: {
    content: {
      "application/json": {
        schema: z.object({
          error: z.string(),
        }),
      },
    },
    description: "Not Found",
  },
  500: {
    content: {
      "application/json": {
        schema: z.object({
          error: z.string(),
        }),
      },
    },
    description: "Internal Server Error",
  },
};

// AB Test sync endpoint schemas
export const syncABTestBodySchema = z.object({
  config: cleanedABTestSchema,
});

export const syncABTestSuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const syncABTestMessageResponseSchema = z.object({
  message: z.string(),
});