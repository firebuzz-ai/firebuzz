# Session Data Queue Implementation

## Overview

This implementation provides a robust queue-based system for handling session data ingestion to Tinybird with throttling and batching capabilities using Cloudflare Queues.

## Architecture

### Components

1. **Queue Producer** (`firebuzz-subdomain/index.ts`)
   - Enqueues session data when new sessions are created
   - Non-blocking - uses `waitUntil` to avoid impacting response times
   - Handles failures gracefully without breaking the main request flow

2. **Queue Consumer** (`queue/session-consumer.ts`)
   - Processes messages in batches (up to 100 messages)
   - Sends data to Tinybird using NDJSON format for efficiency
   - Implements retry logic with exponential backoff
   - Tracks metrics for monitoring and alerting

3. **Monitoring** (`lib/monitoring.ts`)
   - Logs structured metrics for observability platforms
   - Tracks rate limiting from Tinybird
   - Alerts on high failure rates (>10%)
   - Monitors queue processing performance

## Configuration

### Queue Settings (in `wrangler.jsonc`)

- **max_batch_size**: 100 messages per batch
- **max_batch_timeout**: 5 seconds
- **max_retries**: 3 attempts
- **dead_letter_queue**: Configured for each environment

### Environments

- Development: `session-ingestion`
- Preview: `session-ingestion-preview`
- Production: `session-ingestion-production`

## Benefits

1. **Throttling**: Prevents overwhelming Tinybird API with burst traffic
2. **Batching**: Reduces API calls by sending up to 100 sessions at once
3. **Reliability**: Automatic retries with exponential backoff
4. **Monitoring**: Comprehensive metrics and alerting
5. **Rate Limit Awareness**: Tracks and responds to Tinybird rate limits
6. **Performance**: Non-blocking ingestion doesn't impact page load times

## Tinybird API Limits

The implementation respects Tinybird's default limits:
- 100 requests/second per data source
- 20 MB/second per data source
- 10 MB per request

## Error Handling

1. **Retry Logic**:
   - Failed messages retry up to 3 times
   - Exponential backoff (10s, 20s, 40s, etc., max 5 minutes)
   - Messages exceeding retry limit go to dead letter queue

2. **Rate Limiting**:
   - Detects 429 responses from Tinybird
   - Logs rate limit headers for monitoring
   - Alerts when approaching limits (<10% remaining)

3. **Batch Failures**:
   - Individual session failures don't fail entire batch
   - Quarantined sessions are logged for investigation
   - Metrics track success/failure rates

## Monitoring

The system logs structured JSON for easy integration with monitoring tools:

```json
{
  "type": "queue_metrics",
  "timestamp": "2024-01-01T00:00:00Z",
  "environment": "production",
  "queueName": "session-ingestion-production",
  "batchSize": 100,
  "successfulSessions": 98,
  "failedSessions": 2,
  "processingTimeMs": 1234,
  "successRate": "0.98"
}
```

## Usage

Session tracking is automatic when users visit landing pages. The system:

1. Generates session data from the request
2. Enqueues it for batch processing
3. Consumer processes batches every 5 seconds or 100 messages
4. Data is sent to Tinybird for analytics

No manual intervention required - the queue handles all processing automatically.