import {
	agentSessionErrorResponses,
	cleanupSessionResponseSchema,
	endSessionBodySchema,
	endSessionResponseSchema,
	extendSessionBodySchema,
	extendSessionResponseSchema,
	getStateResponseSchema,
	heartbeatBodySchema,
	heartbeatResponseSchema,
	initializeSessionBodySchema,
	initializeSessionResponseSchema,
} from '@firebuzz/shared-types/api/do/agent-session';
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';

// Initialize session route
const initializeRoute = createRoute({
	path: '/initialize',
	method: 'post',
	request: {
		body: {
			content: {
				'application/json': {
					schema: initializeSessionBodySchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				'application/json': {
					schema: initializeSessionResponseSchema,
				},
			},
			description: 'Agent session initialized successfully',
		},
		...agentSessionErrorResponses,
	},
});

// Extend session route
const extendSessionRoute = createRoute({
	path: '/extend',
	method: 'post',
	request: {
		body: {
			content: {
				'application/json': {
					schema: extendSessionBodySchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				'application/json': {
					schema: extendSessionResponseSchema,
				},
			},
			description: 'Session extended successfully',
		},
		...agentSessionErrorResponses,
	},
});

// Get state route
const getStateRoute = createRoute({
	path: '/state/{sessionId}',
	method: 'get',
	request: {
		params: z.object({
			sessionId: z.string(),
		}),
	},
	responses: {
		200: {
			content: {
				'application/json': {
					schema: getStateResponseSchema,
				},
			},
			description: 'Session state retrieved successfully',
		},
		...agentSessionErrorResponses,
	},
});

// Cleanup session route
const cleanupRoute = createRoute({
	path: '/cleanup/{sessionId}',
	method: 'post',
	request: {
		params: z.object({
			sessionId: z.string(),
		}),
	},
	responses: {
		200: {
			content: {
				'application/json': {
					schema: cleanupSessionResponseSchema,
				},
			},
			description: 'Session cleaned up successfully',
		},
		...agentSessionErrorResponses,
	},
});

// Heartbeat route (update activity timestamp)
const heartbeatRoute = createRoute({
	path: '/heartbeat',
	method: 'post',
	request: {
		body: {
			content: {
				'application/json': {
					schema: heartbeatBodySchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				'application/json': {
					schema: heartbeatResponseSchema,
				},
			},
			description: 'Heartbeat received, activity updated',
		},
		...agentSessionErrorResponses,
	},
});

// End session route
const endSessionRoute = createRoute({
	path: '/end',
	method: 'post',
	request: {
		body: {
			content: {
				'application/json': {
					schema: endSessionBodySchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				'application/json': {
					schema: endSessionResponseSchema,
				},
			},
			description: 'Session ended successfully',
		},
		...agentSessionErrorResponses,
	},
});

const app = new OpenAPIHono<{ Bindings: Env }>();

export const agentSessionRoute = app

	.openapi(initializeRoute, async (c) => {
		try {
			const { sessionId, maxDuration, maxIdleTime } = c.req.valid('json');

			if (!sessionId) {
				return c.json({ error: 'sessionId is required' }, 400);
			}

			// Create or get Durable Object instance using session ID
			const doId = c.env.AGENT_SESSION.idFromName(`agent-session-${sessionId}`);
			const stub = c.env.AGENT_SESSION.get(doId);

			// Initialize the session
			const result = await stub.initialize({
				sessionId,
				maxDuration: maxDuration || 30 * 60 * 1000, // Default 30 minutes
				maxIdleTime: maxIdleTime || 5 * 60 * 1000, // Default 5 minutes
			});

			if (!result.success) {
				return c.json({ error: result.error || 'Unknown error' }, 500);
			}

			return c.json(
				{
					success: true,
					message: 'Agent session initialized',
					sessionId,
					config: {
						maxDuration: maxDuration || 30 * 60 * 1000,
						maxIdleTime: maxIdleTime || 5 * 60 * 1000,
					},
				},
				200,
			);
		} catch (error) {
			console.error('Failed to initialize agent session:', error);
			return c.json(
				{
					error: error instanceof Error ? error.message : 'Unknown error',
				},
				500,
			);
		}
	})
	.openapi(extendSessionRoute, async (c) => {
		try {
			const { sessionId } = c.req.valid('json');

			if (!sessionId) {
				return c.json({ error: 'sessionId is required' }, 400);
			}

			const doId = c.env.AGENT_SESSION.idFromName(`agent-session-${sessionId}`);
			const stub = c.env.AGENT_SESSION.get(doId);

			await stub.extendSession();

			return c.json(
				{
					success: true,
					message: 'Session extended',
					sessionId,
				},
				200,
			);
		} catch (error) {
			console.error('Failed to extend session:', error);
			return c.json(
				{
					error: error instanceof Error ? error.message : 'Unknown error',
				},
				500,
			);
		}
	})
	.openapi(getStateRoute, async (c) => {
		try {
			const { sessionId } = c.req.valid('param');

			// Get the Durable Object instance
			const doId = c.env.AGENT_SESSION.idFromName(`agent-session-${sessionId}`);
			const stub = c.env.AGENT_SESSION.get(doId);

			// Get state
			const state = await stub.getState();

			if (!state) {
				return c.json(
					{
						error: 'Session not found or not initialized',
					},
					404,
				);
			}

			return c.json(
				{
					success: true,
					state,
				},
				200,
			);
		} catch (error) {
			console.error('Failed to get session state:', error);
			return c.json(
				{
					error: error instanceof Error ? error.message : 'Unknown error',
				},
				500,
			);
		}
	})
	.openapi(cleanupRoute, async (c) => {
		try {
			const { sessionId } = c.req.valid('param');

			// Get the Durable Object instance
			const doId = c.env.AGENT_SESSION.idFromName(`agent-session-${sessionId}`);
			const stub = c.env.AGENT_SESSION.get(doId);

			// Cleanup
			await stub.cleanup();

			return c.json(
				{
					success: true,
					message: 'Session cleaned up',
				},
				200,
			);
		} catch (error) {
			console.error('Failed to cleanup session:', error);
			return c.json(
				{
					error: error instanceof Error ? error.message : 'Unknown error',
				},
				500,
			);
		}
	})
	.openapi(heartbeatRoute, async (c) => {
		try {
			const { sessionId } = c.req.valid('json');

			if (!sessionId) {
				return c.json({ error: 'sessionId is required' }, 400);
			}

			const doId = c.env.AGENT_SESSION.idFromName(`agent-session-${sessionId}`);
			const stub = c.env.AGENT_SESSION.get(doId);

			const result = await stub.updateActivity();

			if (!result.success) {
				if (result.error === 'Session has ended') {
					return c.json(
						{
							success: false,
							message: result.error,
							sessionId,
						},
						410,
					);
				}
				return c.json(
					{
						error: result.error || 'Failed to update activity',
					},
					500,
				);
			}

			return c.json(
				{
					success: true,
					message: 'Heartbeat received',
					sessionId,
				},
				200,
			);
		} catch (error) {
			console.error('Failed to send heartbeat:', error);
			return c.json(
				{
					error: error instanceof Error ? error.message : 'Unknown error',
				},
				500,
			);
		}
	})
	.openapi(endSessionRoute, async (c) => {
		try {
			const { sessionId, reason } = c.req.valid('json');

			if (!sessionId) {
				return c.json({ error: 'sessionId is required' }, 400);
			}

			const doId = c.env.AGENT_SESSION.idFromName(`agent-session-${sessionId}`);
			const stub = c.env.AGENT_SESSION.get(doId);

			// Get state first to check if session exists
			const state = await stub.getState();
			if (!state) {
				return c.json(
					{
						error: 'Session not found or not initialized',
					},
					404,
				);
			}

			// End the session using cleanup (which calls endSession internally)
			await stub.cleanup();

			return c.json(
				{
					success: true,
					message: `Session ended${reason ? `: ${reason}` : ''}`,
					sessionId,
				},
				200,
			);
		} catch (error) {
			console.error('Failed to end session:', error);
			return c.json(
				{
					error: error instanceof Error ? error.message : 'Unknown error',
				},
				500,
			);
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
