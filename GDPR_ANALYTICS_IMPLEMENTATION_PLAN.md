# GDPR-Compliant Analytics Implementation Plan (Enhanced)

## Overview
Transform the current analytics system into a fully GDPR-compliant solution with consent management, automatic EU detection, multi-language support, cookieless tracking options, and Google Tag Manager integration.

## Phase 1: Server-Side Cookie Architecture (Engine)

### 1.1 Separate Functional vs Analytics Cookies
**File**: `/apps/engine/src/lib/session.ts`
- Split current cookie structure into two categories:
  - **Functional cookies** (no consent required): campaignId, segmentId, abTestId, landingPageId, sessionId
  - **Analytics cookies** (consent required): userHash, attributionId, UTM parameters

### 1.2 Implement Hash-Based User Identification
- Create privacy-friendly hash function using anonymized IP + simplified user agent
- Implement 30-minute session cookies instead of 400-day persistent cookies
- Add hourly time windows to prevent long-term tracking

### 1.3 EU Detection & Regional Compliance
**New file**: `/apps/engine/src/lib/geo-compliance.ts`
```typescript
interface GeoCompliance {
  isEU: boolean;
  isCalifornian: boolean; // CCPA compliance
  countryCode: string;
  requiresConsent: boolean;
  consentType: 'gdpr' | 'ccpa' | 'none';
}

// Detect from Cloudflare headers
function detectCompliance(c: Context): GeoCompliance {
  const country = c.req.header('cf-ipcountry');
  const region = c.req.header('cf-region-code');
  
  const euCountries = ['DE', 'FR', 'IT', 'ES', ...];
  const isEU = euCountries.includes(country);
  const isCalifornian = country === 'US' && region === 'CA';
  
  return {
    isEU,
    isCalifornian,
    countryCode: country,
    requiresConsent: isEU || isCalifornian,
    consentType: isEU ? 'gdpr' : isCalifornian ? 'ccpa' : 'none'
  };
}
```

### 1.4 Language Detection
**File**: `/apps/engine/src/lib/localization.ts`
```typescript
function detectLanguage(c: Context): string {
  // Priority order:
  // 1. URL parameter (?lang=de)
  const urlLang = c.req.query('lang');
  if (urlLang) return urlLang;
  
  // 2. Cookie preference
  const cookieLang = getCookie(c, 'frbzz_language');
  if (cookieLang) return cookieLang;
  
  // 3. Accept-Language header
  const acceptLang = c.req.header('accept-language');
  if (acceptLang) {
    const primary = acceptLang.split(',')[0].split('-')[0];
    return primary;
  }
  
  // 4. Geo-based default
  const country = c.req.header('cf-ipcountry');
  return getDefaultLanguageForCountry(country) || 'en';
}
```

### 1.5 Consent-Aware Cookie Setting
**New file**: `/apps/engine/src/lib/consent.ts`
- Add consent validation before setting analytics cookies
- Create consent storage mechanism in Cloudflare KV
- Implement consent audit trail for GDPR compliance
- Store language preference

### 1.6 Update Session Routes
**File**: `/apps/engine/src/client-api/v1/events/session.ts`
- Add `/consent/update` endpoint for consent management
- Add `/consent/status` endpoint to check consent
- Add `/geo/compliance` endpoint to return compliance requirements
- Modify `/session/init` to accept `consent_granted` parameter and return compliance info

## Phase 2: Analytics Package Consent Management

### 2.1 Internationalization System
**New directory**: `/packages/analytics/src/i18n/`

**Files to create**:
- `translations.ts` - Default translations for common languages
- `provider.tsx` - I18n context provider
- `hooks.ts` - useTranslation hook

**Default Languages**:
```typescript
const defaultTranslations = {
  en: {
    title: "We value your privacy",
    description: "We use cookies to enhance your experience and analyze our traffic.",
    acceptAll: "Accept All",
    rejectAll: "Reject All", 
    manage: "Manage Preferences",
    necessary: "Necessary",
    analytics: "Analytics",
    marketing: "Marketing",
    save: "Save Preferences"
  },
  de: {
    title: "Wir schätzen Ihre Privatsphäre",
    description: "Wir verwenden Cookies, um Ihre Erfahrung zu verbessern.",
    // ... German translations
  },
  fr: {
    title: "Nous respectons votre vie privée",
    // ... French translations
  },
  es: {
    title: "Valoramos tu privacidad",
    // ... Spanish translations
  },
  it: {
    title: "Rispettiamo la tua privacy",
    // ... Italian translations
  },
  nl: {
    title: "We waarderen uw privacy",
    // ... Dutch translations
  }
};
```

### 2.2 Create Consent Components with Localization
**New directory**: `/packages/analytics/src/components/`

**Component Structure**:
```tsx
interface CookieBannerProps {
  // Localization
  language?: string;
  customTranslations?: Record<string, Translation>;
  autoDetectLanguage?: boolean;
  
  // Geo compliance
  geoCompliance?: {
    enabled: boolean;
    showOnlyInEU?: boolean;
    showInRegions?: string[];
    hideInRegions?: string[];
  };
  
  // Styling (Shadcn-style)
  variant?: 'floating' | 'inline' | 'bar';
  position?: 'bottom' | 'top' | 'center';
  className?: string;
  
  // Content
  privacyPolicyUrl?: string;
  cookiePolicyUrl?: string;
  
  // Callbacks
  onAccept?: (preferences: ConsentPreferences) => void;
  onReject?: () => void;
  onManage?: () => void;
}
```

### 2.3 Shadcn-style Component Architecture
```tsx
// Composable components with localization
<CookieBanner 
  language={detectedLanguage}
  geoCompliance={{ showOnlyInEU: true }}
>
  <CookieBannerContent>
    <CookieBannerHeader>
      <CookieBannerTitle>{t('title')}</CookieBannerTitle>
      <CookieBannerDescription>{t('description')}</CookieBannerDescription>
    </CookieBannerHeader>
    <CookieBannerActions>
      <CookieBannerAcceptAll>{t('acceptAll')}</CookieBannerAcceptAll>
      <CookieBannerRejectAll>{t('rejectAll')}</CookieBannerRejectAll>
      <CookieBannerManage>{t('manage')}</CookieBannerManage>
    </CookieBannerActions>
  </CookieBannerContent>
</CookieBanner>

// Preference Manager with categories
<ConsentManager language={language}>
  <ConsentCategory 
    id="necessary" 
    required 
    title={t('necessary')}
    description={t('necessaryDesc')}
  />
  <ConsentCategory 
    id="analytics" 
    title={t('analytics')}
    description={t('analyticsDesc')}
  />
  <ConsentCategory 
    id="marketing" 
    title={t('marketing')}
    description={t('marketingDesc')}
  />
</ConsentManager>
```

### 2.4 Update Provider Component with Geo & Language Support
**File**: `/packages/analytics/src/provider.tsx`
```typescript
interface AnalyticsProviderProps {
  // ... existing props
  
  gdpr?: {
    enabled: boolean;
    autoDetectCompliance?: boolean; // Auto-detect EU users
    requireConsent: boolean | 'auto'; // 'auto' means only for EU
    consentMode?: 'opt-in' | 'opt-out';
    defaultConsent?: ConsentPreferences;
    cookielessFallback?: boolean;
    
    // Localization
    language?: string;
    autoDetectLanguage?: boolean;
    customTranslations?: Record<string, Translation>;
    
    // Regional compliance
    regions?: {
      eu?: { requireConsent: boolean; defaultConsent?: ConsentPreferences };
      california?: { requireConsent: boolean; mode?: 'opt-in' | 'opt-out' };
      global?: { requireConsent: boolean };
    };
  };
}
```

### 2.5 Smart Initialization Flow
```typescript
// In AnalyticsProvider
useEffect(() => {
  async function initializeWithCompliance() {
    // 1. Get compliance info from server
    const compliance = await fetch(`${apiUrl}/api/geo/compliance`).then(r => r.json());
    
    // 2. Determine if consent is needed
    const needsConsent = gdpr.autoDetectCompliance 
      ? compliance.requiresConsent 
      : gdpr.requireConsent;
    
    // 3. Set language
    const language = gdpr.autoDetectLanguage 
      ? compliance.detectedLanguage 
      : gdpr.language || 'en';
    
    // 4. Initialize based on region
    if (!needsConsent) {
      // Non-EU users: Initialize immediately with full tracking
      initializeAnalytics({ 
        cookiesEnabled: true,
        consentRequired: false 
      });
    } else {
      // EU users: Show consent banner
      setShowConsentBanner(true);
      setConsentLanguage(language);
      
      // Use cookieless mode until consent
      initializeAnalytics({ 
        cookiesEnabled: false,
        consentRequired: true 
      });
    }
  }
  
  initializeWithCompliance();
}, []);
```

## Phase 3: Google Tag Manager Integration

### 3.1 GTM Consent Mode v2 with Regional Support
**New file**: `/packages/analytics/src/integrations/gtm.ts`
```typescript
interface GTMConsent {
  'ad_storage': 'granted' | 'denied';
  'analytics_storage': 'granted' | 'denied';
  'functionality_storage': 'granted' | 'denied';
  'personalization_storage': 'granted' | 'denied';
  'security_storage': 'granted';
  'wait_for_update': number;
  'region'?: string[];
}

// Set default consent based on region
function setGTMDefaultConsent(isEU: boolean) {
  window.gtag('consent', 'default', {
    'ad_storage': isEU ? 'denied' : 'granted',
    'analytics_storage': isEU ? 'denied' : 'granted',
    'functionality_storage': 'granted',
    'personalization_storage': isEU ? 'denied' : 'granted',
    'security_storage': 'granted',
    'wait_for_update': 2000,
    'region': isEU ? ['EU'] : undefined
  });
}

// Update consent after user choice
function updateGTMConsent(preferences: ConsentPreferences) {
  window.gtag('consent', 'update', {
    'ad_storage': preferences.marketing ? 'granted' : 'denied',
    'analytics_storage': preferences.analytics ? 'granted' : 'denied',
    'functionality_storage': 'granted',
    'personalization_storage': preferences.marketing ? 'granted' : 'denied'
  });
}
```

### 3.2 Third-party Tag Management
- Block scripts until consent for EU users
- Auto-load for non-EU users
- Support for common analytics tools (GA4, Facebook Pixel, etc.)

## Phase 4: Cookieless Analytics Mode

### 4.1 Regional Fallback Strategy
```typescript
// Use different strategies based on region
function getTrackingStrategy(compliance: GeoCompliance, consent: ConsentStatus) {
  if (!compliance.requiresConsent) {
    return 'full'; // Non-EU: Full tracking
  }
  
  if (consent.granted) {
    return 'full'; // EU with consent: Full tracking
  }
  
  return 'cookieless'; // EU without consent: Cookieless
}
```

### 4.2 Server-Side Session Management
- Store session data in Durable Objects
- Use server-side hashing for user identification
- No cookies for EU users without consent

## Phase 5: Data Subject Rights & Compliance

### 5.1 GDPR Compliance Features
**New file**: `/packages/analytics/src/gdpr/rights.ts`
- Data export functionality (GDPR Article 20)
- Data deletion requests (GDPR Article 17)
- Consent history tracking (GDPR Article 7)
- Opt-out mechanism

### 5.2 Regional Privacy Controls
- GDPR for EU users
- CCPA for California users
- Generic privacy controls for others

## Implementation Benefits

### Smart Regional Handling
- ✅ **EU Users**: Full GDPR compliance with consent banner
- ✅ **US/California**: CCPA compliance with opt-out
- ✅ **Rest of World**: Simplified experience, no banner
- ✅ **Performance**: No unnecessary consent flows for non-EU users

### Localization Benefits
- ✅ **6+ Default Languages**: EN, DE, FR, ES, IT, NL
- ✅ **Custom Translations**: Easy to add more languages
- ✅ **Auto-Detection**: Smart language detection
- ✅ **Regional Defaults**: Country-appropriate language

### Developer Experience
- ✅ **Zero Config for Non-EU**: Works immediately
- ✅ **Auto-Detection**: Handles compliance automatically
- ✅ **Type-Safe**: Full TypeScript support
- ✅ **Composable**: Shadcn-style components

## Migration Path
1. Deploy server-side geo-detection first
2. Release analytics package with smart defaults
3. Templates auto-adapt based on user region
4. No breaking changes for existing users

## Example Usage
```tsx
// Simple: Auto-detect everything
<AnalyticsProvider 
  gdpr={{ 
    autoDetectCompliance: true,
    autoDetectLanguage: true 
  }}
>
  <App />
</AnalyticsProvider>

// Advanced: Custom configuration
<AnalyticsProvider 
  gdpr={{
    regions: {
      eu: { requireConsent: true },
      california: { requireConsent: true, mode: 'opt-out' },
      global: { requireConsent: false }
    },
    customTranslations: {
      ja: { title: "プライバシーを重視します", ... }
    }
  }}
>
  <CookieBanner 
    geoCompliance={{ showOnlyInEU: true }}
    language="auto"
  />
  <App />
</AnalyticsProvider>
```

## File Structure
```
/packages/analytics/src/
├── components/
│   ├── consent-banner/
│   │   ├── index.tsx
│   │   ├── banner.tsx
│   │   ├── manager.tsx
│   │   └── styles.ts
│   └── index.ts
├── consent/
│   ├── provider.tsx
│   ├── context.tsx
│   ├── storage.ts
│   └── types.ts
├── gdpr/
│   ├── rights.ts
│   ├── anonymization.ts
│   └── compliance.ts
├── i18n/
│   ├── translations.ts
│   ├── provider.tsx
│   └── hooks.ts
├── integrations/
│   ├── gtm.ts
│   ├── ga4.ts
│   └── facebook.ts
└── tracking/
    ├── cookieless.ts
    └── hash.ts

/apps/engine/src/lib/
├── geo-compliance.ts
├── localization.ts
├── consent.ts
└── session.ts (updated)
```

## Testing Strategy
- Unit tests for consent logic
- Integration tests for GTM compatibility
- E2E tests for consent flow in different regions
- Compliance validation tests
- Localization tests for all supported languages

## Dependencies
- Add to analytics package:
  - `react-intl` or custom i18n solution
  - `class-variance-authority` for styling variants
  - Update peer dependencies for React 18+