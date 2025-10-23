-- Backfill events_hourly_mv with last 90 days of data
-- This will pre-aggregate historical event data for faster analytics queries

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
WHERE timestamp >= now() - INTERVAL 90 DAY
  AND timestamp < now()
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
