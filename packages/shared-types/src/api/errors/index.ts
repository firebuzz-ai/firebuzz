import { z } from "zod";

// Standard error response definitions for OpenAPI
export const errorResponses = {
  400: {
    content: {
      "application/json": {
        schema: z.object({
          success: z.literal(false),
          message: z.literal("Bad Request"),
        }),
      },
    },
    description: "Bad Request",
  },
  401: {
    content: {
      "application/json": {
        schema: z.object({
          success: z.literal(false),
          message: z.literal("Unauthorized"),
        }),
      },
    },
    description: "Unauthorized",
  },
  404: {
    content: {
      "application/json": {
        schema: z.object({
          success: z.literal(false),
          message: z.literal("Not Found"),
        }),
      },
    },
    description: "Not Found",
  },
  500: {
    content: {
      "application/json": {
        schema: z.object({
          success: z.literal(false),
          message: z.literal("Internal Server Error"),
        }),
      },
    },
    description: "Internal Server Error",
  },
};
