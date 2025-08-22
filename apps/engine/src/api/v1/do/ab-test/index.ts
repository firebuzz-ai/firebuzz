import {
	abTestErrorResponses,
	syncABTestBodySchema,
	syncABTestSuccessResponseSchema,
	syncABTestMessageResponseSchema,
	cleanedABTestSchema as ABTestSchema
} from '@firebuzz/shared-types/api/do/ab-test';
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';

const syncABTestRoute = createRoute({
	path: '/sync/{campaignId}',
	method: 'post',
	request: {
		body: {
			content: {
				'application/json': {
					schema: syncABTestBodySchema,
				},
			},
		},
		params: z.object({
			campaignId: z.string(),
		}),
	},
	responses: {
		200: {
			content: {
				'application/json': {
					schema: z.union([syncABTestSuccessResponseSchema, syncABTestMessageResponseSchema]),
				},
			},
			description: 'AB test configuration synced successfully',
		},
		201: {
			content: {
				'application/json': {
					schema: syncABTestSuccessResponseSchema,
				},
			},
			description: 'AB test initialized for first time',
		},
		...abTestErrorResponses,
	},
});

const app = new OpenAPIHono<{ Bindings: Env }>();

export const abTestRoute = app
	.openapi(syncABTestRoute, async (c) => {
		try {
			const { config } = c.req.valid('json');
			const { campaignId } = c.req.valid('param');

			// Validate the request body using the original ABTestSchema for runtime validation
			const parsed = ABTestSchema.safeParse(config);
			if (!parsed.success) {
				return c.json({ error: parsed.error.message }, 400);
			}

			const latestConfig = parsed.data;

			const instanceId = c.env.AB_TEST.idFromName(`${campaignId}-${latestConfig.id}`);
			const instance = c.env.AB_TEST.get(instanceId);

			if (!instance) {
				return c.json({ error: 'Not found' }, 404);
			}

			// Check if the AB test is initialized
			const isInitialized = await instance.isInitialized();

			// If the AB test is not initialized, initialize it and return
			if (!isInitialized) {
				await instance.initialize(latestConfig, campaignId);
				return c.json({ success: true, message: 'AB test initialized for first time.' }, 201);
			}

			// Get the current configuration of the AB test
			const currentConfig = await instance.getJsonConfig();

			// Compare strings
			if (JSON.stringify(currentConfig) === JSON.stringify(latestConfig)) {
				return c.json({ success: true, message: 'AB test configuration is up to date.' }, 200);
			}

			// Sync the AB test configuration
			await instance.sync(latestConfig);

			return c.json({ message: 'AB test configuration synced successfully' }, 200);
		} catch (error) {
			console.error(error);
			return c.json({ error: 'Internal server error' }, 500);
		}
	})
	.options('*', (c) => {
		return c.text('', {
			status: 200,
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				'Access-Control-Max-Age': '86400',
			},
		});
	});
