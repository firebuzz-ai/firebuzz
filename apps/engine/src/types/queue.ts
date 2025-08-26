import type { EventData } from "@firebuzz/shared-types/events";
import type { SessionData } from "../lib/tinybird";

export interface SessionQueueMessage {
	type: "session";
	data: SessionData;
	retryCount?: number;
	timestamp: string;
}

export interface EventQueueMessage {
	type: "event";
	data: EventData;
	retryCount?: number;
	timestamp: string;
}

export type QueueMessage = SessionQueueMessage | EventQueueMessage;

export interface BatchProcessingResult {
	successful: number;
	failed: number;
	errors: Array<{
		sessionId: string;
		error: string;
	}>;
}

export interface EventBatchProcessingResult {
	successful: number;
	failed: number;
	errors: Array<{
		eventId: string;
		error: string;
	}>;
}
