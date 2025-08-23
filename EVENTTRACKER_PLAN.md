# EventTracker Durable Object Implementation Plan

## Current Architecture Analysis

The current system has:
1. **Session tracking** via cookies and queue-based Tinybird ingestion
2. **Two Tinybird tables**: `session_v1` (context data) and `events_v1` (behavioral events) 
3. **Queue-based processing** with session consumer and adaptive queue service
4. **AB test DO** for variant selection
5. **Session management** in `/lib/session.ts` with cookie-based persistence

## Proposed Architecture: Unified EventTracker Durable Object

### 1. Core EventTracker Durable Object (`/src/durable-objects/event-tracker.ts`)

**Features:**
- **Session Management**: Handle session lifecycle, timeouts, and persistence
- **Event Buffering**: Collect events in memory with intelligent batching
- **Tinybird Integration**: Batch send both session and event data
- **Performance Optimization**: Smart batching based on time windows and batch sizes
- **Reliability**: Handle retries, rate limiting, and fallback strategies

**Key Methods:**
- `initSession(sessionData)` - Initialize or resume session
- `trackEvent(eventData)` - Buffer event, auto-increment sequence, trigger batch if needed
- `flushEvents()` - Force send buffered events to Tinybird
- `getSessionData()` - Get current session state
- `expireSession()` - Mark session as expired and cleanup DO state
- `alarm()` - Handle session timeouts, periodic flushing, and DO cleanup

**Session Event Sequencing:**
- DO maintains `eventSequence` counter starting from 1
- Each `trackEvent()` call auto-increments sequence
- Ensures consistent ordering regardless of client timing
- Sequence resets to 1 when session expires/renews

### 2. Shared Types & Schemas (`@packages/shared-types/src/events/`)

**New Event Types (`@packages/shared-types/src/events/types.ts`):**
```typescript
// Event schema matching events_v1 datasource
interface EventData {
  timestamp: string;
  id: string;
  event_id: string;
  event_value: string;
  event_value_type: string;
  event_type: 'pageview' | 'click' | 'scroll' | 'form_submit' | 'conversion';
  
  // Context IDs (no geo/device data - stored in session_v1)
  user_id: string;
  campaign_id: string;
  session_id: string;
  attribution_id: string;
  workspace_id: string;
  project_id: string;
  landing_page_id: string;
  ab_test_id?: string;
  ab_test_variant_id?: string;
  
  // Event-specific data
  form_id?: string;
  clicked_element?: string;
  clicked_url?: string;
  page_load_time?: number;
  dom_ready_time?: number;
  scroll_percentage?: number;
  time_on_page?: number;
  session_event_sequence: number; // Managed by DO
  viewport_width?: number;
  viewport_height?: number;
  
  // Environment
  metadata?: string;
  environment: string;
  campaign_environment: string;
  page_url: string;
  referrer_url?: string;
}

// Session state managed by DO
interface DOSessionState {
  sessionId: string;
  userId: string;
  campaignId: string;
  workspaceId: string;
  projectId: string;
  attributionId: string;
  landingPageId: string;
  abTestId?: string;
  abTestVariantId?: string;
  
  // DO management
  eventBuffer: EventData[];
  eventSequence: number; // Auto-increment for each event
  lastActivity: number;
  sessionTimeout: number;
  createdAt: number;
  isExpired: boolean;
}
```

**Zod Schemas (`@packages/shared-types/src/events/schemas.ts`):**
```typescript
import { z } from 'zod';

export const eventDataSchema = z.object({
  // ... full validation schema matching events_v1 datasource
});

export const trackEventRequestSchema = z.object({
  session_id: z.string(),
  event_type: z.enum(['pageview', 'click', 'scroll', 'form_submit', 'conversion']),
  event_value: z.string().optional(),
  // ... other optional fields
});
```

### 3. Thin Client API (`/src/api/v1/events/index.ts`)

**Endpoints:**
- `POST /api/v1/events/track` - Forward event to appropriate EventTracker DO
- `POST /api/v1/events/session` - Initialize/resume session via DO
- `GET /api/v1/events/session/:id` - Get session state from DO

**Responsibilities:**
- Request validation using Zod schemas
- Route to correct EventTracker DO instance (by session ID)
- Minimal error handling and response formatting

### 4. Enhanced Queue Types (`/src/types/queue.ts`)

**Updated Types:**
```typescript
// Support both session and event messages
type QueueMessage = SessionQueueMessage | EventQueueMessage;

interface EventQueueMessage {
  type: 'event';
  data: EventData;
  sessionId: string;
  retryCount?: number;
  timestamp: string;
}
```

### 5. Tinybird Integration Updates (`/src/lib/tinybird.ts`)

**New Functions:**
- `batchIngestEvents()` - Send event batches to events_v1 table
- `ingestEventAndSession()` - Send both event and session data in single request
- Schema validation for EventData matching events_v1 datasource

### 6. Worker Configuration Updates

**Add EventTracker DO to wrangler.toml:**
```toml
[[durable_objects.bindings]]
name = "EVENT_TRACKER"
class_name = "EventTracker"
```

**Update Env interface:**
```typescript
interface Env {
  // ... existing bindings
  EVENT_TRACKER: DurableObjectNamespace<EventTracker>;
}
```

## Implementation Strategy

### Phase 1: Durable Object Foundation
1. Create EventTracker DO with basic session management
2. Implement event buffering with configurable batch sizes
3. Add Tinybird integration for both session and event data
4. Include session timeout handling via alarms

### Phase 2: API Layer
1. Create thin client API endpoints with Zod validation
2. Implement DO routing logic (hash-based on session ID)
3. Add error handling and response formatting
4. Update existing session creation to use DO

### Phase 3: Integration & Testing
1. Update existing campaign handlers to use new API
2. Migrate session queue logic to use EventTracker DO
3. Add monitoring and metrics for DO performance
4. Implement fallback strategies for DO unavailability

### Phase 4: Performance & Reliability
1. Fine-tune batching parameters (time windows, sizes)
2. Add intelligent retry logic and rate limiting
3. Implement DO cleanup strategies for expired sessions
4. Add comprehensive error handling and logging

## DO Lifecycle Management

### Session Expiration & Cleanup
1. **Automatic Expiration**: Sessions expire after configurable timeout (5-30 minutes)
2. **Cleanup Process**: 
   - Flush remaining events to Tinybird
   - Mark session as expired in DO state
   - Set alarm for DO hibernation (after final flush)
3. **Memory Management**: Clear event buffers and session data on expiration
4. **Graceful Degradation**: Handle expired sessions with new session creation

### Event Sequence Management
1. **Server-Side Authority**: DO increments `session_event_sequence` for each event
2. **Consistency Guarantee**: Events always have correct sequence regardless of client
3. **Session Boundary**: Sequence resets to 1 for new sessions
4. **Gap Handling**: No gaps in sequence due to server-side management

## Key Benefits

1. **Unified Architecture**: Single DO handles both session and event management
2. **Better Performance**: Intelligent batching reduces Tinybird API calls
3. **Improved Reliability**: Centralized error handling and retry logic
4. **Simplified Debugging**: All event processing in one place
5. **Cost Optimization**: Reduced queue usage and more efficient batching
6. **Future-Proof**: Easy to extend with new event types and features

## Compatibility Considerations

- Maintain existing cookie-based session for client-side access
- Preserve current Tinybird table schemas (session_v1, events_v1)
- Keep queue system as fallback for DO unavailability
- Ensure gradual migration path with feature flags

This plan consolidates all event handling into a single, efficient Durable Object while maintaining compatibility with existing systems and providing a clear migration path.