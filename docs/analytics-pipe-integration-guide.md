# Analytics Pipe Integration Guide

This guide provides step-by-step instructions for integrating new Tinybird analytics pipes into the Firebuzz analytics flow.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Integration Process](#integration-process)
4. [Example: Integrating Realtime Overview](#example-integrating-realtime-overview)
5. [Testing and Validation](#testing-and-validation)
6. [Troubleshooting](#troubleshooting)

## Architecture Overview

The Firebuzz analytics system follows this data flow:

```
Tinybird Pipes → Convex Integration → Convex Storage → Frontend Hook → UI Components
```

### Current Components

- **Tinybird Layer**: `/packages/tinybird/endpoints/*.pipe` - SQL queries that process raw data
- **Integration Layer**: `/packages/convex/convex/lib/tinybird.ts` - TypeScript schemas and pipe builders
- **Storage Layer**: `/packages/convex/convex/collections/analytics/` - Convex database operations
- **Hook Layer**: `/apps/app/src/hooks/state/use-campaign-analytics.ts` - React hook for state management
- **UI Layer**: `/apps/app/src/components/analytics/` - React components

### Currently Implemented Pipes

- `sum_primitives` - Aggregate metrics with period comparison
- `timeseries_primitives` - Time-series data for charts
- `audience_breakdown` - Demographic and traffic analysis
- `conversions_breakdown` - Conversion-focused analytics
- `realtime_overview` - Real-time metrics (pipe exists, not integrated)

## Prerequisites

Before integrating a new pipe, ensure you have:

1. **Tinybird Pipe**: The `.pipe` file exists in `/packages/tinybird/endpoints/`
2. **Understanding of Data Structure**: Know the input parameters and output schema
3. **Development Environment**: Local setup with Convex and Tinybird access
4. **TypeScript Knowledge**: Familiarity with Zod schemas and Convex types

## Integration Process

### Step 1: Define TypeScript Schemas in Tinybird Integration

**File**: `/packages/convex/convex/lib/tinybird.ts`

1. **Add Parameter Schema**:
```typescript
const newPipeParamsSchema = z.object({
  workspaceId: z.string(),
  projectId: z.string(),
  campaignId: z.string(),
  // Add your specific parameters
  lookbackMinutes: z.number().optional(),
  environment: z.union([
    z.literal("dev"),
    z.literal("production"),
    z.literal("preview"),
  ]),
  campaignEnvironment: z.union([z.literal("preview"), z.literal("production")]),
});
```

2. **Add Response Schema**:
```typescript
const newPipeResponseSchema = z.object({
  // Define your pipe's output structure
  active_sessions: z.number(),
  events: z.number(),
  countries: z.array(z.string()),
  devices: z.array(z.string()),
});
```

3. **Build Pipe Endpoint**:
```typescript
export const getNewPipe = tinybird.buildPipe({
  pipe: "your_pipe_name",
  parameters: newPipeParamsSchema,
  data: newPipeResponseSchema,
});
```

4. **Export Convex Validator**:
```typescript
export const newPipeParamsConvex = zodToConvex(newPipeParamsSchema);
```

### Step 2: Update Convex Analytics Schema

**File**: `/packages/convex/convex/collections/analytics/schema.ts`

1. **Add Query ID to Union**:
```typescript
const queryBaseSchema = v.object({
  // ... existing fields
  queryId: v.union(
    v.literal("sum-primitives"),
    v.literal("timeseries-primitives"),
    v.literal("audience-breakdown"),
    v.literal("conversions-breakdown"),
    v.literal("your-new-pipe"), // Add this line
  ),
  // ... rest of fields
});
```

2. **Create Schema for Your Pipe**:
```typescript
export const yourNewPipeSchema = v.object({
  ...queryBaseSchema.fields,
  queryId: v.literal("your-new-pipe"),
  payload: v.object({
    // Define the payload structure matching your Tinybird response
    active_sessions: v.number(),
    events: v.number(),
    countries: v.array(v.string()),
    devices: v.array(v.string()),
  }),
});
```

3. **Add to Schema Union**:
```typescript
export const analyticsPipesSchema = defineTable(
  v.union(
    sumPrimitivesSchema,
    timeseriesPrimitivesSchema,
    audienceBreakdownSchema,
    conversionsBreakdownSchema,
    yourNewPipeSchema, // Add this line
  ),
)
  .index("by_campaign_query", ["campaignId", "queryId"])
  .index("by_workspace_project", ["workspaceId", "projectId"])
  .index("by_last_updated", ["lastUpdatedAt"]);
```

### Step 3: Update Convex Queries

**File**: `/packages/convex/convex/collections/analytics/queries.ts`

1. **Add to Internal Query Union**:
```typescript
export const getByQueryId = internalQuery({
  args: {
    campaignId: v.id("campaigns"),
    queryId: v.union(
      v.literal("sum-primitives"),
      v.literal("timeseries-primitives"),
      v.literal("audience-breakdown"),
      v.literal("conversions-breakdown"),
      v.literal("your-new-pipe"), // Add this line
    ),
  },
  handler: async (ctx, args) => {
    // ... existing implementation
  },
});
```

2. **Create Public Query**:
```typescript
export const getYourNewPipe = query({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    await verifyCampaignAccess(ctx, args.campaignId);

    const result = await ctx.db
      .query("analyticsPipes")
      .withIndex("by_campaign_query", (q) =>
        q.eq("campaignId", args.campaignId).eq("queryId", "your-new-pipe"),
      )
      .first();

    if (!result) {
      return null;
    }

    return result as Extract<
      Doc<"analyticsPipes">,
      { queryId: "your-new-pipe" }
    >;
  },
});
```

3. **Update getAllCampaignAnalytics** (if needed):
```typescript
export const getAllCampaignAnalytics = query({
  // ... existing implementation
  handler: async (ctx, args) => {
    // ... existing code
    const yourNewPipe = allResults.find((r) => r.queryId === "your-new-pipe");

    return {
      // ... existing returns
      yourNewPipe: yourNewPipe as Extract<
        Doc<"analyticsPipes">,
        { queryId: "your-new-pipe" }
      > | null,
    };
  },
});
```

### Step 4: Update Convex Mutations

**File**: `/packages/convex/convex/collections/analytics/mutations.ts`

1. **Add to CreateAnalyticsPipe Union**:
```typescript
export const createAnalyticsPipe = internalMutation({
  args: {
    queryId: v.union(
      v.literal("sum-primitives"),
      v.literal("timeseries-primitives"),
      v.literal("audience-breakdown"),
      v.literal("conversions-breakdown"),
      v.literal("your-new-pipe"), // Add this line
    ),
    // ... rest of args
  },
  // ... rest of implementation
});
```

2. **Add to Revalidate Queries Union**:
```typescript
export const revalidateAnalytics = mutation({
  args: {
    campaignId: v.id("campaigns"),
    queries: v.array(
      v.union(
        // ... existing query objects
        v.object({
          queryId: v.literal("your-new-pipe"),
          // Define required parameters for your pipe
          lookbackMinutes: v.optional(v.number()),
          campaignEnvironment: v.union(
            v.literal("preview"),
            v.literal("production"),
          ),
        }),
      ),
    ),
  },
  // ... rest of implementation
});
```

### Step 5: Update Convex Actions

**File**: `/packages/convex/convex/collections/analytics/actions.ts`

1. **Import Your Pipe Function**:
```typescript
import {
  // ... existing imports
  getYourNewPipe,
} from "../../lib/tinybird";
```

2. **Add Parameter Schema**:
```typescript
const yourNewPipeParamsSchema = v.object({
  queryId: v.literal("your-new-pipe"),
  lookbackMinutes: v.optional(v.number()),
  campaignEnvironment: campaignEnvironmentSchema,
});
```

3. **Add to Query Params Union**:
```typescript
const queryParamsSchema = v.union(
  sumPrimitivesParamsSchema,
  timeseriesPrimitivesParamsSchema,
  audienceBreakdownParamsSchema,
  conversionsBreakdownParamsSchema,
  yourNewPipeParamsSchema, // Add this line
);
```

4. **Add Type Definition**:
```typescript
type YourNewPipeData = {
  active_sessions: number;
  events: number;
  countries: string[];
  devices: string[];
};
```

5. **Update Data Type Union**:
```typescript
let data:
  | SumPrimitivesData
  | TimeseriesData
  | AudienceBreakdownData
  | ConversionsBreakdownData
  | YourNewPipeData; // Add this line
```

6. **Add Handler Logic**:
```typescript
export const fetchAnalyticsPipe = internalAction({
  // ... existing implementation
  handler: async (ctx, args) => {
    // ... existing code

    } else if (params.queryId === "your-new-pipe") {
      const response = await getYourNewPipe({
        workspaceId,
        projectId,
        campaignId,
        environment: (process.env.ENVIRONMENT || "dev") as "dev" | "production" | "preview",
        campaignEnvironment: params.campaignEnvironment,
        lookbackMinutes: params.lookbackMinutes || 30,
      });

      const singleData = response.data[0];
      if (!singleData) {
        throw new Error("No data returned from your new pipe");
      }
      data = singleData;
    } else {
      throw new Error("Unknown query type");
    }

    // ... rest of implementation
  },
});
```

### Step 6: Update useCampaignAnalytics Hook

**File**: `/apps/app/src/hooks/state/use-campaign-analytics.ts`

1. **Add Query**:
```typescript
// Add new query
const yourNewPipeQuery = useCachedQuery(
  api.collections.analytics.queries.getYourNewPipe,
  shouldFetchAnalytics ? { campaignId } : "skip"
);
```

2. **Update Revalidate Function**:
```typescript
const revalidate = useCallback(async () => {
  // ... existing code

  if (currentScreen === "overview") {
    // ... existing queries

    // Add your new pipe query
    queries.push({
      queryId: "your-new-pipe" as const,
      campaignEnvironment: currentIsPreview
        ? ("preview" as const)
        : ("production" as const),
      lookbackMinutes: 30, // or make this configurable
    });
  }

  // ... rest of implementation
}, [/* dependencies */]);
```

3. **Update Data Return**:
```typescript
const data = useMemo(() => {
  return {
    sumPrimitives: sumPrimitivesQuery,
    timeseriesPrimitives: timeseriesPrimitivesQuery,
    audienceBreakdown: audienceBreakdownQuery,
    conversionsBreakdown: conversionsBreakdownQuery,
    yourNewPipe: yourNewPipeQuery, // Add this line
    landingPages: landingPagesQuery,
  };
}, [
  sumPrimitivesQuery,
  timeseriesPrimitivesQuery,
  audienceBreakdownQuery,
  conversionsBreakdownQuery,
  yourNewPipeQuery, // Add this line
  landingPagesQuery,
]);
```

### Step 7: Create UI Components

**File**: `/apps/app/src/components/analytics/your-new-component.tsx`

```typescript
"use client";

import { useCampaignAnalytics } from "@/hooks/state/use-campaign-analytics";

interface YourNewComponentProps {
  campaignId: string;
}

export const YourNewComponent = ({ campaignId }: YourNewComponentProps) => {
  const { data } = useCampaignAnalytics({ campaignId });

  const yourPipeData = data.yourNewPipe?.payload;

  if (!yourPipeData) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h3>Real-time Analytics</h3>
      <p>Active Sessions: {yourPipeData.active_sessions}</p>
      <p>Events: {yourPipeData.events}</p>
      <p>Countries: {yourPipeData.countries.join(", ")}</p>
      <p>Devices: {yourPipeData.devices.join(", ")}</p>
    </div>
  );
};
```

## Example: Integrating Realtime Overview

Let's walk through integrating the existing `realtime_overview` pipe:

### 1. Tinybird Integration (lib/tinybird.ts)

```typescript
const realtimeOverviewParamsSchema = z.object({
  workspaceId: z.string(),
  projectId: z.string(),
  campaignId: z.string(),
  environment: z.union([
    z.literal("dev"),
    z.literal("production"),
    z.literal("preview"),
  ]),
  campaignEnvironment: z.union([z.literal("preview"), z.literal("production")]),
  lookbackMinutes: z.number().optional(),
});

const realtimeOverviewResponseSchema = z.object({
  active_sessions: z.number(),
  events: z.number(),
  countries: z.array(z.string()),
  devices: z.array(z.string()),
});

export const getRealtimeOverview = tinybird.buildPipe({
  pipe: "realtime_overview",
  parameters: realtimeOverviewParamsSchema,
  data: realtimeOverviewResponseSchema,
});

export const realtimeOverviewParamsConvex = zodToConvex(
  realtimeOverviewParamsSchema,
);
```

### 2. Schema Updates (collections/analytics/schema.ts)

```typescript
// Add to queryId union
queryId: v.union(
  v.literal("sum-primitives"),
  v.literal("timeseries-primitives"),
  v.literal("audience-breakdown"),
  v.literal("conversions-breakdown"),
  v.literal("realtime-overview"), // Add this
),

// Create schema
export const realtimeOverviewSchema = v.object({
  ...queryBaseSchema.fields,
  queryId: v.literal("realtime-overview"),
  payload: v.object({
    active_sessions: v.number(),
    events: v.number(),
    countries: v.array(v.string()),
    devices: v.array(v.string()),
  }),
});

// Add to union
export const analyticsPipesSchema = defineTable(
  v.union(
    sumPrimitivesSchema,
    timeseriesPrimitivesSchema,
    audienceBreakdownSchema,
    conversionsBreakdownSchema,
    realtimeOverviewSchema, // Add this
  ),
)
```

### 3. Continue following Steps 3-7 with "realtime-overview" as the queryId.

## Testing and Validation

### 1. Tinybird Testing
```bash
# Test pipe directly in Tinybird
cd packages/tinybird
tb pipe build your_pipe_name
tb pipe test your_pipe_name --param workspaceId=test
```

### 2. Convex Testing
```typescript
// Test in Convex dashboard
await api.collections.analytics.mutations.revalidateAnalytics({
  campaignId: "test-campaign-id",
  queries: [{
    queryId: "your-new-pipe",
    campaignEnvironment: "preview",
    // ... other params
  }]
});
```

### 3. Frontend Testing
- Check browser DevTools for query execution
- Verify data appears in components
- Test revalidation functionality

## Troubleshooting

### Common Issues

1. **Schema Validation Errors**
   - Ensure Zod and Convex schemas match exactly
   - Check parameter types (string vs number)

2. **Query Not Triggering**
   - Verify `shouldFetchAnalytics` conditions
   - Check campaign status and permissions

3. **Data Not Updating**
   - Check 3-minute cache logic in mutations
   - Verify Tinybird pipe returns data

4. **TypeScript Errors**
   - Ensure all unions include new pipe queryId
   - Check type assertions in queries

5. **Rate Limiting**
   - Check Convex rate limit configuration
   - Monitor scheduled actions in dashboard

### Debug Steps

1. **Check Tinybird Response**:
```typescript
console.log("Tinybird response:", response);
```

2. **Verify Database Storage**:
```typescript
// In Convex dashboard
db.query("analyticsPipes")
  .filter(q => q.eq(q.field("queryId"), "your-new-pipe"))
  .collect()
```

3. **Monitor Hook State**:
```typescript
console.log("Hook data:", data);
console.log("Should fetch:", shouldFetchAnalytics);
```

## Best Practices

1. **Naming Conventions**: Use kebab-case for queryIds
2. **Error Handling**: Always check for data existence before accessing
3. **Performance**: Consider caching strategies for expensive pipes
4. **Documentation**: Update this guide when adding new patterns
5. **Testing**: Test with different campaign states and user permissions

---

This guide should be updated whenever new patterns or requirements emerge in the analytics system.