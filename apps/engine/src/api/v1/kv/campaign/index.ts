import { errorResponses } from "@firebuzz/shared-types/api/errors";
import {
	deleteKvBodySchema,
	deleteKvResponseSchema,
	getKvQuerySchema,
	getKvResponseSchema,
	insertKvBodySchema,
	insertKvResponseSchema,
	listKvQuerySchema,
	listKvResponseSchema,
} from "@firebuzz/shared-types/api/kv";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

// @route POST /api/v1/kv
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
const getKvRoute = createRoute({
	path: "/",
	method: "get",
	request: {
		query: getKvQuerySchema,
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
const listKvRoute = createRoute({
	path: "/list",
	method: "get",
	request: {
		query: listKvQuerySchema,
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

export const campaignRoute = app
	.openapi(insertKvRoute, async (c) => {
		const { key, value, options } = c.req.valid("json");
		try {
			await c.env.CAMPAIGN.put(key, value, options);
			return c.json(
				{
					success: true as const,
					message: "Key-value pair inserted successfully" as const,
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
	.openapi(getKvRoute, async (c) => {
		const { key, type, withMetadata, cacheTtl } = c.req.valid("query");

		try {
			// Without Metadata
			if (!withMetadata) {
				if (type === "json") {
					const result = await c.env.CAMPAIGN.get(key, {
						type: "json",
						cacheTtl: cacheTtl,
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

				const result = await c.env.CAMPAIGN.get(key, {
					type: "text",
					cacheTtl: cacheTtl,
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
			if (type === "json") {
				const result = await c.env.CAMPAIGN.getWithMetadata(key, {
					type: "json",
					cacheTtl: cacheTtl,
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
							metadata: result.metadata,
						},
					},
					200,
				);
			}

			const result = await c.env.CAMPAIGN.getWithMetadata(key, {
				type: "text",
				cacheTtl: cacheTtl,
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
						metadata: result.metadata,
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
			await c.env.CAMPAIGN.delete(key);
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
		const { prefix, limit, cursor } = c.req.valid("query");
		try {
			const result = await c.env.CAMPAIGN.list({ prefix, limit, cursor });

			const transformedKeys = result.keys.map((key) => ({
				name: key.name,
				expiration: key.expiration,
				metadata: key.metadata && typeof key.metadata === 'object' && key.metadata !== null
					? key.metadata as { [x: string]: string }
					: undefined,
			}));

			return c.json(
				{
					success: true,
					message: "Key-value pairs listed successfully",
					data: result.list_complete
						? {
								keys: transformedKeys,
								list_complete: result.list_complete,
							}
						: {
								keys: transformedKeys,
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
