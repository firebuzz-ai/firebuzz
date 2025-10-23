# Materialized Views - Next Steps

## ✅ What's Been Done

1. **MVs Deployed** to both local and production Tinybird
   - `events_hourly_mv` - Hourly event aggregations
   - `sessions_hourly_mv` - Hourly session aggregations

2. **SQL Scripts Created** in `sql/` directory
   - `populate_events_mv_backfill.sql` - Backfill events (90 days)
   - `populate_sessions_mv_backfill.sql` - Backfill sessions (90 days)

3. **Documentation Created**
   - `MATERIALIZED_VIEWS_PLAN.md` - Full strategy
   - `POPULATE_MVS.md` - Population guide
   - This file - Next steps

## 📋 What Needs to Be Done (Manual Steps)

### Step 1: Populate MVs with Historical Data

**Important**: Tinybird CLI doesn't support INSERT queries. You must use the UI or API.

#### Via Tinybird UI (Easiest)

1. Open https://cloud.tinybird.co
2. Select workspace: "Firebuzz"
3. Go to "SQL Console" (top menu)
4. **For events MV**:
   - Copy all contents from `sql/populate_events_mv_backfill.sql`
   - Paste into SQL Console
   - Click "Run"
   - Wait ~5-10 minutes (processing 90 days of events)
5. **For sessions MV**:
   - Copy all contents from `sql/populate_sessions_mv_backfill.sql`
   - Paste into SQL Console
   - Click "Run"
   - Wait ~5-10 minutes (processing 90 days of sessions)

#### Verify Population

Run these queries in SQL Console:

```sql
-- Check row counts
SELECT count(*) as total_rows FROM events_hourly_mv;
SELECT count(*) as total_rows FROM sessions_hourly_mv;

-- Check date range
SELECT min(hour) as earliest, max(hour) as latest FROM events_hourly_mv;
SELECT min(hour) as earliest, max(hour) as latest FROM sessions_hourly_mv;

-- Sample data
SELECT * FROM events_hourly_mv ORDER BY hour DESC LIMIT 5;
SELECT * FROM sessions_hourly_mv ORDER BY hour DESC LIMIT 5;
```

Expected results:
- events_hourly_mv: ~50,000-200,000 rows (depends on traffic)
- sessions_hourly_mv: ~20,000-100,000 rows
- Date range: ~90 days back from now

### Step 2: Deploy Updated Analytics Pipes

**Status**: Ready to deploy once MVs are populated

Updated pipes (already modified to use MVs):
- ✅ `sum_primitives.pipe` - Uses events_hourly_mv & sessions_hourly_mv
- ✅ `timeseries_primitives.pipe` - Uses events_hourly_mv & sessions_hourly_mv
- ✅ `audience_breakdown.pipe` - Uses sessions_hourly_mv
- ✅ `conversions_breakdown.pipe` - Uses events_hourly_mv

Deployment command (after MVs are populated):
```bash
# Test on local first
pnpm exec tb deploy --check

# Deploy to local
pnpm exec tb deploy --wait --auto

# Test the pipes work correctly
# Then deploy to production
pnpm exec tb --cloud deploy --check
pnpm exec tb --cloud deploy --wait --auto
```

### Step 3: Set Up Hourly MV Updates (Optional for now)

After validating everything works, set up automated hourly updates:

Create a GitHub Action or cron job that runs these queries hourly:

```sql
-- Update events MV (last 2 hours of data)
INSERT INTO events_hourly_mv
SELECT ... FROM events_v1
WHERE timestamp >= now() - INTERVAL 2 HOUR
  AND timestamp < now() - INTERVAL 1 HOUR
...

-- Update sessions MV (last 2 hours of data)
INSERT INTO sessions_hourly_mv
SELECT ... FROM session_v1
WHERE timestamp >= now() - INTERVAL 2 HOUR
  AND timestamp < now() - INTERVAL 1 HOUR
...
```

## 📊 Expected Results After Deployment

### Performance Improvements

| Metric | Before MVs | After MVs | Improvement |
|--------|-----------|-----------|-------------|
| QPS (7d query) | ~500K rows scanned | ~170 rows scanned | **99.97%** ⬇️ |
| Query time (7d) | ~2-5 seconds | ~0.2-0.5 seconds | **80-90%** ⬇️ |
| Cost | $X/month | ~$0.1X/month | **90%** ⬇️ |

### Data Accuracy

MVs should return identical results to raw table queries (within rounding for floating point).

## 🐛 Troubleshooting

### Issue: MV population fails

**Solution**: Check that events_v1 and session_v1 have data for the date range

```sql
SELECT count(*) FROM events_v1 WHERE timestamp >= now() - INTERVAL 90 DAY;
SELECT count(*) FROM session_v1 WHERE timestamp >= now() - INTERVAL 90 DAY;
```

### Issue: Updated pipes return no data

**Solution**: Verify MVs are populated (see verification queries above)

### Issue: Data mismatch between MV and raw tables

**Solution**: Re-run population queries, check for data type issues

## ⏭️ Order of Operations

1. ✅ MVs deployed (DONE)
2. ⏳ **Populate MVs manually via Tinybird UI** (YOU ARE HERE)
3. ⏳ Verify MV data
4. ⏳ Deploy updated pipes to local
5. ⏳ Test queries return correct data
6. ⏳ Deploy updated pipes to production
7. ⏳ Monitor QPS reduction in Tinybird dashboard
8. ⏳ Set up hourly MV updates (GitHub Action or cron)

## ❓ Questions?

- Can't access Tinybird UI? Check permissions for workspace "Firebuzz"
- MVs not showing up? Run `pnpm exec tb datasource ls | grep hourly_mv`
- Need help with pipe updates? The updated pipe files are ready to deploy

## 🎯 Success Criteria

- [ ] MVs populated with 90 days of historical data
- [ ] Verification queries show expected row counts
- [ ] Updated pipes deployed to production
- [ ] QPS reduced by 90%+ (check Tinybird dashboard)
- [ ] Query performance improved by 50%+
- [ ] No data accuracy issues reported
