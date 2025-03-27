import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { Env } from "../../../../env";
// Error Response Schema

const errorResponses = {
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

const metadataSchema = z.record(z.string(), z.any());

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

const insertKvRoute = createRoute({
	path: "/",
	method: "post",
	request: {
		body: {
			content: {
				"application/json": {
					schema: insertKvBodySchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: insertKvResponseSchema,
				},
			},
			description: "Successfully inserted key-value pair",
		},
		...errorResponses,
	},
});

// @route GET /api/v1/kv
export const getKvBodySchema = z.object({
	key: z.string(),
	options: z.object({
		type: z.enum(["text", "json"]).optional().default("text"),
		cacheTtl: z.number().optional().describe("Cache TTL in seconds"),
		withMetadata: z.boolean().optional().default(false),
	}),
});

export const getKvResponseSchema = z.object({
	success: z.boolean(),
	message: z.string(),
	data: z.union([
		z.object({
			type: z.literal("text"),
			value: z.string(),
			metadata: metadataSchema.optional(),
		}),
		z.object({
			type: z.literal("json"),
			value: z.record(z.string(), z.any()),
			metadata: metadataSchema.optional(),
		}),
	]),
});

const getKvRoute = createRoute({
	path: "/",
	method: "get",
	request: {
		body: {
			content: {
				"application/json": {
					schema: getKvBodySchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: getKvResponseSchema,
				},
			},
			description: "Successfully retrieved key-value pair",
		},
		...errorResponses,
	},
});

// @route DELETE /api/v1/kv
export const deleteKvBodySchema = z.object({
	key: z.string(),
});

export const deleteKvResponseSchema = z.object({
	success: z.boolean(),
	message: z.string(),
});

const deleteKvRoute = createRoute({
	path: "/",
	method: "delete",
	request: {
		body: {
			content: {
				"application/json": {
					schema: deleteKvBodySchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: deleteKvResponseSchema,
				},
			},
			description: "Successfully deleted key-value pair",
		},
		...errorResponses,
	},
});

// @route GET /api/v1/kv/list
export const listKvBodySchema = z.object({
	prefix: z.string().optional(),
	limit: z.number().optional().default(100),
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

const listKvRoute = createRoute({
	path: "/list",
	method: "get",
	request: {
		body: {
			content: {
				"application/json": {
					schema: listKvBodySchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: listKvResponseSchema,
				},
			},
			description: "Successfully listed key-value pairs",
		},
		...errorResponses,
	},
});

const app = new OpenAPIHono<{ Bindings: Env }>();

export const kvRoute = app
	.openapi(insertKvRoute, async (c) => {
		const { key, value, options } = c.req.valid("json");
		try {
			const result = await c.env.ASSETS.put(key, value, options);
			return c.json({
				success: true,
				message: "Key-value pair inserted successfully",
				data: result,
			});
		} catch (error) {
			console.error(error);
			return c.json(
				{ success: false as const, message: "Internal Server Error" as const },
				500,
			);
		}
	})
	.openapi(getKvRoute, async (c) => {
		const { key, options } = c.req.valid("json");
		try {
			// Without Metadata
			if (!options.withMetadata) {
				if (options.type === "json") {
					const result = await c.env.ASSETS.get(key, {
						type: "json",
						cacheTtl: options?.cacheTtl,
					});
					if (!result)
						return c.json(
							{ success: false as const, message: "Not Found" as const },
							404,
						);
					return c.json(
						{
							success: true,
							message: "Key-value pair retrieved successfully",

							data: {
								// biome-ignore lint/suspicious/noExplicitAny: <explanation>
								value: result as Record<string, any>,
								type: "json" as const,
								metadata: undefined,
							},
						},
						200,
					);
				}

				const result = await c.env.ASSETS.get(key, {
					type: "text",
					cacheTtl: options?.cacheTtl,
				});
				if (!result)
					return c.json(
						{ success: false as const, message: "Not Found" as const },
						404,
					);
				return c.json(
					{
						success: true,
						message: "Key-value pair retrieved successfully",
						data: { value: result, type: "text" as const, metadata: undefined },
					},
					200,
				);
			}

			// With Metadata
			if (options.type === "json") {
				const result = await c.env.ASSETS.getWithMetadata(key, {
					type: "json",
					cacheTtl: options?.cacheTtl,
				});
				if (!result || !result.value)
					return c.json(
						{ success: false as const, message: "Not Found" as const },
						404,
					);
				return c.json(
					{
						success: true,
						message: "Key-value pair retrieved successfully",
						data: {
							// biome-ignore lint/suspicious/noExplicitAny: <explanation>
							value: result.value as Record<string, any>,
							type: "json" as const,
							metadata: result.metadata as z.infer<typeof metadataSchema>,
						},
					},
					200,
				);
			}

			const result = await c.env.ASSETS.getWithMetadata(key, {
				type: "text",
				cacheTtl: options?.cacheTtl,
			});
			if (!result || !result.value)
				return c.json(
					{ success: false as const, message: "Not Found" as const },
					404,
				);
			return c.json(
				{
					success: true,
					message: "Key-value pair retrieved successfully",
					data: {
						value: result.value,
						type: "text" as const,
						metadata: result.metadata as z.infer<typeof metadataSchema>,
					},
				},
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				{ success: false as const, message: "Internal Server Error" as const },
				500,
			);
		}
	})
	.openapi(deleteKvRoute, async (c) => {
		const { key } = c.req.valid("json");
		try {
			await c.env.ASSETS.delete(key);
			return c.json(
				{ success: true, message: "Key-value pair deleted successfully" },
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				{ success: false as const, message: "Internal Server Error" as const },
				500,
			);
		}
	})
	.openapi(listKvRoute, async (c) => {
		const { prefix, limit, cursor } = c.req.valid("json");
		try {
			const result = await c.env.ASSETS.list({ prefix, limit, cursor });

			return c.json(
				{
					success: true,
					message: "Key-value pairs listed successfully",
					data: result.list_complete
						? {
								keys: result.keys,
								list_complete: result.list_complete,
							}
						: {
								keys: result.keys,
								list_complete: result.list_complete,
								cursor: result.cursor,
							},
				},
				200,
			);
		} catch (error) {
			console.error(error);
			return c.json(
				{ success: false as const, message: "Internal Server Error" as const },
				500,
			);
		}
	})
	.options("*", (c) => {
		return c.text("", {
			status: 200,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
				"Access-Control-Max-Age": "86400",
			},
		});
	});
