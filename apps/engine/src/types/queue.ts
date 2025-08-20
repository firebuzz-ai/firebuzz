import type { SessionData } from "../lib/tinybird";

export interface SessionQueueMessage {
	type: "session";
	data: SessionData;
	retryCount?: number;
	timestamp: string;
}

export interface BatchProcessingResult {
	successful: number;
	failed: number;
	errors: Array<{
		sessionId: string;
		error: string;
	}>;
}