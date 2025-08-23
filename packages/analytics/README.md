# @firebuzz/analytics

Analytics tracking for Firebuzz landing pages hosted outside the monorepo.

## Installation

```bash
# For testing (beta version)
npm install @firebuzz/analytics@beta

# For production (stable version)  
npm install @firebuzz/analytics
```

## Usage

### Basic Setup

```tsx
import { AnalyticsProvider } from '@firebuzz/analytics';

function App() {
  return (
    <AnalyticsProvider
      apiUrl="https://engine.firebuzz.com"
      campaignId="campaign_123"
      workspaceId="workspace_456"
      projectId="project_789"
      landingPageId="landing_abc"
    >
      {/* Your landing page content */}
    </AnalyticsProvider>
  );
}
```

### Manual Event Tracking

```tsx
import { useAnalytics } from '@firebuzz/analytics';

function MyComponent() {
  const { trackEvent } = useAnalytics();
  
  const handleCustomEvent = async () => {
    const success = await trackEvent({
      event_id: 'custom-action',
      event_type: 'conversion',
      event_value: '25',
      event_value_type: 'static',
      metadata: JSON.stringify({ source: 'button-click' })
    });
    
    console.log('Event tracked:', success);
  };
  
  return <button onClick={handleCustomEvent}>Track Custom Event</button>;
}
```

## Features

### Automatic Event Tracking

The analytics package automatically tracks:

- **System Events**: Page load, DOM ready
- **Engagement Events**: Pageview, scroll (25/50/75/100%), external link clicks with UTM forwarding
- **Conversion Events**: Form submissions

### Session Management

- Automatic session initialization from cookies
- Session renewal when expired
- AB test data preservation across session renewals
- Environment detection (preview vs production)

### External Link Enhancement

External links are automatically enhanced with:
- **UTM Parameters**: Forwards current page's UTM parameters  
- **Tracking Tokens**: Adds secure JWT tokens for cross-domain attribution
- **Automatic Detection**: Only external links are enhanced

```html
<!-- Original link -->
<a href="https://external-site.com">Click here</a>

<!-- Enhanced automatically -->
<a href="https://external-site.com?utm_source=firebuzz&frbzz_token=eyJ...">Click here</a>
```

### Analytics Control

- **Global Disable**: Set `enabled={false}` to disable all tracking
- **Selective Disable**: Set `enableDefaultEvents={false}` to disable automatic events only
- **Debug Mode**: Set `debug={true}` to see console logs

### Cookie Integration

Reads campaign-scoped cookies:
- `frbzz_{campaign_id}_session` - Session data with AB test info
- `frbzz_{campaign_id}_attribution` - Attribution tracking
- `frbzz_uid` or `frbzz_uid_{campaign_id}` - User identification

## API Reference

### AnalyticsProvider Props

```tsx
interface AnalyticsProviderProps {
  apiUrl: string;                      // Engine API URL
  campaignId: string;                  // Campaign identifier
  workspaceId: string;                 // Workspace identifier  
  projectId: string;                   // Project identifier
  landingPageId: string;              // Landing page identifier
  customEvents?: CustomEventConfig[]; // Custom event configurations
  cookiePrefix?: string;              // Cookie prefix (default: "frbzz_")
  enableDefaultEvents?: boolean;      // Enable automatic tracking (default: true)
  enabled?: boolean;                  // Enable/disable entire analytics system (default: true)
  debug?: boolean;                    // Enable debug logging (default: false)
  children: React.ReactNode;
}
```

### TrackEvent Parameters

```tsx
interface TrackEventParams {
  event_id: string;              // Event identifier (e.g., "form-submission")
  event_type: 'conversion' | 'engagement' | 'system';
  event_value?: string;          // Event value as string (e.g., "10")
  event_value_type?: 'static' | 'dynamic';
  
  // Optional event-specific data
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

### useAnalytics Hook

```tsx
const { trackEvent, sessionId, userId, isInitialized, debug } = useAnalytics();
```

## Event Types

### System Events
- `pageload` - Page load complete
- `domready` - DOM ready

### Engagement Events  
- `pageview` - Page viewed
- `scroll` - Scroll milestones (25%, 50%, 75%, 100%)
- `external-link-click` - External link clicked
- `time-on-page` - Time spent on page

### Conversion Events
- `form-submission` - Form submitted

## Advanced Usage

### Cookie Utilities

```tsx
import { 
  getSessionData, 
  getAbTestData, 
  isSessionValid,
  getAllCookieData 
} from '@firebuzz/analytics';

// Get session information
const sessionData = getSessionData('campaign_123');
const abTest = getAbTestData('campaign_123');
const isValid = isSessionValid(sessionData);

// Debug cookie data
console.log('All cookies:', getAllCookieData('campaign_123'));
```

### Manual API Configuration

```tsx
import { configureApiClient, trackEvent } from '@firebuzz/analytics';

configureApiClient({
  apiUrl: 'https://engine.firebuzz.com',
  campaignId: 'campaign_123',
  workspaceId: 'workspace_456', 
  projectId: 'project_789',
  landingPageId: 'landing_abc'
});

// Track events without provider
await trackEvent({
  event_id: 'manual-event',
  event_type: 'engagement'
});
```

## Error Handling

The package handles:
- Session expiry with automatic renewal
- Missing cookie data
- Network failures with retries
- Invalid event data

All errors are logged to console when `debug: true` is enabled.

## Browser Compatibility

- Modern browsers with ES2020+ support
- React 18+
- SSR compatible

## License

MIT