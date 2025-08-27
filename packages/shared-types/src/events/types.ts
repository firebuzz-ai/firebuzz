import type { z } from "zod";
import type {
	doSessionStateSchema,
	eventBatchSchema,
	eventDataSchema,
	externalTrackEventRequestSchema,
	initSessionRequestSchema,
	sessionValidationResponseSchema,
	trackEventRequestSchema,
} from "./schemas";

// Infer types from Zod schemas
export type EventData = z.infer<typeof eventDataSchema>;
export type TrackEventRequest = z.infer<typeof trackEventRequestSchema>;
export type ExternalTrackEventRequest = z.infer<typeof externalTrackEventRequestSchema>;
export type InitSessionRequest = z.infer<typeof initSessionRequestSchema>;
export type DOSessionState = z.infer<typeof doSessionStateSchema>;
export type SessionValidationResponse = z.infer<
	typeof sessionValidationResponseSchema
>;
export type EventBatch = z.infer<typeof eventBatchSchema>;

// Event type enums for convenience
export const EventType = {
	CONVERSION: "conversion",
	ENGAGEMENT: "engagement",
	SYSTEM: "system",
} as const;

export const EventValueType = {
	DYNAMIC: "dynamic",
	STATIC: "static",
} as const;

export const EventPlacement = {
	INTERNAL: "internal",
	EXTERNAL: "external",
} as const;

// DO RPC method types
export interface EventTrackerDORequest {
	action:
		| "initSession"
		| "trackEvent"
		| "validateSession"
		| "getSession"
		| "flushEvents"
		| "expireSession";
	data?: unknown;
}

export interface InitSessionAction {
	action: "initSession";
	data: InitSessionRequest;
}

export interface TrackEventAction {
	action: "trackEvent";
	data: TrackEventRequest;
}

export interface ValidateSessionAction {
	action: "validateSession";
	data: {
		session_id: string;
	};
}

export interface GetSessionAction {
	action: "getSession";
	data: {
		session_id: string;
	};
}

export interface FlushEventsAction {
	action: "flushEvents";
	data: {
		session_id: string;
	};
}

export interface ExpireSessionAction {
	action: "expireSession";
	data: {
		session_id: string;
	};
}

// Union type for all actions
export type EventTrackerAction =
	| InitSessionAction
	| TrackEventAction
	| ValidateSessionAction
	| GetSessionAction
	| FlushEventsAction
	| ExpireSessionAction;

// Response types
export interface EventTrackerResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
}

export interface InitSessionResponse {
	session_id: string;
	session_data: DOSessionState;
}

export interface TrackEventResponse {
	success: boolean;
	event_sequence: number;
	events_in_buffer: number;
	flushed_to_tinybird: boolean;
}
