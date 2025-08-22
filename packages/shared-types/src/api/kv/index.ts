import { z } from "zod";

// Shared KV API schemas for all KV stores (campaign, assets, cache, domain-config)
const metadataSchema = z.record(z.string(), z.any()).optional();

// @route POST /api/v1/kv
export const insertKvBodySchema = z.object({
  key: z.string(),
  value: z.string(),
  options: z.object({
    expiration: z.number().optional(),
    expirationTtl: z.number().optional(),
    metadata: metadataSchema,
  }),
});

export const insertKvResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

// @route GET /api/v1/kv
export const getKvQuerySchema = z.object({
  key: z.string(),
  type: z.enum(['text', 'json']).optional().default('text'),
  cacheTtl: z.coerce.number().optional().describe('Cache TTL in seconds'),
  withMetadata: z.coerce.boolean().optional().default(false),
});

export const getKvResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.union([
    z.object({
      type: z.literal('text'),
      value: z.string(),
      metadata: metadataSchema.optional(),
    }),
    z.object({
      type: z.literal('json'),
      value: z.record(z.string(), z.any()),
      metadata: metadataSchema.optional(),
    }),
  ]),
});

// @route DELETE /api/v1/kv
export const deleteKvBodySchema = z.object({
  key: z.string(),
});

export const deleteKvResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

// @route GET /api/v1/kv/list
export const listKvQuerySchema = z.object({
  prefix: z.string().optional(),
  limit: z.coerce.number().optional().default(100),
  cursor: z.string().optional(),
});

export const listKvResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    keys: z.array(
      z.object({
        name: z.string(),
        expiration: z.number().optional(),
        metadata: z.record(z.string(), z.string()).optional(),
      }),
    ),
    list_complete: z.boolean(),
    cursor: z.string().optional(),
  }),
});