# Queue Deployment Guide

## ✅ Queues Created

All necessary queues have been created in your Cloudflare account:

```
✅ session-ingestion                (development)
✅ session-ingestion-dlq            (development dead letter)
✅ session-ingestion-preview        (preview environment)
✅ session-ingestion-preview-dlq    (preview dead letter)
✅ session-ingestion-production     (production environment)  
✅ session-ingestion-production-dlq (production dead letter)
```

## Deployment Commands

### Development
```bash
pnpm wrangler deploy
```

### Preview  
```bash
pnpm wrangler deploy --env preview
```

### Production
```bash
pnpm wrangler deploy --env production
```

## Testing the Queue

### Monitor Queue Activity
```bash
# Check queue stats
pnpm wrangler queues list

# Monitor specific queue
pnpm wrangler tail --env production
```

### Test Session Ingestion
1. Visit a landing page to trigger session creation
2. Check logs for queue processing messages
3. Verify data appears in Tinybird

### Expected Log Messages
```json
{
  "type": "queue_metrics",
  "environment": "production", 
  "queueName": "session-ingestion-production",
  "batchSize": 5,
  "successfulSessions": 5,
  "failedSessions": 0,
  "processingTimeMs": 234,
  "successRate": "1.00"
}
```

## Performance Tuning

### For High Traffic (>2,000 sessions/second)
Update `max_batch_timeout` in `wrangler.jsonc`:

```jsonc
{
  "queues": {
    "consumers": [
      {
        "queue": "session-ingestion-production",
        "max_batch_size": 100,
        "max_batch_timeout": 1,  // ← Reduce from 5 to 1 second
        "max_retries": 3
      }
    ]
  }
}
```

This allows hitting Tinybird's theoretical maximum of **10,000 sessions/second**.

## Monitoring

### Key Metrics to Watch
1. **Queue Backlog**: Should stay near 0 during normal operation
2. **Success Rate**: Should be >95%
3. **Processing Time**: Should be <1 second per batch
4. **Tinybird Rate Limits**: Monitor `X-RateLimit-Remaining` headers

### Alerting Thresholds
- Queue backlog >1000 messages  
- Success rate <90%
- Processing time >5 seconds
- High retry rates

The queue system is now ready for production traffic! 🚀