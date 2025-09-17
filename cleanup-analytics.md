# Analytics Cleanup Required

## Issue
After refactoring analytics to use compound indexing with period and environment parameters, we have duplicate records because:

1. Old records in the database don't have the new `period` and `campaignEnvironment` fields
2. The compound index query `["campaignId", "queryId", "period", "campaignEnvironment"]` doesn't match old records that are missing these fields
3. When the system doesn't find existing records, it creates new ones, leading to duplicates

## Solution Options

### Option 1: Database Cleanup (Recommended)
Delete all existing analytics records and let the system regenerate them with proper fields:

```javascript
// In Convex dashboard, run this mutation:
export const cleanupAnalytics = internalMutation({
  handler: async (ctx) => {
    const allRecords = await ctx.db.query("analyticsPipes").collect();
    for (const record of allRecords) {
      await ctx.db.delete(record._id);
    }
    return { deleted: allRecords.length };
  }
});
```

### Option 2: Migration Script
Update existing records to include default period and environment values:

```javascript
export const migrateAnalytics = internalMutation({
  handler: async (ctx) => {
    const allRecords = await ctx.db.query("analyticsPipes").collect();
    const updated = [];

    for (const record of allRecords) {
      if (!record.period || !record.campaignEnvironment) {
        await ctx.db.patch(record._id, {
          period: "7d", // default period
          campaignEnvironment: "production", // default environment
          conversionEventId: undefined,
          eventIds: undefined,
        });
        updated.push(record._id);
      }
    }

    return { updated: updated.length };
  }
});
```

### Option 3: Backward Compatibility Query
Modify queries to handle both old and new record formats (more complex).

## Recommendation
**Use Option 1 (Database Cleanup)** since we're in development and analytics data can be regenerated.