/**
 * Monitoring and metrics for session queue processing
 */

export interface QueueMetrics {
	timestamp: string;
	environment: string;
	queueName: string;
	batchSize: number;
	successfulSessions: number;
	failedSessions: number;
	processingTimeMs: number;
	errors: Array<{
		sessionId: string;
		error: string;
	}>;
}

/**
 * Log queue metrics for monitoring
 */
export function logQueueMetrics(metrics: QueueMetrics): void {
	// Log to console in structured format for observability platforms
	console.log(
		JSON.stringify({
			type: "queue_metrics",
			...metrics,
			successRate: metrics.batchSize > 0 
				? (metrics.successfulSessions / metrics.batchSize).toFixed(2) 
				: "0",
		}),
	);

	// Log errors separately if any
	if (metrics.errors.length > 0) {
		console.error(
			JSON.stringify({
				type: "queue_errors",
				timestamp: metrics.timestamp,
				environment: metrics.environment,
				queueName: metrics.queueName,
				errorCount: metrics.errors.length,
				errors: metrics.errors,
			}),
		);
	}

	// Alert if failure rate is high
	const failureRate = metrics.batchSize > 0 
		? metrics.failedSessions / metrics.batchSize 
		: 0;
	
	if (failureRate > 0.1) { // More than 10% failure rate
		console.error(
			JSON.stringify({
				type: "high_failure_rate_alert",
				timestamp: metrics.timestamp,
				environment: metrics.environment,
				queueName: metrics.queueName,
				failureRate: failureRate.toFixed(2),
				totalFailed: metrics.failedSessions,
				totalProcessed: metrics.batchSize,
			}),
		);
	}
}

/**
 * Track rate limiting from Tinybird
 */
export function trackRateLimiting(headers: Headers): void {
	const rateLimit = headers.get("X-RateLimit-Limit");
	const remaining = headers.get("X-RateLimit-Remaining");
	const reset = headers.get("X-RateLimit-Reset");
	const retryAfter = headers.get("Retry-After");

	if (rateLimit && remaining) {
		const remainingNum = Number.parseInt(remaining, 10);
		const limitNum = Number.parseInt(rateLimit, 10);
		const usageRate = limitNum > 0 ? ((limitNum - remainingNum) / limitNum).toFixed(2) : "0";

		console.log(
			JSON.stringify({
				type: "rate_limit_status",
				timestamp: new Date().toISOString(),
				limit: limitNum,
				remaining: remainingNum,
				usageRate,
				resetIn: reset ? `${reset}s` : null,
				retryAfter: retryAfter ? `${retryAfter}s` : null,
			}),
		);

		// Alert if approaching rate limit
		if (remainingNum < limitNum * 0.1) { // Less than 10% remaining
			console.warn(
				JSON.stringify({
					type: "rate_limit_warning",
					timestamp: new Date().toISOString(),
					message: "Approaching Tinybird rate limit",
					remaining: remainingNum,
					limit: limitNum,
				}),
			);
		}
	}
}