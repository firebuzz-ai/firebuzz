# Focused Analytics Package Refactor Plan

## Executive Summary
Refactor the analytics package to implement proper session management with server-authoritative user IDs, local expiration validation, focused attribution data preservation, and fix missing segmentId tracking.

## Critical Constraints & Principles
1. **User ID Authority**: NEVER generate user IDs client-side - always from session context
2. **Server Session Authority**: Server generates session IDs and expiration times
3. **Local Expiration**: Use `sessionEndsAt` for validation, no server validation calls
4. **Attribution Preservation**: Preserve only attribution data that server can't detect fresh
5. **SegmentId Fix**: Ensure segmentId flows from context → cookies → Tinybird
6. **Consent Separation**: Session validity independent of cookie consent

## Phase 1: Core Architecture Changes

### 1.1 Update Session Context Interface (Server-Side)
**File**: `packages/analytics/src/types.ts`
```typescript
session: {
  sessionId: string;
  expiresAt: number;    // NEW: Add server-provided expiration
  createdAt: number;    // NEW: Add creation timestamp
  abTest?: {
    testId: string;
    variantId: string;
  };
}
```

### 1.2 Focused Session Data Interface
**File**: `packages/analytics/src/types.ts`
```typescript
interface SessionData {
  userId: string;           // Always from sessionContext.userId
  sessionId: string;        // From context or renewal response
  expiresAt: number;        // From context.session.expiresAt
  createdAt: number;        // From context.session.createdAt
  campaignId: string;
  landingPageId?: string;
  segmentId?: string | null;  // FIXED: Ensure this flows to Tinybird
  abTestId?: string | null;
  abTestVariantId?: string | null;
}

// Focused attribution data (only what server can't detect fresh)
interface AttributionData {
  original: {
    timestamp: number;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
    ref?: string;              // Additional attribution field
    source?: string;           // Source attribution
    referrer?: string;
    landingPage: string;
  };
  current: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
    ref?: string;              // Current ref
    source?: string;           // Current source
  };
}

// Focused session storage (only attribution that needs preservation)
interface SessionStorage {
  attribution: AttributionData;        // Only store attribution data
  abTest?: { testId: string; variantId: string; };
  renewalCount: number;
  originalSessionId: string;
  originalTimestamp: number;
}
```

### 1.3 Fix SegmentId Tracking (CRITICAL BUG)
**Problem**: SegmentId flows from context → cookies but NOT to Tinybird

**Files to fix**:
1. **`packages/analytics/src/api.ts`** - Add `segment_id` to `trackingData` in `trackSession()`
2. **`apps/engine/src/client-api/v1/events/session.ts`** - Handle `segment_id` in renewal payload

**Fix Details**:
```typescript
// In trackSession() function, add missing field:
const trackingData = {
  // ... existing fields
  campaign_id: sessionContext.campaignId,
  landing_page_id: sessionContext.landingPageId,
  segment_id: sessionContext.segmentId || null,  // ADD THIS LINE
  // ... rest of fields
};
```

### 1.4 Remove Client-Side User ID Generation
**Files to modify**:
- Remove `getEphemeralUserId()` method entirely
- Remove all `generateUniqueId()` calls for user IDs
- Remove user ID fallback logic in cookies
- Always use `sessionContext.userId`

## Phase 2: Session Manager Refactor

### 2.1 Core Session Manager Architecture
**File**: `packages/analytics/src/session-manager.ts`

```typescript
export class SessionManager {
  private config: SessionManagerConfig;
  private consentState: ConsentState | null = null;
  private sessionStorage: SessionStorage | null = null; // NEW

  // Core session extraction (authority: session context)
  getSessionFromContext(): SessionData | null {
    const sessionContext = this.getSessionContext();
    if (!sessionContext) return null;

    return {
      userId: sessionContext.userId,        // NEVER generate
      sessionId: sessionContext.session.sessionId,
      expiresAt: sessionContext.session.expiresAt,
      createdAt: sessionContext.session.createdAt,
      campaignId: sessionContext.campaignId,
      landingPageId: sessionContext.landingPageId,
      segmentId: sessionContext.segmentId,
      abTestId: sessionContext.abTestId,
      abTestVariantId: sessionContext.abTestVariantId,
    };
  }

  // Local expiration check (no server calls)
  isSessionExpired(session: SessionData): boolean {
    return Date.now() >= session.expiresAt;
  }

  // Enhanced getCurrentSession with proper priority
  getCurrentSession(): SessionData | null {
    // 1. Always start with session context (authoritative)
    const contextSession = this.getSessionFromContext();
    if (!contextSession) return null;

    // 2. Check if session is expired
    if (this.isSessionExpired(contextSession)) {
      return null; // Force renewal
    }

    // 3. If cookies allowed, try to get persisted session for continuity
    if (this.shouldSetCookies()) {
      const persistedSession = this.getSessionCookie();
      if (persistedSession && !this.isSessionExpired(persistedSession)) {
        // Merge: use context user ID, persisted session if valid
        return {
          ...persistedSession,
          userId: contextSession.userId, // Always prefer context
        };
      }
    }

    return contextSession;
  }
}
```

### 2.2 Attribution Data Management
```typescript
// NEW methods in SessionManager
initializeAttribution(sessionData: SessionData): void {
  if (this.sessionStorage?.attribution) return; // Already initialized

  const currentUTM = this.extractCurrentUTM();
  this.sessionStorage = {
    attribution: {
      original: {
        timestamp: sessionData.createdAt,
        ...currentUTM,
        referrer: document.referrer || undefined,
        landingPage: window.location.pathname,
      },
      current: currentUTM,
    },
    renewalCount: 0,
    originalSessionId: sessionData.sessionId,
  };

  // Persist if consent given
  if (this.shouldSetCookies()) {
    this.setAttributionCookie(this.sessionStorage);
  }
}

loadPersistedAttribution(): void {
  if (this.shouldSetCookies()) {
    const persisted = this.getAttributionCookie();
    if (persisted) {
      this.sessionStorage = persisted;
    }
  }
}
```

## Phase 3: Session Lifecycle Management

### 3.1 Enhanced Initialization Logic
**File**: `packages/analytics/src/api.ts`

```typescript
async function performInitialization(): Promise<boolean> {
  if (!globalSessionManager) return false;

  // 1. Load any persisted attribution data
  globalSessionManager.loadPersistedAttribution();

  // 2. Get current session from context (authoritative)
  const sessionData = globalSessionManager.getSessionFromContext();
  if (!sessionData) return false;

  // 3. Check if session is expired (local check)
  if (globalSessionManager.isSessionExpired(sessionData)) {
    // Session expired - trigger renewal
    const renewResult = await renewSessionWithPreservation(sessionData.sessionId);
    if (!renewResult.success) return false;

    // Update currentSessionData with renewed session
    currentSessionData = renewResult.sessionData;
  } else {
    // Session valid - use as-is
    currentSessionData = {
      userId: sessionData.userId,
      sessionId: sessionData.sessionId,
      campaignId: sessionData.campaignId,
      segmentId: sessionData.segmentId,
    };

    // Initialize attribution if first time
    globalSessionManager.initializeAttribution(sessionData);
  }

  // 4. Track session (new or renewed)
  await trackSession(
    currentSessionData.sessionId,
    currentSessionData.userId,
    false // isRenewal handled in trackSession
  );

  return true;
}
```

### 3.2 Focused Session Renewal with Attribution Preservation
```typescript
async function renewSessionWithPreservation(oldSessionId: string): Promise<{
  success: boolean;
  sessionData?: SessionData;
}> {
  const config = getConfig();
  const sessionContext = window.__FIREBUZZ_SESSION_CONTEXT__;
  if (!sessionContext) return { success: false };

  // Prepare renewal payload with preserved attribution data only
  const renewalPayload = {
    old_session_id: oldSessionId,
    user_id: sessionContext.userId,  // Always from context
    campaign_id: sessionContext.campaignId,
    workspace_id: sessionContext.workspaceId,
    project_id: sessionContext.projectId,
    landing_page_id: sessionContext.landingPageId,
    segment_id: sessionContext.segmentId,  // FIXED: Include segmentId

    // Send preserved attribution data (only what server can't detect)
    preserved_attribution: globalSessionManager?.getAttributionData(),
    current_url_utm: extractCurrentUTM(),
    current_referrer: document.referrer,

    // Include AB test data for preservation
    ab_test_id: sessionContext.abTestId,
    ab_test_variant_id: sessionContext.abTestVariantId,
  };

  const response = await fetch(`${config.apiUrl}/client-api/v1/events/session/renew`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(renewalPayload),
    credentials: globalSessionManager?.shouldSetCookies() ? 'include' : 'omit',
  });

  const result = await response.json();

  if (result.success) {
    // Server provides new session ID and expiration
    const renewedSession: SessionData = {
      userId: sessionContext.userId,              // Always from context
      sessionId: result.data.session_id,          // Server-generated
      expiresAt: result.data.expires_at,          // Server-provided
      createdAt: Date.now(),                      // Renewal timestamp
      campaignId: sessionContext.campaignId,
      landingPageId: sessionContext.landingPageId,
      segmentId: sessionContext.segmentId,
      abTestId: result.data.ab_test_id,
      abTestVariantId: result.data.ab_test_variant_id,
    };

    // Update session storage with renewal
    globalSessionManager?.updateAfterRenewal(renewedSession, result.data);

    return { success: true, sessionData: renewedSession };
  }

  return { success: false };
}
```

## Phase 4: Server-Side Changes

### 4.1 Engine Session Context Enhancement
**File**: `apps/engine/src/production/*/index.ts` (and preview)

```typescript
// Inject enhanced session context
const sessionContext = {
  // ... existing fields
  session: {
    sessionId: sessionData.sessionId,
    expiresAt: sessionData.sessionEndsAt,     // NEW: Add expiration
    createdAt: sessionData.createdAt,         // NEW: Add creation time
    abTest: sessionData.abTest,
  },
  // ... other fields
};
```

### 4.2 Enhanced Session Renewal Endpoint with SegmentId
**File**: `apps/engine/src/client-api/v1/events/session.ts`

```typescript
.post("/session/renew", async (c) => {
  const body = await c.req.json();
  const {
    old_session_id,
    user_id,                    // Always from client context
    segment_id,                 // FIXED: Include segmentId
    preserved_attribution,      // NEW: Client sends attribution
    current_url_utm,           // NEW: Current page UTM
    ab_test_id,                // NEW: Preserve AB test
    ab_test_variant_id,
    // ... other fields
  } = body;

  // Server generates new session ID and expiration
  const newSessionId = generateUniqueId();
  const sessionDuration = await getCampaignSessionDuration(campaign_id);
  const newExpiresAt = Date.now() + (sessionDuration * 60 * 1000);

  // Preserve attribution data across renewal
  const attributionData = preserved_attribution || {
    // If no preserved data, current becomes original
    original_utm: current_url_utm,
    first_visit_timestamp: Date.now(),
  };

  // Create renewed session in DO
  const doId = c.env.EVENT_TRACKER.idFromName(newSessionId);
  const eventTracker = c.env.EVENT_TRACKER.get(doId);

  const sessionData = {
    session_id: newSessionId,
    user_id: user_id,           // Use provided user ID (from context)
    expires_at: newExpiresAt,   // Server-calculated expiration
    campaign_id,
    workspace_id,
    project_id,
    landing_page_id,
    segment_id,                 // FIXED: Include segmentId
    ab_test_id,                 // Preserve AB test
    ab_test_variant_id,
    attribution_data: attributionData,  // NEW: Store attribution
    environment: environmentContext.environment,
    campaign_environment: environmentContext.campaignEnvironment,
  };

  const result = await eventTracker.initSession(sessionData);

  if (result.success) {
    return c.json({
      success: true,
      data: {
        session_id: newSessionId,
        expires_at: newExpiresAt,           // NEW: Return expiration
        user_id: user_id,                  // Confirm user ID
        ab_test_id,                        // Return preserved AB test
        ab_test_variant_id,
        attribution_preserved: true,       // NEW: Confirm preservation
      },
    });
  }

  return c.json({ success: false, error: result.error }, 400);
});
```

### 4.3 Enhanced Durable Object Session Storage
**File**: `apps/engine/src/durable-objects/event-tracker.ts`

```typescript
interface StoredSessionData {
  sessionId: string;
  userId: string;
  expiresAt: number;
  createdAt: number;
  attributionData: AttributionData;  // NEW: Store full attribution
  abTestData?: ABTestData;           // NEW: Store AB test data
  renewalHistory: {                  // NEW: Track renewal history
    count: number;
    originalSessionId: string;
    lastRenewalAt: number;
  };
}

async initSession(sessionData: any) {
  // Store complete session data including attribution
  const storedData: StoredSessionData = {
    sessionId: sessionData.session_id,
    userId: sessionData.user_id,
    expiresAt: sessionData.expires_at,
    createdAt: sessionData.created_at || Date.now(),
    attributionData: sessionData.attribution_data,
    abTestData: sessionData.ab_test_id ? {
      testId: sessionData.ab_test_id,
      variantId: sessionData.ab_test_variant_id,
    } : undefined,
    renewalHistory: {
      count: 0,
      originalSessionId: sessionData.session_id,
      lastRenewalAt: Date.now(),
    },
  };

  await this.env.storage.put(`session:${sessionData.session_id}`, storedData);
  // ... existing logic
}
```

## Phase 5: Consent & Cookie Management

### 5.1 Enhanced Cookie Management
**File**: `packages/analytics/src/session-manager.ts`

```typescript
shouldSetCookies(): boolean {
  // ... existing GDPR logic

  // NEW: Also check for valid session context
  const sessionContext = this.getSessionContext();
  if (!sessionContext) return false;

  return this.consentState.hasUserInteracted &&
         this.consentState.preferences?.analytics === true;
}

// NEW: Set complete session and attribution cookies
setSessionCookies(sessionData: SessionData): void {
  if (!this.shouldSetCookies()) return;

  // Set session cookie with expiration from server
  const sessionCookie = {
    ...sessionData,
    cookieSetAt: Date.now(),
  };

  const expirationDays = (sessionData.expiresAt - Date.now()) / (24 * 60 * 60 * 1000);
  Cookies.set(
    this.getSessionCookieName(),
    JSON.stringify(sessionCookie),
    this.getCookieOptions(Math.ceil(expirationDays))
  );

  // Set attribution cookie (longer expiration)
  if (this.sessionStorage?.attribution) {
    this.setAttributionCookie(this.sessionStorage);
  }
}

// NEW: Consent-reactive cookie management
onConsentChange(newConsentState: ConsentState): void {
  const hadConsent = this.consentState?.preferences?.analytics === true;
  const hasConsent = newConsentState.preferences?.analytics === true;

  this.consentState = newConsentState;

  if (!hadConsent && hasConsent) {
    // Consent granted - set cookies with current session data
    const currentSession = this.getSessionFromContext();
    if (currentSession) {
      this.setSessionCookies(currentSession);
    }
  } else if (hadConsent && !hasConsent) {
    // Consent revoked - clear cookies, maintain memory state
    this.clearAllCookies();
  }
}
```

## Phase 6: Integration & Testing

### 6.1 Provider Integration
**File**: `packages/analytics/src/provider.tsx`

```typescript
// Update consent handling to use new reactive system
useEffect(() => {
  if (globalSessionManager && consentState) {
    globalSessionManager.onConsentChange(consentState);
  }
}, [consentState]);
```

### 6.2 Testing Strategy

**Test Cases**:
1. **First Visit**: Session context injection, attribution capture, no cookies
2. **Consent Given**: Cookie setting with proper expiration, data persistence
3. **Session Expiration**: Local validation, automatic renewal with data preservation
4. **Tab Reopen**: Session continuity with preserved attribution
5. **Consent Changes**: Reactive cookie management without session disruption
6. **Cross-Domain**: Session renewal without cookie dependency
7. **Attribution Preservation**: UTM data maintained across multiple renewals

## IMMEDIATE FIXES NEEDED

### 🚨 Critical Bug Fix: SegmentId Missing in Tinybird
**Files to fix immediately**:
1. `packages/analytics/src/api.ts` - Line ~950 in `trackSession()` function
2. `apps/engine/src/client-api/v1/events/session.ts` - Renewal endpoint

**The Fix**:
```typescript
// In analytics/src/api.ts, trackSession() function:
const trackingData = {
  // ... existing fields
  campaign_id: sessionContext.campaignId,
  landing_page_id: sessionContext.landingPageId,
  segment_id: sessionContext.segmentId || null,  // ADD THIS LINE
  // ... rest of fields
};
```

### 🎯 Core Changes Summary

**What We Keep Simple:**
- ✅ Server detects fresh: geo, device, network, bot data from Cloudflare
- ✅ Session context provides: userId, sessionId, segmentId, AB tests
- ✅ Current cookie consent logic works

**What We Fix:**
- ❌ **SegmentId missing**: Not flowing to Tinybird (critical bug)
- ❌ **Attribution loss**: UTM params lost during renewal
- ❌ **Client user ID generation**: Remove all client-side user ID creation
- ❌ **Local expiration**: Not using sessionEndsAt from context

**What We Preserve During Renewal:**
- Attribution data (UTM, referrer, ref, source)
- AB test assignments
- SegmentId from session context

## Implementation Timeline

**Week 1**: Critical bug fixes (SegmentId + attribution preservation)
**Week 2**: Session manager refactor and local expiration
**Week 3**: Remove client-side user ID generation
**Week 4**: Testing and production deployment

## Success Metrics

1. **SegmentId Tracking**: 100% segmentId data in Tinybird
2. **Attribution Accuracy**: 100% UTM preservation across renewals
3. **User ID Consistency**: Zero client-generated user IDs
4. **Performance**: Zero unnecessary server validation calls
5. **GDPR Compliance**: Proper consent-based cookie management