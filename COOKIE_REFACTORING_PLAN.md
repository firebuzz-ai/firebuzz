# Cookie and Session Management Refactoring Plan

## Overview

This document outlines the plan to refactor cookie and session management across the Engine, Consent Manager, and Analytics packages to achieve clean separation of concerns.

## Target Architecture

### Responsibilities

- **Consent Manager**: Only consent state/cookies
- **Analytics**: Session/user cookies and lifecycle management  
- **Engine**: No cookie setting, only reading/validation

### Cookie Ownership

- **Consent Manager**: `frbzz_consent` (consent preferences only)
- **Analytics Package**: `frbzz_session_${campaignId}`, `frbzz_uid`, `frbzz_uid_${campaignId}` (session tracking)
- **Engine**: Reads cookies for validation, stores in Durable Objects

## Current State Analysis

### Engine Package (apps/engine)

**Currently handles:**
- Session management and validation through Durable Objects
- User ID generation and persistence 
- Session cookies (campaign-scoped: `frbzz_session_${campaignId}`)
- User ID cookies (environment-aware: `frbzz_uid` or `frbzz_uid_${campaignId}` for preview)
- Session initialization endpoints (`/session/init`, `/session/renew`, `/session/validate`)
- Landing page serving with session context injection
- Consent API endpoints (`/consent/record`) but only database operations

**Issues:** 
- Engine is currently importing missing functions (`updateSessionWithVariant`, `ensureSessionAndAttribution`) that don't exist
- Cookie setting logic is mixed with session management
- No clear separation between consent and analytics cookies

### Consent Manager Package (packages/consent-manager)

**Currently handles:**
- Consent preference storage and UI management  
- Consent cookies (`frbzz_consent`)
- User ID and session cookie management (duplicating engine logic)
- GTM consent integration
- GDPR compliance logic

**Issues:**
- Duplicates session/user cookie logic that should belong to analytics
- Manages both consent AND session cookies, violating separation of concerns

### Analytics Package (packages/analytics)

**Currently handles:**
- Event tracking and batching
- Anonymous session generation when no consent 
- API client configuration

**Issues:**
- No cookie management - relies entirely on external session data
- No session lifecycle management
- Missing user/session persistence logic

## Proposed Changes

### 1. Engine Package Changes

**Files to modify:**
- `/src/lib/session.ts`
- `/src/client-api/v1/events/session.ts` 
- `/src/production/*/index.ts`
- `/src/preview/*/index.ts`

**Changes:**
- **REMOVE:** All cookie setting operations (setCookie calls)
- **KEEP:** Cookie reading for session validation and serving
- **KEEP:** Session management through Durable Objects
- **KEEP:** Session endpoints that return data to client
- **ADD:** Missing session utility functions that are being imported
- **MODIFY:** Session endpoints to return cookie data instead of setting cookies server-side
- **MODIFY:** Landing page serving to inject session context from existing cookies only

**Specific updates:**
```typescript
// BEFORE (engine sets cookies)
setCookie(c, cookieName, cookieValue, options);

// AFTER (engine returns cookie data for client to set)
return {
  success: true,
  data: {
    session_id: sessionId,
    cookies_to_set: {
      name: cookieName,
      value: cookieValue,
      options: options
    }
  }
};
```

### 2. Consent Manager Package Changes

**Files to modify:**
- `/src/cookies.ts`
- `/src/provider.tsx`
- `/src/hooks.ts`
- `/src/types.ts`

**Changes:**
- **REMOVE:** User ID and session cookie management functions
- **REMOVE:** `setUserIdCookie`, `getUserIdCookie`, `setSessionCookie`, `getSessionCookie` 
- **KEEP:** Consent preference cookies only (`frbzz_consent`)
- **KEEP:** GTM integration and consent state management
- **MODIFY:** Remove session context dependency for cookie operations
- **ADD:** Integration hooks to notify analytics package of consent changes

**Specific updates:**
```typescript
// REMOVE these methods from ConsentCookieManager:
- setUserIdCookie()
- getUserIdCookie()  
- setSessionCookie()
- getSessionCookie()
- removeUserIdCookie()
- removeSessionCookie()
- manageCookiesBasedOnConsent() // Move logic to analytics

// KEEP only:
- setConsentCookie()
- getConsentCookie()
- removeConsentCookie()
```

### 3. Analytics Package Changes

**Files to modify:**
- `/src/api.ts`
- `/src/provider.tsx` 
- `/src/types.ts`
- Add new `/src/session-manager.ts`
- Add new `/src/cookies.ts`

**Changes:**
- **ADD:** Session cookie management (`frbzz_session_${campaignId}`)
- **ADD:** User ID cookie management (`frbzz_uid`, `frbzz_uid_${campaignId}`)
- **ADD:** Session lifecycle management (renewal, validation)
- **ADD:** Cookie expiration and cleanup logic
- **MODIFY:** Initialize and manage session state internally
- **ADD:** Integration with engine session endpoints for server-side coordination
- **ADD:** Consent state checking before setting cookies
- **ADD:** Environment-aware cookie behavior

**New session-manager.ts structure:**
```typescript
export class SessionManager {
  private environment: 'dev' | 'preview' | 'production';
  
  constructor(environment, consentState) {
    this.environment = environment;
  }
  
  // Cookie management methods
  setSessionCookie(campaignId: string, sessionData: SessionData): void
  getSessionCookie(campaignId: string): SessionData | null
  setUserIdCookie(userId: string, campaignId?: string): void  
  getUserIdCookie(campaignId?: string): string | null
  
  // Session lifecycle
  initializeSession(): Promise<SessionInitResponse>
  renewSession(oldSessionId: string): Promise<SessionRenewalResponse>
  validateSession(sessionId: string): Promise<boolean>
  
  // Environment handling
  shouldSetCookies(): boolean // false for dev
  getCookieNames(campaignId: string): { session: string, userId: string }
}
```

### 4. Integration Flow

**First Visit:**
```
1. User lands → Engine serves HTML (reads any existing cookies)
2. Consent Manager initializes → Shows banner if needed
3. User gives consent → Consent Manager notifies Analytics
4. Analytics initializes → Sets session/user cookies → Calls Engine API
5. Engine validates/stores in Durable Objects
```

**Return Visit:**
```
1. User returns → Browser sends cookies
2. Engine reads cookies → Validates session → Injects context
3. Consent Manager reads consent cookie → Sets GTM state  
4. Analytics reads session cookies → Continues tracking (if consent allows)
```

**Session Renewal:**
```
1. Analytics detects expired session
2. Analytics calls Engine /session/renew 
3. Engine returns new session data
4. Analytics updates cookies with new session
```

## Implementation Order

### Phase 1: Engine Package
1. Remove cookie setting from session endpoints
2. Update endpoints to return cookie data instead
3. Fix missing function imports
4. Update landing page serving logic

### Phase 2: Consent Manager Package  
1. Remove session/user cookie methods from ConsentCookieManager
2. Update provider to not manage session cookies
3. Add consent change notification system
4. Clean up session context dependencies

### Phase 3: Analytics Package
1. Create SessionManager class with cookie operations
2. Add session lifecycle management 
3. Update provider to handle session initialization
4. Add consent state integration
5. Update batch-tracker to use new session management

### Phase 4: Template Integration
1. Update analytics-bridge.tsx to use new flow
2. Ensure proper initialization order
3. Test consent → analytics → engine flow

## Environment Handling

### Development
- **Consent Manager**: Shows banner, doesn't set cookies
- **Analytics**: Doesn't set cookies, tracks events locally  
- **Engine**: No cookies to read, works in cookieless mode

### Preview  
- **Consent Manager**: Sets consent cookies
- **Analytics**: Sets campaign-scoped cookies (`frbzz_uid_${campaignId}`)
- **Engine**: Reads campaign-scoped cookies

### Production
- **Consent Manager**: Sets consent cookies
- **Analytics**: Sets global cookies (`frbzz_uid`, `frbzz_session_${campaignId}`)
- **Engine**: Reads global cookies

## Testing Strategy

1. **Unit Tests**: Each package's cookie management in isolation
2. **Integration Tests**: Consent → Analytics → Engine flow
3. **Environment Tests**: Dev/Preview/Production cookie behavior
4. **Session Tests**: Session renewal and expiration handling
5. **Consent Tests**: Cookie setting/removal based on consent changes

## Migration Considerations

### Backward Compatibility
- Existing cookies will continue to work during transition
- Old session cookies will be read by engine until analytics takes over
- Gradual migration possible by feature flagging

### Data Integrity
- Session data in Durable Objects remains unchanged
- Cookie names and formats stay consistent
- No user data loss during migration

## Benefits of New Architecture

1. **Clear Responsibilities**: Each package has a single concern
2. **Maintainability**: Cookie logic consolidated in appropriate packages  
3. **Testability**: Easier to test each package independently
4. **Flexibility**: Easier to modify consent or session logic independently
5. **Performance**: Reduced code duplication and complexity

## Risks and Mitigations

### Risk: Session Renewal Race Conditions
**Mitigation**: Implement proper locking/queueing in analytics session manager

### Risk: Cookie Setting Conflicts  
**Mitigation**: Clear ownership boundaries and testing

### Risk: Breaking Changes During Migration
**Mitigation**: Feature flags and gradual rollout

### Risk: Complex Initialization Order
**Mitigation**: Well-defined initialization sequence and documentation

---

*This document should be updated as implementation progresses and requirements evolve.*