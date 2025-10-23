# Populating Materialized Views

The MVs (`events_hourly_mv` and `sessions_hourly_mv`) need to be populated with historical and ongoing data.

## Manual Population via SQL

Since Tinybird doesn't support INSERT pipes, we populate MVs using SQL queries directly.

### 1. Populate Events MV (Backfill)

```sql
INSERT INTO events_hourly_mv
SELECT
    workspace_id,
    project_id,
    campaign_id,
    environment,
    campaign_environment,
    toStartOfHour(timestamp) AS hour,
    event_id,
    event_type,
    sumState(CAST(1 AS UInt64)) AS event_count,
    uniqState(session_id) AS unique_sessions,
    uniqState(user_id) AS unique_users,
    sumState(CAST(if(event_value_currency = 'USD', event_value, 0) AS Float64)) AS total_value_usd,
    sumState(CAST(if(event_id = 'page-unload', 1, 0) AS UInt64)) AS page_unload_count,
    sumState(CAST(coalesce(time_on_page, 0) AS Float64)) AS total_time_on_page,
    coalesce(nullIf(device_type, ''), 'Unknown') AS device_type,
    coalesce(nullIf(country, ''), 'Unknown') AS country,
    coalesce(nullIf(city, ''), 'Unknown') AS city,
    coalesce(nullIf(utm_source, ''), 'Direct') AS utm_source,
    coalesce(nullIf(utm_medium, ''), 'Direct') AS utm_medium,
    coalesce(nullIf(utm_campaign, ''), 'Direct') AS utm_campaign,
    coalesce(nullIf(referrer, ''), 'Direct') AS referrer,
    coalesce(nullIf(source, ''), 'Direct') AS source,
    coalesce(nullIf(landing_page_id, ''), 'Unknown') AS landing_page_id,
    coalesce(nullIf(browser, ''), 'Unknown') AS browser,
    coalesce(nullIf(device_os, ''), 'Unknown') AS device_os
FROM events_v1
WHERE timestamp >= toDateTime('2024-07-24 00:00:00', 'UTC')  -- Adjust start date
  AND timestamp < toDateTime('2024-10-24 00:00:00', 'UTC')   -- Adjust end date
GROUP BY
    workspace_id,
    project_id,
    campaign_id,
    environment,
    campaign_environment,
    hour,
    event_id,
    event_type,
    device_type,
    country,
    city,
    utm_source,
    utm_medium,
    utm_campaign,
    referrer,
    source,
    landing_page_id,
    browser,
    device_os
```

### 2. Populate Sessions MV (Backfill)

```sql
INSERT INTO sessions_hourly_mv
SELECT
    workspace_id,
    project_id,
    campaign_id,
    environment,
    campaign_environment,
    toStartOfHour(timestamp) AS hour,
    sumState(CAST(1 AS UInt64)) AS session_count,
    uniqState(session_id) AS unique_sessions,
    uniqState(user_id) AS unique_users,
    sumState(CAST(if(is_returning = 0, 1, 0) AS UInt64)) AS new_sessions,
    sumState(CAST(if(is_returning = 1, 1, 0) AS UInt64)) AS returning_sessions,
    sumState(CAST(coalesce(session_duration, 0) AS Float64)) AS total_duration,
    sumState(CAST(if(session_duration < 3, 1, 0) AS UInt64)) AS bounced_sessions,
    coalesce(nullIf(device_type, ''), 'Unknown') AS device_type,
    coalesce(nullIf(device_os, ''), 'Unknown') AS device_os,
    coalesce(nullIf(browser, ''), 'Unknown') AS browser,
    is_mobile,
    coalesce(nullIf(country, ''), 'Unknown') AS country,
    coalesce(nullIf(city, ''), 'Unknown') AS city,
    coalesce(nullIf(region, ''), 'Unknown') AS region,
    coalesce(nullIf(continent, ''), 'Unknown') AS continent,
    coalesce(nullIf(language, ''), 'Unknown') AS language,
    coalesce(nullIf(timezone, ''), 'Unknown') AS timezone,
    coalesce(nullIf(utm_source, ''), 'Direct') AS utm_source,
    coalesce(nullIf(utm_medium, ''), 'Direct') AS utm_medium,
    coalesce(nullIf(utm_campaign, ''), 'Direct') AS utm_campaign,
    coalesce(nullIf(referrer, ''), 'Direct') AS referrer,
    coalesce(nullIf(source, ''), 'Direct') AS source,
    coalesce(nullIf(ref, ''), 'Direct') AS ref,
    coalesce(nullIf(landing_page_id, ''), 'Unknown') AS landing_page_id,
    coalesce(nullIf(segment_id, ''), 'Unknown') AS segment_id,
    coalesce(nullIf(ab_test_variant_id, ''), 'Unknown') AS ab_test_variant_id,
    toHour(timestamp) AS hour_of_day,
    toDayOfWeek(timestamp) AS day_of_week
FROM session_v1
WHERE timestamp >= toDateTime('2024-07-24 00:00:00', 'UTC')  -- Adjust start date
  AND timestamp < toDateTime('2024-10-24 00:00:00', 'UTC')   -- Adjust end date
GROUP BY
    workspace_id,
    project_id,
    campaign_id,
    environment,
    campaign_environment,
    hour,
    device_type,
    device_os,
    browser,
    is_mobile,
    country,
    city,
    region,
    continent,
    language,
    timezone,
    utm_source,
    utm_medium,
    utm_campaign,
    referrer,
    source,
    ref,
    landing_page_id,
    segment_id,
    ab_test_variant_id,
    hour_of_day,
    day_of_week
```

## Running the Population Queries

### Via Tinybird CLI

```bash
# For events MV
tb sql "$(cat <<'EOF'
INSERT INTO events_hourly_mv
SELECT ...
EOF
)"

# For sessions MV
tb sql "$(cat <<'EOF'
INSERT INTO sessions_hourly_mv
SELECT ...
EOF
)"
```

### Via Tinybird UI

1. Go to https://cloud.tinybird.co
2. Navigate to "SQL Console"
3. Paste the INSERT query
4. Click "Run"

### Via API (for automation)

```bash
curl -X POST "https://api.tinybird.co/v0/sql" \
  -H "Authorization: Bearer ${TINYBIRD_TOKEN}" \
  -d "q=INSERT INTO events_hourly_mv SELECT ..."
```

## Ongoing Population (Hourly)

Set up a cron job or scheduled task to populate new hours:

```bash
#!/bin/bash
# populate_mvs_hourly.sh

# Events MV - populate last complete hour
tb sql "INSERT INTO events_hourly_mv SELECT ... WHERE timestamp >= now() - INTERVAL 2 HOUR AND timestamp < now() - INTERVAL 1 HOUR ..."

# Sessions MV - populate last complete hour
tb sql "INSERT INTO sessions_hourly_mv SELECT ... WHERE timestamp >= now() - INTERVAL 2 HOUR AND timestamp < now() - INTERVAL 1 HOUR ..."
```

**Cron schedule** (run at :05 past every hour):
```cron
5 * * * * /path/to/populate_mvs_hourly.sh
```

## Verification

Check that MVs are populated:

```sql
-- Check row count
SELECT count(*) FROM events_hourly_mv;
SELECT count(*) FROM sessions_hourly_mv;

-- Check latest hour
SELECT max(hour) FROM events_hourly_mv;
SELECT max(hour) FROM sessions_hourly_mv;

-- Sample data
SELECT * FROM events_hourly_mv ORDER BY hour DESC LIMIT 10;
SELECT * FROM sessions_hourly_mv ORDER BY hour DESC LIMIT 10;
```

## Next Steps

Once MVs are populated:
1. Update analytics pipes to query MVs instead of raw tables
2. Test query performance and data accuracy
3. Deploy updated pipes to production
4. Monitor QPS reduction in Tinybird dashboard
