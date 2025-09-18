# Schema Sync Guide: Tinybird ↔ Convex

When modifying Tinybird pipe response schemas, you must update corresponding Convex schemas to maintain type safety and functionality.

## Files to Update

### 1. Tinybird Response Schemas
**File:** `packages/convex/convex/lib/tinybird.ts`

Update the Zod schema that corresponds to your modified pipe:
- `overviewAnalyticsResponseSchema`
- `realtimeOverviewResponseSchema`
- `abTestResultsResponseSchema`
- `sumPrimitivesResponseSchema`
- `timeseriesPrimitivesResponseSchema`
- `audienceBreakdownResponseSchema`
- `conversionsBreakdownResponseSchema`

### 2. Convex Collection Schemas
**File:** `packages/convex/convex/collections/analytics/schema.ts`

Update the payload schema in the corresponding collection schema:
- `sumPrimitivesSchema.payload`
- `timeseriesPrimitivesSchema.payload`
- `audienceBreakdownSchema.payload`
- `conversionsBreakdownSchema.payload`
- `realtimeOverviewSchema.payload`

## Common Schema Changes

### Adding New Fields
1. **Tinybird pipe** → Add field to response
2. **tinybird.ts** → Add field to Zod response schema
3. **schema.ts** → Add field to Convex payload schema

### Removing Fields
1. **Tinybird pipe** → Remove field from response
2. **tinybird.ts** → Remove field from Zod response schema
3. **schema.ts** → Remove field from Convex payload schema

### Modifying Field Types
1. **Tinybird pipe** → Change field type/format
2. **tinybird.ts** → Update Zod type validation
3. **schema.ts** → Update Convex value type

## Example: Adding Segment Support

**Tinybird Change:**
```sql
-- Added segment_conversions array to conversions_breakdown.pipe
segment_conversions: z.array(conversionSegmentSchema),
```

**Required Convex Updates:**

1. **tinybird.ts:**
```typescript
const conversionsBreakdownResponseSchema = z.object({
  // ... existing fields
  segment_conversions: z.array(conversionSegmentSchema),
  // ... rest of fields
});
```

2. **schema.ts:**
```typescript
export const conversionsBreakdownSchema = v.object({
  // ... existing fields
  payload: v.object({
    // ... existing payload fields
    segment_conversions: v.array(v.array(v.union(v.string(), v.number()))),
    // ... rest of payload fields
  }),
});
```

## Deployment Order

1. **Deploy Tinybird changes first** (pipes with new schema)
2. **Deploy Convex changes second** (updated schemas)
3. **Test endpoints** to ensure schema compatibility

## Notes

- Pipe names in `tinybird.ts` should match actual deployed pipe names (no folder paths)
- Convex schemas use `v.array(v.array(v.union(v.string(), v.number())))` for Tinybird tuple arrays
- Always maintain backward compatibility when possible
- Test both local and production deployments

## Quick Checklist

When modifying a Tinybird pipe response:

- [ ] Update Zod schema in `packages/convex/convex/lib/tinybird.ts`
- [ ] Update Convex schema in `packages/convex/convex/collections/analytics/schema.ts`
- [ ] Deploy Tinybird changes
- [ ] Deploy Convex changes
- [ ] Test endpoint functionality