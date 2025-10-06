import { z } from "zod";

// Agent Session State schema
export const agentSessionStatusSchema = z.enum([
	"active",
	"idle-warning",
	"ending",
	"ended",
	"error",
]);

export const agentSessionStateSchema = z.object({
	sessionId: z.string(),
	maxDuration: z.number(),
	maxIdleTime: z.number(),
	expiresAt: z.number(),
	createdAt: z.number(),
	lastActivity: z.number(),
	status: agentSessionStatusSchema,
});

// API Request/Response schemas

// Initialize session
export const initializeSessionBodySchema = z.object({
	sessionId: z.string(),
	maxDuration: z.number().optional(),
	maxIdleTime: z.number().optional(),
});

export const initializeSessionResponseSchema = z.object({
	success: z.boolean(),
	message: z.string(),
	sessionId: z.string(),
	config: z.object({
		maxDuration: z.number(),
		maxIdleTime: z.number(),
	}),
});

// Extend session
export const extendSessionBodySchema = z.object({
	sessionId: z.string(),
});

export const extendSessionResponseSchema = z.object({
	success: z.boolean(),
	message: z.string(),
	sessionId: z.string(),
});

// Get state
export const getStateResponseSchema = z.object({
	success: z.boolean(),
	state: agentSessionStateSchema,
});

// Cleanup
export const cleanupSessionResponseSchema = z.object({
	success: z.boolean(),
	message: z.string(),
});

// Heartbeat (update activity)
export const heartbeatBodySchema = z.object({
	sessionId: z.string(),
});

export const heartbeatResponseSchema = z.object({
	success: z.boolean(),
	message: z.string(),
	sessionId: z.string(),
});

// End session
export const endSessionBodySchema = z.object({
	sessionId: z.string(),
	reason: z.string().optional(),
});

export const endSessionResponseSchema = z.object({
	success: z.boolean(),
	message: z.string(),
	sessionId: z.string(),
});

// Error responses
export const agentSessionErrorResponses = {
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
		description: "Session not found or not initialized",
	},
	410: {
		content: {
			"application/json": {
				schema: z.object({
					success: z.boolean(),
					message: z.string(),
					sessionId: z.string(),
				}),
			},
		},
		description: "Session has ended (Gone)",
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

// Type exports
export type AgentSessionStatus = z.infer<typeof agentSessionStatusSchema>;
export type AgentSessionState = z.infer<typeof agentSessionStateSchema>;
export type InitializeSessionBody = z.infer<typeof initializeSessionBodySchema>;
export type InitializeSessionResponse = z.infer<
	typeof initializeSessionResponseSchema
>;
export type ExtendSessionBody = z.infer<typeof extendSessionBodySchema>;
export type ExtendSessionResponse = z.infer<typeof extendSessionResponseSchema>;
export type GetStateResponse = z.infer<typeof getStateResponseSchema>;
export type CleanupSessionResponse = z.infer<
	typeof cleanupSessionResponseSchema
>;
export type HeartbeatBody = z.infer<typeof heartbeatBodySchema>;
export type HeartbeatResponse = z.infer<typeof heartbeatResponseSchema>;
export type EndSessionBody = z.infer<typeof endSessionBodySchema>;
export type EndSessionResponse = z.infer<typeof endSessionResponseSchema>;
