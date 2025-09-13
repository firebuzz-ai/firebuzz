import type { EventData } from "@firebuzz/shared-types/events";
import type { SessionData, TrafficData } from "../lib/tinybird";

// Traffic data type matching the traffic.datasource schema

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

export interface TrafficQueueMessage {
	type: "traffic";
	data: TrafficData;
	retryCount?: number;
	timestamp: string;
}

export type QueueMessage = SessionQueueMessage | EventQueueMessage | TrafficQueueMessage;

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

export interface TrafficBatchProcessingResult {
	successful: number;
	failed: number;
	errors: Array<{
		requestId: string;
		error: string;
	}>;
}
