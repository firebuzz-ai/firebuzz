# @firebuzz/consent-manager

GDPR-compliant consent management package for React applications.

## Features

- 🛡️ GDPR & CCPA compliant consent management
- 🎯 Granular cookie categories (Necessary, Functional, Analytics, Marketing)
- 🔄 Environment-aware behavior (dev/preview/production)
- 📱 Responsive design with accessibility features
- 🎨 Customizable UI components
- 🪝 React hooks for easy integration
- 🌐 GTM and Facebook Pixel integration
- 💾 Persistent consent storage across sessions

## Installation

```bash
npm install @firebuzz/consent-manager
# or
pnpm add @firebuzz/consent-manager
# or
yarn add @firebuzz/consent-manager
```

## Quick Start

```tsx
import { ConsentProvider, useConsent } from '@firebuzz/consent-manager';

// Wrap your app with ConsentProvider
function App() {
  return (
    <ConsentProvider
      config={{
        enableGTMIntegration: true,
        gtmContainerId: 'GTM-XXXXXX',
        enableFacebookPixel: true,
        facebookPixelId: '1234567890',
      }}
    >
      <YourApp />
    </ConsentProvider>
  );
}

// Use consent state in components
function YourComponent() {
  const { consentState, updateConsent } = useConsent();
  
  if (consentState?.preferences?.analytics) {
    // Initialize analytics only if user consented
    initializeAnalytics();
  }

  return (
    <div>
      <button onClick={() => updateConsent({ 
        necessary: true, 
        analytics: true, 
        marketing: false, 
        functional: true 
      })}>
        Accept Selected Cookies
      </button>
    </div>
  );
}
```

## API Reference

### ConsentProvider

Main provider component that manages consent state.

```tsx
<ConsentProvider config={config}>
  {children}
</ConsentProvider>
```

### useConsent Hook

```tsx
const { consentState, updateConsent, clearConsent } = useConsent();
```

### useSessionContext Hook

```tsx
const { sessionContext } = useSessionContext();
```

## Environment Support

- **Development**: Shows consent UI but doesn't set cookies
- **Preview**: Campaign-scoped cookies for testing
- **Production**: Global cookies for live sites

## License

MIT © Firebuzz Team