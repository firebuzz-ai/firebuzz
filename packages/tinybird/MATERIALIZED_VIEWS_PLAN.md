# Materialized Views Implementation Plan

## Overview

This document outlines the plan to implement Materialized Views (MVs) in Tinybird to reduce QPS by 90-99% for Overview, Audience, and Conversions analytics queries.

## Architecture

### Current Flow
```
User Request → Convex Cache Check → [MISS] → Tinybird Query (scans raw events/sessions) → Store in Convex → Return
                                  → [HIT] → Return cached data
```

### New Flow with MVs
```
User Request → Convex Cache Check → [MISS] → Tinybird Query (scans hourly MVs) → Store in Convex → Return
                                  → [HIT] → Return cached data
```

## Created Materialized Views

### 1. `events_hourly_mv.datasource`
**Purpose**: Pre-aggregate event data at hourly granularity

**Key Aggregations**:
- `event_count`: Total events per hour/event_id
- `unique_sessions`: Unique sessions using uniq()
- `unique_users`: Unique users using uniq()
- `total_value_usd`: Sum of USD event values
- `page_unload_count`: For bounce rate calculation
- `total_time_on_page`: For session duration calculation

**Dimensions**:
- Campaign identifiers (workspace_id, project_id, campaign_id, environment)
- Event attributes (event_id, event_type)
- Traffic dimensions (device_type, country, city, utm_source, utm_medium, utm_campaign, referrer, source, landing_page_id, browser, device_os)

**Sorting Key**:
```
workspace_id, project_id, campaign_id, environment, campaign_environment, hour, event_id, device_type, country, utm_source
```

### 2. `sessions_hourly_mv.datasource`
**Purpose**: Pre-aggregate session data at hourly granularity

**Key Aggregations**:
- `session_count`: Total sessions per hour
- `unique_sessions`: Unique sessions using uniq()
- `unique_users`: Unique users using uniq()
- `new_sessions`: Count of new sessions (is_returning = 0)
- `returning_sessions`: Count of returning sessions (is_returning = 1)
- `total_duration`: Sum of session_duration for avg calculation
- `bounced_sessions`: Count of sessions < 3 seconds

**Dimensions**:
- Campaign identifiers (workspace_id, project_id, campaign_id, environment)
- Session attributes (device_type, device_os, browser, is_mobile, country, city, region, continent, language, timezone)
- Traffic attributes (utm_source, utm_medium, utm_campaign, referrer, source, ref, landing_page_id)
- Experiment attributes (segment_id, ab_test_variant_id)
- Temporal attributes (hour_of_day, day_of_week)

**Sorting Key**:
```
workspace_id, project_id, campaign_id, environment, campaign_environment, hour, device_type, country, utm_source
```

## Population Strategy

### Initial Backfill
```bash
# 1. Deploy the MV datasources
tb deploy --datasources events_hourly_mv.datasource
tb deploy --datasources sessions_hourly_mv.datasource

# 2. Backfill historical data (example for last 90 days)
# Run populate pipes with custom date ranges
tb pipe run populate_events_hourly_mv --param "start_date=2024-07-24" --param "end_date=2024-10-23"
tb pipe run populate_sessions_hourly_mv --param "start_date=2024-07-24" --param "end_date=2024-10-23"
```

### Ongoing Population
Set up scheduled jobs (cron) to run every hour at :05 past the hour:

```bash
# Run at 00:05, 01:05, 02:05, etc.
5 * * * * tb pipe run populate_events_hourly_mv
5 * * * * tb pipe run populate_sessions_hourly_mv
```

**Why :05 past the hour?**
- Ensures all events/sessions for the previous hour have been ingested
- Accounts for late-arriving data (up to 5 minutes)

## Deployment Steps

### Phase 1: Deploy MVs (Do NOT update pipes yet)
```bash
# 1. Deploy MV datasources
cd packages/tinybird
tb deploy --datasources events_hourly_mv.datasource
tb deploy --datasources sessions_hourly_mv.datasource

# 2. Verify datasources created
tb datasource ls | grep hourly_mv

# 3. Deploy population pipes
tb deploy --pipes populate_events_hourly_mv.pipe
tb deploy --pipes populate_sessions_hourly_mv.pipe

# 4. Run initial backfill (adjust date range as needed)
tb pipe run populate_events_hourly_mv
tb pipe run populate_sessions_hourly_mv

# 5. Verify data populated
tb sql "SELECT count(*) FROM events_hourly_mv"
tb sql "SELECT count(*) FROM sessions_hourly_mv"
```

### Phase 2: Update Analytics Pipes (One at a time)
```bash
# Test each pipe update in isolation

# 1. Update sum_primitives.pipe
tb deploy --pipes sum_primitives.pipe
# Test with Postman/curl
curl "https://api.tinybird.co/v0/pipes/sum_primitives.json?..."

# 2. Update timeseries_primitives.pipe
tb deploy --pipes timeseries_primitives.pipe
# Test

# 3. Update audience_breakdown.pipe
tb deploy --pipes audience_breakdown.pipe
# Test

# 4. Update conversions_breakdown.pipe
tb deploy --pipes conversions_breakdown.pipe
# Test
```

### Phase 3: Set Up Automated Population
```bash
# Add to your deployment automation (GitHub Actions, etc.)
# Or use Tinybird's built-in scheduler if available

# Example cron entry:
5 * * * * cd /path/to/firebuzz/packages/tinybird && tb pipe run populate_events_hourly_mv
5 * * * * cd /path/to/firebuzz/packages/tinybird && tb pipe run populate_sessions_hourly_mv
```

## Expected QPS Reduction

### Overview Analytics (sum_primitives, timeseries_primitives)

| Period | Current Rows Scanned | MV Rows Scanned | Reduction |
|--------|---------------------|-----------------|-----------|
| 7d     | ~500,000 events     | ~168 hourly rows | **99.97%** |
| 15d    | ~1,000,000 events   | ~360 hourly rows | **99.96%** |
| 30d    | ~2,000,000 events   | ~720 hourly rows | **99.96%** |

### Audience Breakdown

| Period | Current Rows Scanned | MV Rows Scanned | Reduction |
|--------|---------------------|-----------------|-----------|
| 7d     | ~200,000 sessions   | ~1,000 rows (168h × ~6 dimensions avg) | **99.5%** |
| 15d    | ~400,000 sessions   | ~2,000 rows | **99.5%** |
| 30d    | ~800,000 sessions   | ~4,000 rows | **99.5%** |

### Conversions Breakdown

| Period | Current Rows Scanned | MV Rows Scanned | Reduction |
|--------|---------------------|-----------------|-----------|
| 7d     | ~500,000 events     | ~1,000 rows | **99.8%** |
| 15d    | ~1,000,000 events   | ~2,000 rows | **99.8%** |
| 30d    | ~2,000,000 events   | ~4,000 rows | **99.8%** |

**Overall Expected QPS Reduction: 95-99%**

## Testing Plan

### 1. Data Accuracy Validation
Compare MV results with raw table results:

```sql
-- Test query: Compare sum_primitives results
-- Raw table version (current)
SELECT count(*) FROM events_v1
WHERE campaign_id = 'xxx'
  AND timestamp BETWEEN '2025-10-16' AND '2025-10-23';

-- MV version (new)
SELECT sumMerge(event_count) FROM events_hourly_mv
WHERE campaign_id = 'xxx'
  AND hour BETWEEN '2025-10-16 00:00:00' AND '2025-10-23 23:00:00';

-- Results should match!
```

### 2. Performance Testing
Measure query execution time:

```bash
# Before MV
time curl "https://api.tinybird.co/v0/pipes/sum_primitives.json?..."

# After MV
time curl "https://api.tinybird.co/v0/pipes/sum_primitives.json?..."

# Expected: 50-90% faster
```

### 3. QPS Monitoring
Track QPS in Tinybird dashboard:
- Baseline current QPS for 1 week
- Deploy MVs
- Monitor QPS for 1 week
- Expected: 90-95% reduction

## Rollback Plan

If issues arise, rollback is simple:

```bash
# Revert pipe changes using git
git checkout HEAD~1 -- packages/tinybird/endpoints/analytics/sum_primitives.pipe
# ... (revert other pipes)

# Redeploy old versions
tb deploy --pipes sum_primitives.pipe
# ... (redeploy other pipes)

# MVs can remain - they don't affect old pipes
```

## Next Steps After Deployment

1. **Monitor QPS reduction** - Track in Tinybird dashboard
2. **Monitor query performance** - Should be 50-90% faster
3. **Validate data accuracy** - Compare random samples
4. **Update realtime queries** (optional Phase 4)
   - Realtime queries can use 1-minute MVs if needed
   - Or keep using raw tables (only 30min window)

## Cost Implications

### Storage Costs
- MVs add ~10-20% storage overhead (pre-aggregated data)
- Far outweighed by query cost savings

### Query Costs
- 95-99% reduction in bytes scanned
- Projected cost savings: **$XXX/month** (calculate based on current Tinybird bill)

### Write Costs
- Slight increase in write processing (MV population)
- Negligible compared to query cost savings

**Net Expected Savings: 80-90% on analytics query costs**

## Support & Troubleshooting

### Common Issues

**Issue**: MV population failing
**Solution**: Check populate pipe logs, ensure raw tables have data

**Issue**: MV results don't match raw table results
**Solution**: Re-run backfill, check for data type mismatches

**Issue**: Queries slower with MVs
**Solution**: Check sorting key, ensure filters align with MV structure

### Useful Commands

```bash
# Check MV row count
tb sql "SELECT count(*) FROM events_hourly_mv"
tb sql "SELECT count(*) FROM sessions_hourly_mv"

# Check latest hour in MV
tb sql "SELECT max(hour) FROM events_hourly_mv"
tb sql "SELECT max(hour) FROM sessions_hourly_mv"

# Manually trigger population
tb pipe run populate_events_hourly_mv
tb pipe run populate_sessions_hourly_mv

# Check pipe execution logs
tb pipe logs populate_events_hourly_mv
```

## Timeline

- **Week 1**: Deploy MVs, backfill data, test accuracy
- **Week 2**: Update Overview pipes (sum_primitives, timeseries_primitives), monitor
- **Week 3**: Update Breakdown pipes (audience, conversions), monitor
- **Week 4**: Final optimization, documentation, consider realtime MVs

## Success Metrics

✅ 90%+ QPS reduction
✅ 50%+ query performance improvement
✅ 100% data accuracy (vs raw tables)
✅ No user-facing regressions
✅ Stable MV population (no failed runs)
