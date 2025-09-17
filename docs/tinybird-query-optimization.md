# Tinybird Query Size Optimization Guide

This document outlines strategies for optimizing Tinybird queries to stay within the 256KB query size limit while maintaining functionality and schema compatibility.

## Understanding the Query Size Limit

### The 256KB Limit
- **Default limit**: ClickHouse (Tinybird's underlying engine) has a default `max_query_size` of 262,144 bytes (256KB)
- **Detection method**: Counts the literal byte size of the SQL query text, not the result size or memory usage
- **Error pattern**: Fails around position 262,128 with "Max query size exceeded" SYNTAX_ERROR
- **What gets counted**: All SQL text including keywords, identifiers, strings, whitespace, comments, and formatting

### When You Hit the Limit
```
Error: Syntax error: failed at position 262128 (' ') (line 5341, col 43):  . Max query size exceeded
```

## Optimization Strategies

### 1. Reduce Query Repetition

**Problem**: Repeated subqueries in every node
```sql
-- BAD: Repeated in every conversion breakdown
countIf(e.event_id = (SELECT conversion_event_id FROM params)) AS conversions,
sumIf(e.event_value, e.event_id = (SELECT conversion_event_id FROM params)) AS conversion_value_usd,
```

**Solution**: Use WITH clauses to define once, reference many times
```sql
-- GOOD: Define once at the top of each node
WITH (SELECT conversion_event_id FROM params) AS cev
SELECT
    countIf(e.event_id = cev) AS conversions,
    sumIf(e.event_value, e.event_id = cev) AS conversion_value_usd,
```

**Savings**: ~50-100 characters per reference, multiplied across dozens of nodes = thousands of characters saved

### 2. Simplify Conditional Logic

**Problem**: Verbose conditional expressions
```sql
-- BAD: Verbose if-then-else with zero check
if(count(DISTINCT s.session_id) = 0, 0, round((countIf(...) * 100.0) / count(DISTINCT s.session_id), 2))
```

**Solution**: Use null-safe operators
```sql
-- GOOD: Shorter and handles division by zero elegantly
round(countIf(...) * 100.0 / nullIf(count(DISTINCT s.session_id), 0), 2)
```

### 3. Optimize CASE Statements

**Problem**: Long CASE WHEN chains
```sql
-- BAD: Verbose case statement
CASE
    WHEN toDayOfWeek(e.timestamp) = 1 THEN 'Monday'
    WHEN toDayOfWeek(e.timestamp) = 2 THEN 'Tuesday'
    WHEN toDayOfWeek(e.timestamp) = 3 THEN 'Wednesday'
    -- ... continues for all days
    ELSE 'Unknown'
END AS day_name
```

**Solution**: Use array indexing or multiIf
```sql
-- GOOD: Array indexing (much shorter)
['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][toDayOfWeek(e.timestamp)] AS day_name

-- ALTERNATIVE: multiIf function
multiIf(
    e.event_value = 0, '$0',
    e.event_value <= 10, '$1-10',
    e.event_value <= 50, '$11-50',
    '$1000+'
) AS value_range
```

### 4. Remove Redundant Elements

**Problem**: Unnecessary descriptions and markers
```sql
-- BAD: Extra descriptions and markers
NODE device_conversions
DESCRIPTION "Conversion analysis by device type"

SQL >
    %
    SELECT ...
```

**Solution**: Minimal syntax
```sql
-- GOOD: Just the essentials
NODE device_conversions
SQL >
    SELECT ...
```

### 5. Use Shorter Aliases and Variable Names

**Problem**: Long, descriptive names everywhere
```sql
-- BAD: Long parameter names and aliases
conversion_event_id, new_user_conversions, returning_user_conversions
```

**Solution**: Shorter aliases where context is clear
```sql
-- GOOD: Shorter aliases (but keep output names for schema compatibility)
cev, new_conversions, ret_conversions
```

## Implementation Example

Here's a before/after comparison from our `conversions_breakdown.pipe` optimization:

### Before (Contributing to 256KB+ size)
```sql
NODE device_conversions
DESCRIPTION "Conversion analysis by device type"

SQL >
    %
    SELECT
        s.device_type,
        count(DISTINCT s.session_id) AS sessions,
        uniqExact(s.user_id) AS users,
        countIf(e.event_id = (SELECT conversion_event_id FROM params)) AS conversions,
        sumIf(e.event_value, e.event_id = (SELECT conversion_event_id FROM params)) AS conversion_value_usd,
        if(count(DISTINCT s.session_id) = 0, 0, round((countIf(e.event_id = (SELECT conversion_event_id FROM params)) * 100.0) / count(DISTINCT s.session_id), 2)) AS conversion_rate,
        countIf(s.is_returning = 0 AND e.event_id = (SELECT conversion_event_id FROM params)) AS new_user_conversions,
        countIf(s.is_returning = 1 AND e.event_id = (SELECT conversion_event_id FROM params)) AS returning_user_conversions
    FROM base_sessions s
    LEFT JOIN all_events e ON s.session_id = e.session_id
    GROUP BY s.device_type
    ORDER BY conversions DESC
    LIMIT 10
```

### After (Optimized)
```sql
NODE device_conversions
SQL >
    WITH (SELECT conversion_event_id FROM params) AS cev
    SELECT
        s.device_type,
        count(DISTINCT s.session_id) AS sessions,
        uniqExact(s.user_id) AS users,
        countIf(e.event_id = cev) AS conversions,
        sumIf(e.event_value, e.event_id = cev) AS conversion_value_usd,
        round(countIf(e.event_id = cev) * 100.0 / nullIf(count(DISTINCT s.session_id), 0), 2) AS conversion_rate,
        countIf(s.is_returning = 0 AND e.event_id = cev) AS new_user_conversions,
        countIf(s.is_returning = 1 AND e.event_id = cev) AS returning_user_conversions
    FROM base_sessions s
    LEFT JOIN all_events e ON s.session_id = e.session_id
    GROUP BY s.device_type
    ORDER BY conversions DESC
    LIMIT 10
```

**Character savings per node**: ~200-300 characters
**Total nodes in conversions_breakdown**: ~15 nodes
**Total estimated savings**: 3,000-4,500 characters

## Alternative Approaches

### 1. Split Large Endpoints
If optimizations aren't enough, consider splitting functionality:
```sql
-- Main endpoint: conversions_breakdown.pipe
-- Separate endpoint: referrer_source_conversions.pipe
-- Additional endpoint: temporal_conversions.pipe (hourly/daily)
```

### 2. Use UNION ALL for Similar Breakdowns
Instead of separate CTEs, combine similar analyses:
```sql
SELECT 'utm_source' AS breakdown_type, utm_source AS dimension, ...
FROM base_sessions s
LEFT JOIN all_events e ON s.session_id = e.session_id
GROUP BY utm_source

UNION ALL

SELECT 'utm_medium' AS breakdown_type, utm_medium AS dimension, ...
FROM base_sessions s
LEFT JOIN all_events e ON s.session_id = e.session_id
GROUP BY utm_medium
```

### 3. Parameterized Breakdown Queries
Create a single, parameterized query that can handle different breakdown types based on input parameters.

## Schema Compatibility

### Maintaining Output Structure
When optimizing, ensure the output schema remains unchanged:

1. **Keep field names identical**: Even if you use shorter internal aliases, the final SELECT should use the expected field names
2. **Preserve data types**: Ensure optimizations don't change number to string or vice versa
3. **Maintain array structures**: Keep tuple orders and types consistent

### Convex Integration
Remember to update both:
1. **Tinybird response schema** (`/packages/convex/convex/lib/tinybird.ts`)
2. **Convex database schema** (`/packages/convex/convex/collections/analytics/schema.ts`)

## Measuring Success

### Before Optimization
- File size: Check with `wc -c filename.pipe`
- Deployment: Look for "Max query size exceeded" errors
- Error position: Note the character position where parsing fails

### After Optimization
- Successful deployment to both local and cloud environments
- All existing functionality preserved
- New features can be added within the limit

## Best Practices

1. **Start with the biggest wins**: Focus on repeated subqueries first
2. **Preserve readability**: Don't make code unreadable for minor savings
3. **Test thoroughly**: Ensure optimizations don't change behavior
4. **Monitor deployments**: Watch for size limit issues in CI/CD
5. **Plan for growth**: Leave some headroom for future features

## Tools and Commands

### Check file size:
```bash
wc -c /path/to/endpoint.pipe
```

### Validate deployment:
```bash
tb deploy --check                    # Local validation
tb --cloud deploy --check           # Cloud validation
```

### Deploy:
```bash
tb deploy --wait --auto             # Local deployment
tb --cloud deploy --wait --auto     # Cloud deployment
```

## Troubleshooting

### Common Issues
1. **Still hitting limit**: Try splitting into multiple endpoints
2. **Schema mismatches**: Ensure Convex schemas are updated
3. **Deployment failures**: Check for syntax errors introduced during optimization
4. **Performance changes**: Monitor query execution times after optimization

### Rollback Strategy
Always maintain the ability to rollback:
1. Keep original files in version control
2. Test optimizations in development first
3. Have a rollback plan for production deployments

---

*Last updated: September 2025*
*Example: conversions_breakdown.pipe optimization that added referrer_conversions and source_conversions while staying under 256KB limit*