# @firebuzz/analytics Package Implementation Plan

## Overview

This document outlines the implementation plan for creating a public npm package `@firebuzz/analytics` for tracking events on landing pages hosted outside the monorepo. The package will integrate with the existing Firebuzz event tracking system.

## System Architecture Analysis

### Cookie Structure (from `/apps/engine/src/lib/session.ts`)
- **Campaign-scoped cookies**: 
  - `frbzz_{campaign_id}_session` - Contains session data
  - `frbzz_{campaign_id}_attribution` - Contains attribution data
  - User ID cookie (environment dependent):
    - Production: `frbzz_uid`
    - Preview: `frbzz_uid_{campaign_id}`
- **Cookie properties**: Accessible client-side (`httpOnly: false`), JSON+URI encoded
- **Session cookie content**: `sessionId`, `campaignId`, `landingPageId`, `abTest: {testId, variantId}`, `createdAt`
- **Note**: Consider adding `sessionEndsAt` field to session cookie for client-side session validation
- **Attribution cookie content**: `attributionId`, `campaignId`, `createdAt`, `source`, `medium`, `campaign`
- **Preview environment detection**: Domains like `preview-env.frbzz.com`, `preview-preview.frbzz.com`, `preview.frbzz.com`

### Event Tracking Flow
1. Client sends events to `/v1/events/track` with session_id
2. Engine gets EventTracker Durable Object by session_id
3. DO manages event sequencing and batching to Tinybird
4. Events require: `event_id` (identifier), `event_value` (string), `event_type`, plus session context

### Event Types (Updated from current system)
- `conversion` - Form submissions, external link clicks
- `engagement` - Page views, scroll events
- `system` - **NEW**: Pageload/domready events (needs to be added to shared-types)

## Implementation Plan

### Phase 1: Update Shared Types
**Location**: `/packages/shared-types/src/events/schemas.ts`

- Add `system` event type to `eventDataSchema` and `trackEventRequestSchema`
- Update event type enum: `z.enum(["conversion", "engagement", "system"])`

### Phase 2: Package Structure
```
packages/analytics/
├── src/
│   ├── provider.tsx          # Main AnalyticsProvider component
│   ├── context.tsx           # React context for analytics state
│   ├── hooks.ts              # useAnalytics hook
│   ├── cookies.ts            # Cookie parsing utilities
│   ├── api.ts                # API client for session/event endpoints
│   ├── tracking/
│   │   ├── default-events.ts # Default event implementations
│   │   ├── observers.ts      # DOM observers for scroll, clicks
│   │   └── utils.ts          # Event tracking utilities
│   ├── types.ts              # TypeScript types
│   └── index.ts              # Public API exports
├── package.json              # NPM package configuration
├── tsconfig.json             # TypeScript configuration
├── tsup.config.ts            # Build configuration
└── README.md                 # Documentation
```

### Phase 3: Core Components

#### AnalyticsProvider Props Interface
```typescript
interface AnalyticsProviderProps {
  apiUrl: string;                      // e.g., "https://engine.firebuzz.com"
  campaignId: string;                  // Required to read correct cookies
  workspaceId: string;                 // From landing page context
  projectId: string;                   // From landing page context
  landingPageId: string;              // Current landing page
  // Note: abTestId and abTestVariantId are now read from session cookie
  customEvents?: CustomEventConfig[]; // Additional custom events
  cookiePrefix?: string;              // Default: "frbzz_"
  enableDefaultEvents?: boolean;      // Default: true
  debug?: boolean;                    // Console logging
}
```

#### Cookie Reading Strategy
Based on `/apps/engine/src/lib/session.ts` patterns:
- **Environment Detection**: Check if hostname matches preview patterns (`*.preview.frbzz.com`, `preview-*.frbzz.com`)
- **Session Cookie**: Parse `frbzz_{campaignId}_session` for:
  - `session_id` 
  - `abTest.testId` and `abTest.variantId` (if in AB test)
  - `landingPageId`, `campaignId`, `createdAt`
- **Attribution Cookie**: Parse `frbzz_{campaignId}_attribution` for `attribution_id`
- **User ID Cookie**: Environment-dependent parsing:
  - Production: Parse `frbzz_uid` for `user_id`
  - Preview: Parse `frbzz_uid_{campaignId}` for `user_id`
- **Cookie Parsing**: Handle `JSON.parse(decodeURIComponent(cookieValue))` with error handling
- **Validation**: Validate expiry, campaign matching, and data integrity

#### Event Tracking Interface
```typescript
interface TrackEventParams {
  event_id: string;              // e.g., "form-submission", "pageload", "external-link-click"
  event_type: 'conversion' | 'engagement' | 'system';
  event_value?: string;          // Actual value as string (e.g., "10", "20")
  event_value_type?: 'static' | 'dynamic';
  
  // Optional event-specific data (from trackEventRequestSchema)
  form_id?: string;
  clicked_element?: string;
  clicked_url?: string;
  scroll_percentage?: number;
  time_on_page?: number;
  viewport_width?: number;
  viewport_height?: number;
  metadata?: string;
  page_url?: string;
  referrer_url?: string;
}
```

### Phase 4: Default Events Implementation

#### System Events (Automatic)
- **pageload**: `event_id: "pageload"`, `event_type: "system"`
  - Fires on `window.addEventListener('load')`
  - Captures page load timing
- **domready**: `event_id: "domready"`, `event_type: "system"`
  - Fires on `document.addEventListener('DOMContentLoaded')`
  - Captures DOM ready timing

#### Engagement Events
- **pageview**: `event_id: "pageview"`, `event_type: "engagement"`
  - Fired after successful session initialization
- **scroll tracking**: `event_id: "scroll"`, `event_type: "engagement"`
  - Track at 25%, 50%, 75%, 100% scroll thresholds
  - Include `scroll_percentage` in event data
- **external-link-click**: `event_id: "external-link-click"`, `event_type: "engagement"`
  - Track clicks on links to external domains
  - Include `clicked_url` and `clicked_element`

#### Conversion Events
- **form-submission**: `event_id: "form-submission"`, `event_type: "conversion"`
  - Track form submissions with `form_id`
  - Capture form data as metadata

### Phase 5: API Integration

#### Session Initialization
**Endpoint**: `POST /v1/events/session/init`

**Request body** (from `initSessionRequestSchema`):
```typescript
{
  session_id: string,           // From session cookie
  campaign_id: string,
  workspace_id: string,
  project_id: string,
  landing_page_id: string,
  user_id: string,              // From user ID cookie (env-dependent)
  attribution_id: string,       // From attribution cookie
  ab_test_id?: string,          // From session cookie abTest.testId
  ab_test_variant_id?: string,  // From session cookie abTest.variantId
  session_timeout_minutes: number // Default 30
}
```

#### Event Tracking
**Endpoint**: `POST /v1/events/track`

**Request body** (from `trackEventRequestSchema`):
```typescript
{
  session_id: string,
  event_type: "conversion" | "engagement" | "system",
  event_value?: string,
  event_value_type?: "dynamic" | "static",
  
  // Optional fields based on event type
  form_id?: string,
  clicked_element?: string,
  clicked_url?: string,
  scroll_percentage?: number,
  time_on_page?: number,
  viewport_width?: number,
  viewport_height?: number,
  metadata?: string,
  page_url?: string,
  referrer_url?: string
}
```

### Phase 6: Build & Publishing Configuration

#### Package.json
```json
{
  "name": "@firebuzz/analytics",
  "version": "1.0.0",
  "description": "Analytics tracking for Firebuzz landing pages",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  }
}
```

#### Build Configuration (tsup.config.ts)
- Dual ESM/CJS builds
- TypeScript declaration files
- Tree-shakeable exports
- Minified production builds

### Phase 7: Usage Example

#### Basic Integration
```typescript
// In landing page template
import { AnalyticsProvider } from '@firebuzz/analytics';

function App() {
  return (
    <AnalyticsProvider
      apiUrl="https://engine.firebuzz.com"
      campaignId="campaign_123"
      workspaceId="workspace_456"
      projectId="project_789"
      landingPageId="landing_abc"
      // Note: abTestId and abTestVariantId are automatically read from cookies
    >
      {/* Your landing page content */}
    </AnalyticsProvider>
  );
}
```

#### Manual Event Tracking
```typescript
import { useAnalytics } from '@firebuzz/analytics';

function MyComponent() {
  const { trackEvent } = useAnalytics();
  
  const handleCustomEvent = () => {
    trackEvent({
      event_id: "custom-action",
      event_type: "conversion",
      event_value: "25",
      event_value_type: "static",
      metadata: JSON.stringify({ source: "button-click" })
    });
  };
  
  return <button onClick={handleCustomEvent}>Track Custom Event</button>;
}
```

## Session Duration & Validation

### Current Challenge
Session duration is customizable per campaign (`CampaignConfig.sessionDurationInMinutes`), but the analytics package needs to validate session expiry client-side without making API calls.

### Recommended Solution: Add sessionEndsAt to Session Cookie
**Location**: `/apps/engine/src/lib/session.ts`

Modify the `SessionData` interface and session creation functions:

```typescript
export interface SessionData {
  sessionId: string;
  campaignId: string;
  landingPageId?: string;
  abTest?: {
    testId: string;
    variantId: string;
  };
  createdAt: number;
  sessionEndsAt: number; // Add this field
}

// In createSession function
const sessionData: SessionData = {
  sessionId,
  campaignId,
  createdAt: now,
  sessionEndsAt: now + (sessionDurationInMinutes * 60 * 1000), // Add this
};
```

### Client-Side Session Validation
```typescript
function isSessionValid(sessionData: SessionCookieData): boolean {
  if (!sessionData.sessionEndsAt) {
    // Fallback: assume session duration is 30 minutes if not provided
    const assumedDuration = 30 * 60 * 1000;
    return (Date.now() - sessionData.createdAt) < assumedDuration;
  }
  
  return Date.now() < sessionData.sessionEndsAt;
}
```

### Alternative: Pass sessionDurationMinutes as Prop
If modifying the cookie is not desired, the analytics package could accept `sessionDurationMinutes` as a prop and calculate expiry client-side.

## Session Renewal Flow

### Current Issue
When a session expires, the current system returns errors but doesn't provide a way to create new sessions from the client-side analytics package.

### Recommended Server-Side Enhancement
**Location**: `/apps/engine/src/client-api/v1/events/session.ts` and `/apps/engine/src/client-api/v1/events/track.ts`

#### Enhanced Session Validation Response
The `sessionValidationResponseSchema` already includes `new_session_id` field. We should implement:

```typescript
// When session is expired, generate new session ID and return it
if (!result.success && result.error === "Session expired") {
  const newSessionId = generateUniqueId();
  return c.json({
    valid: false,
    reason: "expired",
    new_session_id: newSessionId, // Provide new session ID
  }, 200);
}
```

#### Enhanced Track Event Response
When tracking fails due to expired session, provide session renewal:

```typescript
// In track.ts, when session is expired
if (!result.success && result.error === "Session expired") {
  const newSessionId = generateUniqueId();
  return c.json({
    success: false,
    error: "Session expired",
    new_session_id: newSessionId, // Provide new session ID for renewal
  }, 200); // Return 200, not 400, so client can handle gracefully
}
```

#### Enhanced Session Init API - Cookie Management
**Location**: `/apps/engine/src/client-api/v1/events/session.ts`

The session init API should set the new session cookie:

```typescript
import { createBaseSession } from "../../lib/session";

// In session init route, after successful DO initialization
if (result.success) {
  // Create and set the new session cookie
  const sessionData = createBaseSession(c, sessionData.campaign_id, {
    sessionDurationInMinutes: sessionData.session_timeout_minutes,
    // ... other config needed
  });
  
  // Optionally update the session with AB test data if present
  if (sessionData.ab_test_id && sessionData.ab_test_variant_id) {
    updateSessionWithVariant(
      c,
      sessionData,
      sessionData.session_timeout_minutes,
      sessionData.ab_test_id,
      sessionData.ab_test_variant_id
    );
  }

  return c.json({
    success: true,
    data: {
      session_id: result.session_id || sessionData.session_id,
    },
  }, 200);
}
```

#### Alternative: Dedicated Session Renewal Endpoint
Create a dedicated endpoint for session renewal:

```typescript
// New endpoint: POST /v1/events/session/renew
.post("/session/renew", async (c) => {
  try {
    const body = await c.req.json();
    const { 
      old_session_id, 
      new_session_id,
      campaign_id,
      workspace_id,
      project_id,
      landing_page_id,
      session_timeout_minutes = 30
    } = body;

    // Initialize new DO session
    const doId = c.env.EVENT_TRACKER.idFromName(new_session_id);
    const eventTracker = c.env.EVENT_TRACKER.get(doId);

    // Get user/attribution data from existing cookies
    const userId = getCurrentUserId(c, campaign_id, isPreviewEnv);
    const attribution = getCurrentAttribution(c, campaign_id);

    const sessionData = {
      session_id: new_session_id,
      campaign_id,
      workspace_id,
      project_id,
      landing_page_id,
      user_id: userId,
      attribution_id: attribution?.attributionId,
      ab_test_id: getAbTestFromOldSession(), // Extract from old session
      ab_test_variant_id: getAbTestVariantFromOldSession(),
      session_timeout_minutes
    };

    // Initialize DO
    const result = await eventTracker.initSession(sessionData);

    if (result.success) {
      // Set new session cookie - this is the key part!
      const newSessionCookie = createBaseSession(c, campaign_id, {
        sessionDurationInMinutes: session_timeout_minutes
      });

      return c.json({
        success: true,
        data: { session_id: new_session_id }
      }, 200);
    }

    return c.json({
      success: false,
      error: "Failed to renew session"
    }, 400);

  } catch (error) {
    return c.json({
      success: false,
      error: "Internal server error"
    }, 500);
  }
})
```

### Client-Side Session Renewal Logic
**Location**: Analytics package

```typescript
async function trackEvent(eventData: TrackEventParams) {
  let sessionId = getSessionIdFromCookie();
  
  // Attempt to track event
  const response = await fetch(`${apiUrl}/v1/events/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, ...eventData })
  });
  
  const result = await response.json();
  
  // Handle session renewal
  if (!result.success && result.new_session_id) {
    console.log('Session expired, renewing session');
    
    // Renew session with provided session ID (this will set new cookie!)
    const renewalResult = await renewSession(sessionId, result.new_session_id);
    
    if (renewalResult.success) {
      // Session cookie is now updated by server
      // Retry tracking with new session
      return trackEvent(eventData);
    }
  }
  
  return result;
}

async function renewSession(oldSessionId: string, newSessionId: string) {
  const renewalData = {
    old_session_id: oldSessionId,
    new_session_id: newSessionId,
    campaign_id: campaignId,
    workspace_id: workspaceId,
    project_id: projectId,
    landing_page_id: landingPageId,
    session_timeout_minutes: 30
  };
  
  const response = await fetch(`${apiUrl}/v1/events/session/renew`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(renewalData),
    credentials: 'include' // Important: Include cookies so server can set new ones
  });
  
  return response.json();
}

// Initial session setup (called once when analytics provider initializes)
async function initializeSession(sessionId?: string) {
  // Use provided session ID or generate new one
  const session_id = sessionId || generateUniqueId();
  
  // Get data from cookies and props
  const sessionData = {
    session_id,
    campaign_id: campaignId,
    workspace_id: workspaceId,
    project_id: projectId,
    landing_page_id: landingPageId,
    user_id: getUserIdFromCookie(),
    attribution_id: getAttributionIdFromCookie(),
    ab_test_id: getAbTestIdFromCookie(),
    ab_test_variant_id: getAbTestVariantIdFromCookie(),
    session_timeout_minutes: 30
  };
  
  const response = await fetch(`${apiUrl}/v1/events/session/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionData),
    credentials: 'include' // Include cookies for server to set session cookie
  });
  
  return response.json();
}
```

### Key Improvements

1. **Server Sets Cookie**: Both `/session/init` and `/session/renew` endpoints set the session cookie
2. **Credentials Include**: Client includes `credentials: 'include'` so server can set cookies
3. **Dedicated Renewal**: Separate `/session/renew` endpoint handles session transitions
4. **AB Test Continuity**: Server extracts AB test data from old session cookie and preserves it
5. **User/Attribution Continuity**: Server reads user ID and attribution from existing cookies

## Environment Detection & Cookie Parsing Implementation

### Preview Environment Detection
```typescript
function isPreviewEnvironment(): boolean {
  const hostname = window.location.hostname;
  return hostname.includes('preview.frbzz.com') || 
         hostname.startsWith('preview-') && hostname.includes('.frbzz.com');
}
```

### Cookie Reading Utilities
```typescript
function getUserIdCookie(campaignId: string, isPreview: boolean): string {
  return isPreview ? `frbzz_uid_${campaignId}` : 'frbzz_uid';
}

function parseCookieValue<T>(value: string | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(decodeURIComponent(value)) as T;
  } catch {
    return null;
  }
}

interface SessionCookieData {
  sessionId: string;
  campaignId: string;
  landingPageId?: string;
  abTest?: {
    testId: string;
    variantId: string;
  };
  createdAt: number;
  sessionEndsAt?: number; // Recommended addition to engine
}

function getSessionData(campaignId: string): SessionCookieData | null {
  const sessionCookie = document.cookie
    .split('; ')
    .find(row => row.startsWith(`frbzz_session_${campaignId}=`))
    ?.split('=')[1];
    
  return parseCookieValue<SessionCookieData>(sessionCookie);
}
```

## Key Technical Considerations

### Error Handling
- Graceful fallbacks when cookies are missing
- Retry logic for failed API calls
- Silent failures to not break landing pages

### Performance
- Lazy loading of tracking scripts
- Debounced scroll events
- Efficient DOM observers

### Privacy & Security
- Only read necessary cookie data
- Validate session data before sending
- Support opt-out mechanisms

### Browser Compatibility
- Modern browser support (ES2020+)
- Polyfills for older browsers if needed
- SSR compatibility for Next.js/other frameworks

## Dependencies from Existing System

### From DEFAULT_CAMPAIGN_EVENTS (`/packages/utils/src/constants.ts`)
```typescript
[
  {
    id: "form-submission",
    title: "Form Submission",
    type: "conversion",
    // ...
  },
  {
    id: "external-link-click", 
    title: "External Link Click",
    type: "conversion",
    // ...
  },
  {
    id: "page-view",
    title: "Page View",
    type: "engagement",
    // ...
  }
]
```

### Event Types to Add
- `pageload` (system)
- `domready` (system)
- `scroll` (engagement)

## Implementation Tasks

### Phase 1: Foundation
- [ ] Update shared-types with 'system' event type
- [ ] Create package structure
- [ ] Set up build configuration

### Phase 2: Core Functionality  
- [ ] Implement cookie reading utilities
- [ ] Create API client for session/events
- [ ] Build AnalyticsProvider component

### Phase 3: Event Tracking
- [ ] Implement default system events
- [ ] Add engagement event observers
- [ ] Create conversion event handlers

### Phase 4: Integration & Testing
- [ ] Test with existing engine endpoints
- [ ] Validate against event schemas
- [ ] Performance optimization

### Phase 5: Publishing
- [ ] Configure npm publishing
- [ ] Create documentation
- [ ] Version and release

This plan provides a comprehensive roadmap for implementing the @firebuzz/analytics package while maintaining compatibility with the existing Firebuzz event tracking infrastructure.