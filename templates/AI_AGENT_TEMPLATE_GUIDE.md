# Firebuzz Template Guide for AI Agents

**Version:** 1.0
**Last Updated:** 2025-10-23

This document serves as the canonical reference for AI agents building conversion-optimized landing pages in the Firebuzz template system. Read carefully and follow all guidelines.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Campaign Types](#campaign-types)
3. [Technical Stack](#technical-stack)
4. [Template Architecture](#template-architecture)
5. [Configuration Files](#configuration-files)
6. [Internal Packages](#internal-packages)
7. [Component Patterns](#component-patterns)
8. [Styling Guidelines](#styling-guidelines)
9. [Conversion Best Practices](#conversion-best-practices)
10. [Marketing & CRO Guidelines](#marketing--cro-guidelines)
11. [Template Workflow](#template-workflow)
12. [After Completion Checklist](#after-completion-checklist)
13. [Do's and Don'ts](#dos-and-donts)

---

## System Overview

Firebuzz is an AI-powered platform for creating high-converting landing pages for marketers. The template system is built with:

- **React** + **TypeScript** for type-safe component development
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for utility-first styling
- **Framer Motion** (motion/react) for smooth animations
- **Radix UI** for accessible component primitives
- Internal packages for analytics, consent management, and design mode

### Philosophy

Templates must be:
- **Conversion-focused**: Multiple CTAs, social proof, urgency, trust signals
- **Mobile-first**: Responsive design optimized for all devices
- **Performance-optimized**: Fast loading, lazy images, code splitting
- **Accessible**: WCAG AA compliance, semantic HTML, keyboard navigation
- **Beautiful**: Clean animations, proper spacing, professional design

---

## Campaign Types

Firebuzz supports two primary campaign types:

### 1. Click-Through Campaigns
**Purpose:** Use landing page as middleware before final action (e.g., sending user to purchase page or external form)

**Characteristics:**
- Focus on convincing user to click CTA button
- Button leads to external destination
- No form on the landing page
- Emphasis on benefits, social proof, urgency
- Primary goal: Click-through rate

**Example Use Cases:**
- Pre-sale pages before checkout
- Product launch announcements
- Event registration pre-landing
- App store redirects

### 2. Lead Generation Campaigns
**Purpose:** Collect form data directly on the landing page

**Characteristics:**
- Form is primary conversion element
- All data collected on-page
- Form submission is the primary goal
- Emphasis on value proposition for data exchange
- Trust signals around form critical

**Example Use Cases:**
- Newsletter signups
- E-book downloads
- Event registrations
- Demo requests
- Lead capture with incentive

**Template Structure Difference:**
- **Click-through:** Hero CTA → External link
- **Lead generation:** Hero CTA → Scroll to form section OR inline form in hero

---

## Technical Stack

### Core Dependencies

```json
{
  "dependencies": {
    "@firebuzz/analytics": "^1.6.1",           // Analytics tracking
    "@firebuzz/consent-manager": "^0.2.15",   // GDPR/Cookie consent
    "@firebuzz/design-mode": "^0.2.0",        // Visual editing overlay
    "@hookform/resolvers": "^3.9.1",          // Form validation
    "@radix-ui/react-*": "^1.1.0+",           // UI primitives
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.53.1",             // Form management
    "react-router-dom": "^7.4.1",             // Routing
    "motion": "^12.0.11",                     // Animations (formerly framer-motion)
    "lucide-react": "^0.474.0",               // Icons
    "next-themes": "^0.4.6",                  // Theme switching
    "zod": "^3.25.76",                        // Schema validation
    "tailwind-merge": "^3.0.1",               // Class merging
    "class-variance-authority": "^0.7.1",     // Component variants
    "sonner": "^1.7.4"                        // Toast notifications
  },
  "devDependencies": {
    "@vitejs/plugin-react-swc": "^4.1.0",     // or @vitejs/plugin-react
    "vite": "^6.0.5",
    "vite-react-ssg": "^0.8.4",               // SSG support
    "typescript": "~5.6.2",
    "tailwindcss": "^3.4.17",
    "autoprefixer": "^10.4.20",
    "postcss": "^8"
  }
}
```

### Build Configuration

**vite.config.ts:**
```typescript
import path from "node:path";
import { firebuzzDesignMode } from "@firebuzz/design-mode";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import terminal from "vite-plugin-terminal";

export default defineConfig({
  plugins: [
    react(),
    firebuzzDesignMode(),  // Required for design mode
    ...(process.env.NODE_ENV !== "production"
      ? [terminal({ console: "terminal" })]
      : []
    ),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
  },
  server: {
    allowedHosts: [".vercel.run"],
  },
});
```

**tailwind.config.js:**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        serif: ["var(--font-serif)", "serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        // Use CSS variables for theme support
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ... other color definitions
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

---

## Template Architecture

### File Structure

```
templates/[template-name]/
├── index.html                          # Entry HTML
├── package.json                        # Dependencies
├── vite.config.ts                      # Vite configuration
├── tailwind.config.js                  # Tailwind configuration
├── tsconfig.json                       # TypeScript config
├── postcss.config.js                   # PostCSS config
├── components.json                     # shadcn/ui config
├── README.md                           # Template documentation
└── src/
    ├── main.tsx                        # Application entry point
    ├── app.tsx                         # Main App component (layout)
    ├── head.tsx                        # SEO/Meta tags component
    ├── analytics-bridge.tsx            # Analytics integration bridge
    ├── index.css                       # Global styles + Tailwind imports
    ├── vite-env.d.ts                   # Vite types
    ├── configuration/
    │   ├── campaign.ts                 # Campaign configuration (CRITICAL)
    │   ├── seo.ts                      # SEO metadata
    │   └── tags.ts                     # Tracking tags (GTM, GA, FB)
    ├── components/
    │   ├── hero.tsx                    # Hero section
    │   ├── navigation.tsx              # Header/nav
    │   ├── footer.tsx                  # Footer
    │   ├── [feature]-section.tsx       # Feature sections
    │   ├── ui/                         # shadcn/ui components
    │   │   ├── button.tsx
    │   │   ├── input.tsx
    │   │   ├── form.tsx
    │   │   ├── image.tsx               # Cloudflare-optimized Image
    │   │   ├── card.tsx
    │   │   ├── badge.tsx
    │   │   └── ... (30+ components)
    │   ├── brand/                      # Brand assets
    │   │   ├── logo-light.tsx
    │   │   ├── logo-dark.tsx
    │   │   ├── icon-light.tsx
    │   │   └── icon-dark.tsx
    │   └── cookie-banner/              # Cookie consent
    │       ├── cookie-banner.tsx
    │       ├── cookie-preferences-dialog.tsx
    │       └── cookie-preferences-button.tsx
    ├── hooks/
    │   └── use-campaign-env.ts         # Environment detection hook
    └── lib/
        ├── utils.ts                    # cn() utility, helpers
        └── form-api.ts                 # Form submission API client
```

### Critical Files Explained

#### 1. main.tsx
Application entry point. Sets up providers and root structure.

```typescript
import { ConsentProvider } from "@firebuzz/consent-manager";
import { ViteReactSSG } from "vite-react-ssg/single-page";
import { AnalyticsBridge } from "./analytics-bridge.tsx";
import { App } from "./app.tsx";
import { CookieBanner } from "./components/cookie-banner/cookie-banner.tsx";
import { Toaster } from "./components/ui/sonner.tsx";
import { TooltipProvider } from "./components/ui/tooltip.tsx";
import { campaignConfiguration } from "./configuration/campaign.ts";
import { tagsConfiguration } from "./configuration/tags.ts";
import { Head } from "./head.tsx";
import "./index.css";

export const createRoot = ViteReactSSG(
  <>
    {/* GTM noscript iframe */}
    {tagsConfiguration.googleTagManagerId && (
      <noscript>
        <iframe
          title="Google Tag Manager Noscript"
          src={`https://www.googletagmanager.com/ns.html?id=${tagsConfiguration.googleTagManagerId}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>
    )}

    <ConsentProvider
      translations={{ language: "en" }}
      gtm={{
        consentDefaults: {
          analytics_storage: "denied",
          ad_storage: "denied",
          ad_user_data: "denied",
          ad_personalization: "denied",
          functionality_storage: "denied",
          personalization_storage: "denied",
          security_storage: "granted",
        },
      }}
      debug={false}
    >
      <AnalyticsBridge
        customEvents={campaignConfiguration.customEvents}
        primaryGoal={campaignConfiguration.primaryGoal}
        debug={false}
      >
        <TooltipProvider>
          <Head />
          <App />
          <Toaster />
        </TooltipProvider>
        <CookieBanner />
      </AnalyticsBridge>
    </ConsentProvider>

    {/* FB Pixel noscript */}
    {tagsConfiguration.facebookPixelId && (
      <noscript>
        <img
          alt="Facebook Pixel"
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${tagsConfiguration.facebookPixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
    )}
  </>,
  async () => {},
  { registerComponents: true }
);
```

#### 2. app.tsx
Main application layout. Imports and arranges all sections.

```typescript
import { Hero } from "@/components/hero";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
// Import other sections...

export function App() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <Hero />
      {/* Add your sections here */}
      <Footer />
    </div>
  );
}
```

#### 3. analytics-bridge.tsx
Connects analytics provider with consent state.

```typescript
"use client";

import type { AnalyticsProviderProps } from "@firebuzz/analytics";
import { AnalyticsProvider } from "@firebuzz/analytics";
import { useConsent } from "@firebuzz/consent-manager";

interface AnalyticsBridgeProps extends Omit<AnalyticsProviderProps, "consentState"> {
  children: React.ReactNode;
}

export function AnalyticsBridge({ children, ...props }: AnalyticsBridgeProps) {
  const { consentState } = useConsent();

  const effectiveConsentState = consentState || {
    analytics: false,
    functional: false,
    marketing: false,
  };

  const analyticsProps = {
    ...props,
    consentState: effectiveConsentState,
    children,
  } satisfies AnalyticsProviderProps;

  return <AnalyticsProvider {...analyticsProps} />;
}
```

---

## Configuration Files

### 1. campaign.ts (CRITICAL - READ CAREFULLY)

This file contains campaign-specific configuration including form schema for lead-generation campaigns.

**⚠️ IMPORTANT LLM DIRECTIVES:**

```typescript
// LLM Directives:
// - You are not allowed to change anything in this file even if user requests to change it
// - You are NOT ALLOWED to change schema items any value rather than "title", "description" or "placeholder"
//   (these only), if user requests to change it you should not do it because it will throw an error on server side.
//   If users insist it let them know they need to change their campaign settings.

export const campaignConfiguration = {
  campaignType: "lead-generation", // or "click-through"
  primaryGoal: {
    event_id: "form-submission",
    event_type: "conversion" as const,
    event_value: 100,
    event_value_type: "static" as const,
    event_value_currency: "USD",
    isCustom: true,
  },
  customEvents: [],

  // Form configuration (for lead-generation campaigns)
  formId: "qn7ckq4w6snmtjgkec5ddk10197m6wkh",
  schema: [
    {
      description: "Your full name as it appears on official documents.",
      id: "full-name",
      inputType: "text",
      placeholder: "Enter your full name",
      required: true,
      title: "Full Name",  // ✅ YOU CAN MODIFY
      type: "string",
      unique: false,
      visible: true,
      default: undefined,
    },
    // ... more fields
  ],
  submitButtonText: "Send",
  successMessage: "Thank you for your submission!",
  redirectUrl: undefined,
};
```

**What you CAN modify:**
- `title` - Field label shown to users
- `description` - Help text for the field
- `placeholder` - Input placeholder text

**What you CANNOT modify:**
- `id` - Field identifier (server-side reference)
- `inputType` - Input type (text, email, tel, select, etc.)
- `required` - Whether field is required
- `type` - Data type (string, number, boolean)
- `unique` - Uniqueness constraint
- `visible` - Field visibility
- `default` - Default value
- `options` - For select fields

### 2. seo.ts

SEO metadata configuration.

```typescript
// LLM Directives:
// - You are not allowed to change any key in the seoConfiguration object
// - You can change the values based on user requests

export const seoConfiguration = {
  title: "Your Page Title",
  description: "Your page description for search engines and social media.",
  canonical: "https://yourdomain.com",
  indexable: true,
  iconType: "image/png",
  icon: "https://cdn.getfirebuzz.com/your-favicon.png",
  openGraph: {
    title: "OG Title",
    description: "OG Description",
    image: "https://cdn.getfirebuzz.com/og-image.png",
    url: "https://yourdomain.com",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Twitter Title",
    description: "Twitter Description",
    image: "https://cdn.getfirebuzz.com/twitter-image.png",
    url: "https://yourdomain.com",
  },
};
```

### 3. tags.ts

Third-party tracking tags configuration.

```typescript
// LLM Directives:
// - You are not allowed to change any key in the tagsConfiguration object
// - If user requests to change a tag, notify them they can change tags in settings > Tags

export const tagsConfiguration = {
  googleTagManagerId: null,         // "GTM-XXXXXXX" or null
  googleAnalyticsId: null,          // "G-XXXXXXXXXX" or null
  googleSiteVerificationId: null,   // "verification-code" or null
  facebookPixelId: null,            // "123456789012345" or null
};
```

---

## Internal Packages

### @firebuzz/analytics

**Purpose:** Track user events and conversions on landing pages.

**Key Features:**
- Automatic pageview tracking
- Custom event tracking
- Conversion goal tracking
- Session management
- Consent-aware (respects user consent choices)

**Usage:**
```typescript
import { AnalyticsProvider } from "@firebuzz/analytics";

// Already set up in analytics-bridge.tsx, no manual integration needed
```

**Session Context:**
Data automatically extracted from `window.__FIREBUZZ_SESSION_CONTEXT__` which is injected by the engine:

```typescript
interface FirebuzzSessionContext {
  userId: string;
  sessionId: string;
  workspaceId: string;
  projectId: string;
  campaignId: string;
  landingPageId: string;
  campaignEnvironment: "preview" | "production";
  apiBaseUrl: string;
  gdprSettings: { /* ... */ };
  botDetection: { /* ... */ };
}
```

### @firebuzz/consent-manager

**Purpose:** GDPR/CCPA compliant cookie consent management.

**Key Features:**
- Cookie consent banner
- Granular consent categories (analytics, marketing, functional)
- GTM consent mode integration
- Persistent consent storage
- Consent preferences dialog

**Usage:**
```typescript
import { ConsentProvider, useConsent } from "@firebuzz/consent-manager";

// Provider setup in main.tsx
<ConsentProvider
  translations={{ language: "en" }}
  gtm={{ consentDefaults: { /* ... */ } }}
  debug={false}
>
  {children}
</ConsentProvider>

// Access consent state
const { consentState, updateConsent } = useConsent();
```

**Components:**
- `<CookieBanner />` - Main consent banner (auto-shows when no consent given)
- `<CookiePreferencesButton />` - Floating button to reopen preferences
- `<CookiePreferencesDialog />` - Detailed preferences modal

### @firebuzz/design-mode

**Purpose:** Enable visual editing in Firebuzz dashboard.

**Key Features:**
- Visual overlay for clicking components
- Tailwind class editing
- Component tree visualization
- Real-time preview updates

**Usage:**
```typescript
// vite.config.ts
import { firebuzzDesignMode } from "@firebuzz/design-mode";

export default defineConfig({
  plugins: [
    react(),
    firebuzzDesignMode(),  // Automatically enabled
  ],
});
```

No manual integration needed in components. Works automatically.

---

## Component Patterns

### Image Component (Cloudflare-Optimized)

**Always use the custom Image component, never plain `<img>` tags.**

```typescript
import { Image } from "@/components/ui/image";

// Basic usage
<Image
  src="/path/to/image.jpg"
  alt="Descriptive alt text"
  width={800}
  height={600}
/>

// With blur placeholder
<Image
  src="https://cdn.getfirebuzz.com/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  placeholder="blur"
  blurDataURL="/path/to/low-res.jpg"
  priority  // Load eagerly (above-the-fold images)
/>

// Fill container
<div className="relative w-full h-96">
  <Image
    src="/background.jpg"
    alt="Background"
    fill
    sizes="100vw"
    className="object-cover"
  />
</div>
```

**Features:**
- Automatic Cloudflare CDN transformation
- WebP/AVIF format conversion
- Responsive srcSet generation
- Lazy loading by default
- Blur placeholder support
- Error handling with fallbacks

### Brand Components

Logo and icon components with automatic fallbacks.

```typescript
import { LogoLight } from "@/components/brand/logo-light";
import { LogoDark } from "@/components/brand/logo-dark";
import { IconLight } from "@/components/brand/icon-light";
import { IconDark } from "@/components/brand/icon-dark";

// In Navigation
<div className="block dark:hidden">
  <LogoLight width={120} height={40} />
</div>
<div className="hidden dark:block">
  <LogoDark width={120} height={40} />
</div>
```

**Brand Component Template:**
```typescript
import { Image } from "@/components/ui/image";

interface LogoLightProps {
  width?: number;
  height?: number;
}

export function LogoLight({ height = 20, width = 70 }: LogoLightProps) {
  const src = "https://cdn-dev.getfirebuzz.com/template-assets/logo-light.svg";
  const alt = "Company Logo";

  return <Image src={src} alt={alt} width={width} height={height} priority />;
}
```

### Form Integration (Lead Generation)

Use `formApiClient` from `@/lib/form-api` for form submissions.

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formApiClient } from "@/lib/form-api";
import { campaignConfiguration } from "@/configuration/campaign";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Create Zod schema from campaign configuration
const formSchema = z.object({
  "full-name": z.string().min(2, "Name is required"),
  "email": z.string().email("Valid email required"),
  "mobile": z.string().optional(),
});

export function LeadForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      "full-name": "",
      "email": "",
      "mobile": "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const result = await formApiClient.submitForm(
      campaignConfiguration.formId,
      values
    );

    if (result.success) {
      toast.success("Success!", {
        description: campaignConfiguration.successMessage,
      });
      form.reset();

      // Handle redirect if configured
      if (campaignConfiguration.redirectUrl) {
        window.location.href = campaignConfiguration.redirectUrl;
      }
    } else {
      toast.error("Submission failed", {
        description: formApiClient.getToastMessage(result),
      });

      // Set field-specific errors
      const errors = formApiClient.getValidationErrors(result);
      Object.entries(errors).forEach(([field, message]) => {
        form.setError(field as any, { message });
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {campaignConfiguration.schema
          .filter(field => field.visible)
          .map(field => (
            <FormField
              key={field.id}
              control={form.control}
              name={field.id as any}
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel>
                    {field.title}
                    {field.required && <span className="text-destructive">*</span>}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type={field.inputType}
                      placeholder={field.placeholder}
                      {...formField}
                    />
                  </FormControl>
                  {field.description && (
                    <p className="text-sm text-muted-foreground">{field.description}</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        <Button type="submit" size="lg" className="w-full">
          {campaignConfiguration.submitButtonText}
        </Button>
      </form>
    </Form>
  );
}
```

### Navigation Pattern

Standard navigation with theme toggle and mobile menu.

```typescript
import { useState, useEffect } from "react";
import { LogoDark } from "@/components/brand/logo-dark";
import { LogoLight } from "@/components/brand/logo-light";
import { Button } from "@/components/ui/button";

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const initialTheme = savedTheme || systemTheme;

    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("theme", newTheme);
  };

  return (
    <nav className="sticky top-0 z-50 border-b backdrop-blur-sm bg-background/80">
      <div className="container px-4 mx-auto">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="block dark:hidden">
              <LogoLight />
            </div>
            <div className="hidden dark:block">
              <LogoDark />
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden items-center space-x-4 md:flex">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-colors hover:bg-muted"
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <MoonIcon className="w-4 h-4" />
              ) : (
                <SunIcon className="w-4 h-4" />
              )}
            </button>

            <Button variant="ghost" size="sm">
              Learn More
            </Button>
            <Button size="sm">Get Started</Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center space-x-2 md:hidden">
            <button onClick={toggleTheme} /* ... */>
              {/* Theme icon */}
            </button>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {/* Hamburger icon */}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="border-t md:hidden bg-background">
            <div className="p-4 space-y-2">
              <Button variant="ghost" size="sm" className="w-full">
                Learn More
              </Button>
              <Button size="sm" className="w-full">
                Get Started
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
```

### Animation Patterns

Use `motion` from "motion/react" for smooth animations.

```typescript
import { motion } from "motion/react";

// Fade in on scroll
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6 }}
  viewport={{ once: true }}  // Animate only once
>
  <h2>Your Heading</h2>
</motion.div>

// Staggered children
<div className="grid md:grid-cols-3 gap-8">
  {features.map((feature, index) => (
    <motion.div
      key={index}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      viewport={{ once: true }}
    >
      {/* Feature card */}
    </motion.div>
  ))}
</div>

// Immediate animation (hero)
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6 }}
>
  <h1>Hero Headline</h1>
</motion.div>
```

**Animation Best Practices:**
- Use `viewport={{ once: true }}` for scroll animations (don't re-animate)
- Keep durations reasonable (0.3s - 0.8s)
- Use `delay` for staggered effects (0.1s increments)
- Animate `opacity` and `y` for simple reveals
- Avoid animating layout properties (width, height)

---

## Styling Guidelines

### Tailwind CSS Usage

Use Tailwind utility classes for all styling. Follow these patterns:

**Spacing:**
```tsx
<div className="p-4 md:p-8">           {/* Padding */}
<div className="mb-6 lg:mb-12">        {/* Margin bottom */}
<div className="space-y-4">            {/* Vertical spacing between children */}
<div className="gap-6">                {/* Gap in flex/grid */}
```

**Typography:**
```tsx
<h1 className="text-4xl lg:text-6xl font-bold">  {/* Responsive text */}
<p className="text-lg text-muted-foreground">    {/* Body text */}
<span className="text-sm font-medium">           {/* Small text */}
```

**Layout:**
```tsx
<div className="container mx-auto px-4">                 {/* Centered container */}
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">  {/* Responsive grid */}
<div className="flex items-center justify-between">      {/* Flexbox */}
```

**Colors:**
Always use semantic color variables:
```tsx
<div className="bg-background text-foreground">     {/* Base colors */}
<div className="bg-primary text-primary-foreground"> {/* Primary button */}
<div className="bg-muted text-muted-foreground">    {/* Muted section */}
<div className="bg-card text-card-foreground">      {/* Card */}
<div className="border border-border">              {/* Borders */}
```

**Hover/Active States:**
```tsx
<button className="hover:bg-muted transition-colors">
<a className="hover:text-primary transition-all duration-300">
```

### Class Merging with cn()

Always use the `cn()` utility for conditional classes:

```typescript
import { cn } from "@/lib/utils";

<div className={cn(
  "base-class",
  condition && "conditional-class",
  variant === "large" && "large-variant"
)}>
```

### Component Variants with CVA

For components with multiple variants, use `class-variance-authority`:

```typescript
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-input hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = ({ className, variant, size, ...props }: ButtonProps) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
};
```

---

## Conversion Best Practices

### Above the Fold Essentials

The top section (hero) must include:

1. **Clear Value Proposition** - What do you offer?
2. **Strong Headline** - Benefits-focused, emotional
3. **Supporting Subheadline** - Clarify the value
4. **Primary CTA** - Prominent, action-oriented
5. **Visual Element** - Hero image, illustration, or video
6. **Social Proof** - Trust badges, ratings, testimonials
7. **Urgency/Scarcity** (optional) - Limited time, spots available

**Example Hero Structure:**
```tsx
<section className="relative py-20 lg:py-28 bg-gradient-to-br from-background to-muted/50">
  <div className="container mx-auto px-4">
    <div className="max-w-4xl mx-auto text-center">
      {/* Badge with social proof or urgency */}
      <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
        🚀 Trusted by 10,000+ teams worldwide
      </div>

      {/* Headline */}
      <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6">
        Transform Your Workflow
        <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          {" "}In Minutes
        </span>
      </h1>

      {/* Subheadline */}
      <p className="text-xl lg:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
        Stop wasting time on repetitive tasks. Automate your workflow
        and achieve 10x better results with our AI-powered platform.
      </p>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
        <Button size="lg" className="px-8 py-6 text-lg">
          Start Free Trial
        </Button>
        <Button size="lg" variant="outline" className="px-8 py-6 text-lg">
          Watch Demo
        </Button>
      </div>

      {/* Social Proof */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-muted-foreground">
        <div className="flex items-center space-x-2">
          <StarRating rating={5} />
          <span>4.9/5 from 2,000+ reviews</span>
        </div>
        <div className="flex items-center space-x-2">
          <CheckIcon className="w-4 h-4 text-emerald-500" />
          <span>No credit card required</span>
        </div>
        <div className="flex items-center space-x-2">
          <CheckIcon className="w-4 h-4 text-emerald-500" />
          <span>Setup in under 5 minutes</span>
        </div>
      </div>
    </div>
  </div>

  {/* Background decoration */}
  <div className="absolute inset-0 -z-10 overflow-hidden">
    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
  </div>
</section>
```

### Social Proof Placement

Include social proof throughout the page:

1. **Hero Section** - Reviews count, star ratings, user counts
2. **Logo Bar** - Client/partner logos
3. **Testimonials Section** - Detailed customer stories
4. **Stats Section** - Numbers (users, revenue, time saved)
5. **Final CTA** - Reinforce with ratings/reviews

**Testimonial Pattern:**
```tsx
const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Marketing Director",
    company: "TechCorp",
    avatar: "https://cdn.getfirebuzz.com/avatars/sarah.jpg",
    content: "This platform completely transformed our workflow. We're now 3x more productive and our team loves it.",
    rating: 5,
  },
  // ... more testimonials
];

<section className="py-20 bg-muted/50">
  <div className="container mx-auto px-4">
    <h2 className="text-4xl font-bold text-center mb-16">
      Loved by Thousands of Teams
    </h2>

    <div className="grid md:grid-cols-3 gap-8">
      {testimonials.map((testimonial, index) => (
        <motion.div
          key={index}
          className="bg-card p-8 rounded-lg border"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: index * 0.1 }}
          viewport={{ once: true }}
        >
          {/* Star rating */}
          <div className="flex mb-4">
            {[...Array(testimonial.rating)].map((_, i) => (
              <StarIcon key={i} className="w-5 h-5 text-amber-500 fill-current" />
            ))}
          </div>

          {/* Quote */}
          <p className="text-muted-foreground mb-6">"{testimonial.content}"</p>

          {/* Author */}
          <div className="flex items-center space-x-4">
            <img
              src={testimonial.avatar}
              alt={testimonial.name}
              className="w-12 h-12 rounded-full"
            />
            <div>
              <div className="font-semibold">{testimonial.name}</div>
              <div className="text-sm text-muted-foreground">
                {testimonial.role}, {testimonial.company}
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
</section>
```

### Trust Signals

Display trust indicators throughout:

**Security Badges:**
```tsx
<div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
  <div className="flex items-center space-x-2">
    <LockIcon className="w-4 h-4" />
    <span>256-bit SSL Secured</span>
  </div>
  <div className="flex items-center space-x-2">
    <ShieldIcon className="w-4 h-4" />
    <span>GDPR Compliant</span>
  </div>
  <div className="flex items-center space-x-2">
    <CheckCircleIcon className="w-4 h-4" />
    <span>SOC 2 Certified</span>
  </div>
  <div className="flex items-center space-x-2">
    <ZapIcon className="w-4 h-4" />
    <span>99.9% Uptime</span>
  </div>
</div>
```

**Money-Back Guarantee:**
```tsx
<div className="bg-muted/50 p-6 rounded-lg">
  <div className="flex items-start space-x-4">
    <div className="flex-shrink-0">
      <ShieldCheckIcon className="w-8 h-8 text-emerald-500" />
    </div>
    <div>
      <h3 className="font-semibold mb-2">30-Day Money-Back Guarantee</h3>
      <p className="text-sm text-muted-foreground">
        Not satisfied? Get a full refund within 30 days. No questions asked.
      </p>
    </div>
  </div>
</div>
```

### CTA Best Practices

**CTA Button Design:**
- Use action-oriented text ("Start Free Trial" not "Submit")
- Make primary CTA stand out (size, color, whitespace)
- Include secondary CTA for lower commitment ("Watch Demo")
- Add benefit/urgency near CTA ("No credit card required")

**CTA Placement:**
- Hero section (above fold)
- After each value section
- Sticky footer bar (optional)
- Final CTA section before footer
- Inside navigation (optional)

**CTA Button Patterns:**
```tsx
{/* Primary CTA */}
<Button size="lg" className="px-8 py-6 text-lg group">
  Start Free Trial
  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
</Button>

{/* Secondary CTA */}
<Button size="lg" variant="outline" className="px-8 py-6 text-lg">
  Watch 2-Min Demo
</Button>

{/* With benefit */}
<div className="space-y-4">
  <Button size="lg" className="w-full px-8 py-6 text-lg">
    Get Started Now
  </Button>
  <p className="text-sm text-center text-muted-foreground">
    ✓ No credit card required ✓ 14-day free trial ✓ Cancel anytime
  </p>
</div>
```

### Urgency & Scarcity

Use sparingly and authentically:

**Limited Time Offers:**
```tsx
<div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
  <div className="flex items-center space-x-2 text-destructive font-medium">
    <Clock className="w-5 h-5" />
    <span>Limited Time: 50% off ends in</span>
  </div>
  <div className="mt-2 text-2xl font-bold">
    23h 45m 12s
  </div>
</div>
```

**Limited Spots:**
```tsx
<div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
  <div className="flex items-center justify-between">
    <div>
      <div className="font-semibold">Only 3 spots left at this price</div>
      <div className="text-sm text-muted-foreground">Join 127 people who signed up today</div>
    </div>
    <UsersIcon className="w-8 h-8 text-primary" />
  </div>
</div>
```

**Social Proof Notifications:**
```tsx
<div className="bg-card border rounded-lg p-4 shadow-lg">
  <div className="flex items-center space-x-3">
    <div className="flex-shrink-0">
      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
        <UserCheck className="w-5 h-5 text-primary" />
      </div>
    </div>
    <div>
      <div className="font-medium">Sarah from New York</div>
      <div className="text-sm text-muted-foreground">Just signed up 2 minutes ago</div>
    </div>
  </div>
</div>
```

---

## Marketing & CRO Guidelines

### Landing Page Structure

Recommended section order for maximum conversions:

**For Click-Through Campaigns:**
1. Navigation
2. Hero (value prop + CTA)
3. Social Proof / Logo Bar
4. Problem Section (pain points)
5. Solution Section (your answer)
6. Features Section (benefits)
7. How It Works (3-step process)
8. Testimonials
9. Comparison / Pricing (optional)
10. FAQ
11. Final CTA
12. Footer

**For Lead Generation Campaigns:**
1. Navigation
2. Hero (value prop + form preview/CTA to form)
3. Social Proof / Logo Bar
4. Benefits Section (why give you their info)
5. Features / What You Get
6. Testimonials
7. **Lead Form Section** ← Primary conversion point
8. FAQ
9. Footer

### Problem-Solution-Benefit Flow

**Problem Section:**
Articulate customer pain points clearly.

```tsx
<section className="py-20">
  <div className="container mx-auto px-4">
    <div className="max-w-4xl mx-auto">
      <h2 className="text-4xl font-bold text-center mb-6">
        Tired of These Common Challenges?
      </h2>
      <p className="text-xl text-center text-muted-foreground mb-16">
        You're not alone. Here's what most teams struggle with:
      </p>

      <div className="grid md:grid-cols-3 gap-8">
        {problems.map((problem, index) => (
          <div key={index} className="bg-muted/50 p-8 rounded-lg">
            <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center mb-4">
              <XCircle className="w-6 h-6 text-destructive" />
            </div>
            <h3 className="text-xl font-semibold mb-4">{problem.title}</h3>
            <p className="text-muted-foreground">{problem.description}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
</section>
```

**Solution Section:**
Show how you solve those problems.

```tsx
<section className="py-20 bg-primary text-primary-foreground">
  <div className="container mx-auto px-4">
    <div className="max-w-4xl mx-auto text-center">
      <h2 className="text-4xl font-bold mb-6">
        Introducing [Your Solution]
      </h2>
      <p className="text-xl mb-12 text-primary-foreground/90">
        The all-in-one platform that eliminates these challenges
        and helps you achieve [key outcome] in [timeframe].
      </p>

      <div className="grid md:grid-cols-2 gap-8 text-left">
        {solutions.map((solution, index) => (
          <div key={index} className="bg-primary-foreground/10 backdrop-blur p-6 rounded-lg">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-xl font-semibold mb-3">{solution.title}</h3>
            <p className="text-primary-foreground/80">{solution.description}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
</section>
```

### Features vs Benefits

**Always frame features as benefits** - focus on outcomes, not capabilities.

❌ **Wrong (Feature-focused):**
"Our platform has real-time collaboration"

✅ **Right (Benefit-focused):**
"Work with your team in real-time and ship projects 3x faster"

**Feature-Benefit Pattern:**
```tsx
const features = [
  {
    title: "Real-Time Collaboration",
    feature: "Live editing and commenting",
    benefit: "Ship projects 3x faster by working together seamlessly",
    icon: Users,
  },
  {
    title: "AI-Powered Automation",
    feature: "Smart workflow automation",
    benefit: "Save 20+ hours per week on repetitive tasks",
    icon: Zap,
  },
  {
    title: "Advanced Analytics",
    feature: "Comprehensive dashboards",
    benefit: "Make data-driven decisions that increase ROI by 40%",
    icon: BarChart3,
  },
];

<section className="py-20">
  <div className="container mx-auto px-4">
    <h2 className="text-4xl font-bold text-center mb-16">
      Everything You Need to Succeed
    </h2>

    <div className="grid md:grid-cols-3 gap-8">
      {features.map((feature, index) => (
        <motion.div
          key={index}
          className="bg-card p-8 rounded-lg border hover:shadow-lg transition-shadow"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: index * 0.1 }}
          viewport={{ once: true }}
        >
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
            <feature.icon className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
          <p className="text-muted-foreground mb-4">{feature.benefit}</p>
          <p className="text-sm text-muted-foreground/70">{feature.feature}</p>
        </motion.div>
      ))}
    </div>
  </div>
</section>
```

### How It Works Section

**Use 3-step process** (keeps it simple and achievable).

```tsx
<section className="py-20 bg-muted/50">
  <div className="container mx-auto px-4">
    <div className="max-w-4xl mx-auto">
      <h2 className="text-4xl font-bold text-center mb-6">
        Get Started in 3 Simple Steps
      </h2>
      <p className="text-xl text-center text-muted-foreground mb-16">
        No technical knowledge required. You'll be up and running in minutes.
      </p>

      <div className="space-y-12">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            className="flex flex-col md:flex-row items-center gap-8"
            initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            {/* Step number */}
            <div className="flex-shrink-0 w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold">
              {index + 1}
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3 className="text-2xl font-semibold mb-3">{step.title}</h3>
              <p className="text-lg text-muted-foreground">{step.description}</p>
            </div>

            {/* Visual (optional) */}
            <div className="flex-shrink-0 w-64 h-48 bg-muted rounded-lg flex items-center justify-center">
              <step.icon className="w-16 h-16 text-muted-foreground" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="text-center mt-16">
        <Button size="lg" className="px-8 py-6 text-lg">
          Start Your Free Trial
        </Button>
        <p className="text-sm text-muted-foreground mt-4">
          Setup takes less than 5 minutes
        </p>
      </div>
    </div>
  </div>
</section>
```

### Pricing Section Best Practices

**For Click-Through Campaigns:**
Include pricing (builds trust, qualifies leads).

```tsx
<section className="py-20">
  <div className="container mx-auto px-4">
    <div className="max-w-6xl mx-auto">
      <h2 className="text-4xl font-bold text-center mb-6">
        Simple, Transparent Pricing
      </h2>
      <p className="text-xl text-center text-muted-foreground mb-16">
        Choose the plan that's right for you. Cancel anytime.
      </p>

      {/* Monthly/Annual Toggle */}
      <div className="flex items-center justify-center mb-12">
        <button
          onClick={() => setBilling("monthly")}
          className={cn(
            "px-6 py-3 rounded-l-lg font-medium transition-colors",
            billing === "monthly"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling("annual")}
          className={cn(
            "px-6 py-3 rounded-r-lg font-medium transition-colors",
            billing === "annual"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          Annual <span className="ml-2 text-sm">(Save 20%)</span>
        </button>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan, index) => (
          <motion.div
            key={index}
            className={cn(
              "bg-card p-8 rounded-lg border",
              plan.popular && "ring-2 ring-primary shadow-lg scale-105"
            )}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            viewport={{ once: true }}
          >
            {plan.popular && (
              <div className="bg-primary text-primary-foreground text-sm font-medium px-4 py-1 rounded-full inline-block mb-4">
                Most Popular
              </div>
            )}

            <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
            <div className="mb-6">
              <span className="text-4xl font-bold">
                ${billing === "monthly" ? plan.monthlyPrice : plan.annualPrice}
              </span>
              <span className="text-muted-foreground">/month</span>
            </div>

            <Button
              size="lg"
              variant={plan.popular ? "default" : "outline"}
              className="w-full mb-6"
            >
              {plan.cta}
            </Button>

            <ul className="space-y-3">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start space-x-3">
                  <CheckIcon className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  </div>
</section>
```

### FAQ Section for Objection Handling

Address common objections proactively.

```tsx
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Do I need a credit card to start?",
    answer: "No, you can start your 14-day free trial without entering any payment information.",
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes, you can cancel your subscription at any time with no cancellation fees or penalties.",
  },
  {
    question: "How secure is my data?",
    answer: "We use bank-level 256-bit SSL encryption and are SOC 2 certified. Your data is backed up daily.",
  },
  // ... more FAQs addressing specific objections
];

<section className="py-20 bg-muted/50">
  <div className="container mx-auto px-4">
    <div className="max-w-3xl mx-auto">
      <h2 className="text-4xl font-bold text-center mb-6">
        Frequently Asked Questions
      </h2>
      <p className="text-xl text-center text-muted-foreground mb-12">
        Everything you need to know about [Product]
      </p>

      <Accordion type="single" collapsible className="space-y-4">
        {faqs.map((faq, index) => (
          <AccordionItem
            key={index}
            value={`item-${index}`}
            className="bg-card border rounded-lg px-6"
          >
            <AccordionTrigger className="text-left font-semibold hover:no-underline">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="text-center mt-12">
        <p className="text-muted-foreground mb-4">Still have questions?</p>
        <Button variant="outline" size="lg">
          Contact Support
        </Button>
      </div>
    </div>
  </div>
</section>
```

### Final CTA Section

**Strong close with benefits recap and urgency.**

```tsx
<section className="py-20 bg-primary text-primary-foreground">
  <div className="container mx-auto px-4">
    <div className="max-w-4xl mx-auto text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2 className="text-4xl lg:text-5xl font-bold mb-6">
          Ready to Transform Your Workflow?
        </h2>
        <p className="text-xl text-primary-foreground/90 mb-8">
          Join thousands of teams who have already revolutionized their
          productivity. Start your free trial today.
        </p>

        {/* Benefits Grid */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
          {["30-day free trial", "No credit card required", "Setup in 5 minutes", "Cancel anytime"].map((benefit, index) => (
            <div key={index} className="flex items-center space-x-2 text-primary-foreground/90">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <span className="text-sm font-medium">{benefit}</span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <Button
          size="lg"
          variant="secondary"
          className="px-12 py-6 text-lg font-semibold"
        >
          Start Your Free Trial
        </Button>

        {/* Social Proof */}
        <div className="flex items-center justify-center mt-8 space-x-2">
          <StarRating rating={5} className="text-amber-500" />
          <span className="font-medium text-primary-foreground/90">
            4.9/5 from 2,000+ reviews
          </span>
        </div>

        {/* Trust Signals */}
        <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-primary-foreground/70">
          <div className="flex items-center space-x-2">
            <LockIcon className="w-4 h-4" />
            <span>SSL Secured</span>
          </div>
          <div className="flex items-center space-x-2">
            <ShieldIcon className="w-4 h-4" />
            <span>GDPR Compliant</span>
          </div>
          <div className="flex items-center space-x-2">
            <ZapIcon className="w-4 h-4" />
            <span>99.9% Uptime</span>
          </div>
        </div>
      </motion.div>
    </div>
  </div>
</section>
```

---

## Template Workflow

### 1. Create New Template

Use the template CLI to create a new template from the base template.

```bash
# Navigate to template CLI
cd packages/template-cli

# Run create command
pnpm create

# Enter template name when prompted (use kebab-case)
# Example: "conversion-pro", "saas-landing", "event-registration"
```

**What happens:**
- Copies base template to `templates/[your-name]/`
- Updates package.json with new name
- Installs dependencies
- Ready for development

### 2. Develop Template

```bash
# Navigate to your template
cd templates/[your-template-name]

# Start development server
pnpm dev
```

**Development checklist:**
- [ ] Build all sections (Hero, Features, Testimonials, etc.)
- [ ] Configure campaign.ts (type, form schema if lead-gen)
- [ ] Update seo.ts with appropriate metadata
- [ ] Test all components render correctly
- [ ] Check browser console for errors/warnings
- [ ] Test responsive design (mobile, tablet, desktop)
- [ ] Test theme toggle (light/dark mode)
- [ ] Verify all animations work smoothly
- [ ] Test form submission (if lead-generation)
- [ ] Check accessibility (keyboard navigation, alt text, ARIA labels)

### 3. Build & Verify

```bash
# Build for production
pnpm run build

# Check dist/ folder
ls -la dist/

# Preview built version (optional)
pnpm preview
```

**Build checklist:**
- [ ] Build completes without errors
- [ ] dist/ folder contains index.html
- [ ] dist/assets/ contains JS and CSS files
- [ ] Check bundle sizes (JS < 500KB, CSS < 100KB ideally)
- [ ] No TypeScript errors
- [ ] No console warnings

### 4. Pack Template

```bash
# Navigate to template CLI
cd packages/template-cli

# Run pack command
pnpm pack

# Follow prompts:
# 1. Select your template from list
# 2. Select environment (dev/preview/production)
```

**Pack process:**
1. Builds template (runs `pnpm run build`)
2. Creates tarball of template files
3. Uploads HTML/JS/CSS to Cloudflare KV
4. Waits 60s for cache propagation
5. Captures screenshot of live template
6. Uploads screenshot to Cloudflare R2
7. Uploads tarball to Cloudflare R2

**Pack output:**
```
✅ Successfully packed and published [template-name] to [environment]!

Screenshot URL: https://cdn.getfirebuzz.com/screenshots/your-template.png
```

---

## After Completion Checklist

### Pre-Packing Verification

**Development Testing:**
- [ ] Run `pnpm dev` and verify all components render
- [ ] Check browser console for errors/warnings
- [ ] Test all CTAs and links work
- [ ] Test form submission (if lead-generation)
- [ ] Verify analytics tracking fires (check network tab for events)
- [ ] Test cookie consent banner appears and works
- [ ] Test theme toggle (light/dark mode)
- [ ] Test responsive design:
  - [ ] Mobile (< 768px)
  - [ ] Tablet (768px - 1024px)
  - [ ] Desktop (> 1024px)
- [ ] Test keyboard navigation
- [ ] Check all images load
- [ ] Verify animations play correctly

**Build Verification:**
- [ ] Run `pnpm run build` successfully
- [ ] Check build output has no errors
- [ ] Verify dist/ folder structure:
  ```
  dist/
  ├── index.html
  ├── assets/
  │   ├── index-[hash].js
  │   └── index-[hash].css
  └── .vite/
      ├── manifest.json
      └── ssr-manifest.json
  ```
- [ ] Check bundle sizes (aim for < 500KB total)

### Post-Packing Verification

- [ ] Note screenshot URL from pack output
- [ ] Visit preview URL to test live template
- [ ] Verify template loads on live URL
- [ ] Test form submission on live environment (if lead-gen)
- [ ] Check analytics events fire on live environment
- [ ] Verify cookie banner appears on first visit

### Database Entry

After successfully packing your template, create an entry in the `landingPageTemplates` Convex table:

```javascript
{
  title: "Conversion Pro",  // User-friendly display name
  description: "A high-converting SaaS landing page template with hero, features, pricing, testimonials, and FAQ sections. Optimized for click-through campaigns with multiple CTAs and social proof elements.",
  slug: "conversion-pro",  // Must match folder name (kebab-case)
  type: "firebuzz",  // "firebuzz" for official templates, "workspace" for custom
  thumbnail: "https://cdn.getfirebuzz.com/screenshots/conversion-pro.png",  // From pack output
  key: "conversion-pro",  // Same as slug - used for KV/R2 lookups
  tags: ["saas", "service"],  // One or more: saas, ecommerce, service, events, education, non-profit, other

  // Optional - only for workspace templates
  workspaceId: undefined,  // Id<"workspaces"> or undefined
  projectId: undefined,    // Id<"projects"> or undefined
  createdBy: undefined,    // Id<"users"> or undefined
}
```

**Tag Definitions:**
- `saas` - Software as a Service products
- `ecommerce` - Online stores, product sales
- `service` - Professional services, agencies
- `events` - Conferences, webinars, workshops
- `education` - Courses, training, educational content
- `non-profit` - Charities, fundraising, causes
- `other` - Anything that doesn't fit above categories

**Field Requirements:**
- `title` - Short, descriptive name (2-50 chars)
- `description` - Detailed description highlighting key features and use cases (50-300 chars)
- `slug` - Unique identifier, must match template folder name exactly
- `thumbnail` - Full URL to screenshot (from pack output)
- `key` - Must match slug exactly
- `tags` - At least one tag, can be multiple

### Template Documentation

Update the template's README.md with:
- Template description and use case
- Key features and sections
- Customization instructions
- Screenshot or demo URL
- Any special notes or requirements

---

## Do's and Don'ts

### ✅ DO

**Architecture:**
- Use existing UI components from `src/components/ui/`
- Follow the standard folder structure
- Keep configuration files in `src/configuration/`
- Use TypeScript for type safety
- Export components as named exports: `export const Component = () => {}`

**Styling:**
- Use Tailwind utility classes exclusively
- Use semantic color variables (background, foreground, primary, etc.)
- Use `cn()` utility for conditional classes
- Make designs mobile-first responsive
- Test in light and dark themes

**Components:**
- Use the custom Image component for all images
- Include brand components (logo, icons) with theme variants
- Add motion animations for scroll reveals
- Include cookie consent banner
- Set up analytics tracking properly

**Forms (Lead Generation):**
- Use react-hook-form + zod
- Integrate with formApiClient
- Map schema from campaignConfiguration
- Show validation errors properly
- Display success message after submission

**Conversion Optimization:**
- Include multiple CTAs throughout page
- Add social proof everywhere (reviews, logos, stats)
- Use urgency/scarcity elements (sparingly)
- Display trust signals (security badges, guarantees)
- Make primary CTA prominent and action-oriented

**Accessibility:**
- Use semantic HTML (header, nav, main, section, footer)
- Add ARIA labels to interactive elements
- Ensure keyboard navigation works
- Provide alt text for all images
- Test color contrast (WCAG AA)

**Testing:**
- Run `pnpm dev` and check console
- Test all breakpoints (mobile, tablet, desktop)
- Verify form submission works
- Check analytics events fire
- Test theme toggle
- Preview build before packing

### ❌ DON'T

**Configuration:**
- ❌ Modify campaign.ts schema structure (only title/description/placeholder allowed)
- ❌ Change seo.ts or tags.ts object keys
- ❌ Hardcode API URLs or form IDs outside configuration
- ❌ Skip LLM directives in configuration files

**Components:**
- ❌ Use plain `<img>` tags (use Image component)
- ❌ Create files outside standard folder structure
- ❌ Use default exports for components (use named exports)
- ❌ Skip the TooltipProvider (it's global in main.tsx)
- ❌ Use array index as React keys (use stable identifiers)

**Styling:**
- ❌ Use inline styles (use Tailwind classes)
- ❌ Use hardcoded colors (use semantic variables)
- ❌ Forget dark mode support
- ❌ Ignore mobile responsiveness
- ❌ Use pixel values instead of Tailwind spacing

**Analytics & Consent:**
- ❌ Skip analytics setup (AnalyticsBridge required)
- ❌ Forget cookie consent banner
- ❌ Remove ConsentProvider from main.tsx
- ❌ Track events without consent check

**Forms:**
- ❌ Bypass formApiClient (use it for all submissions)
- ❌ Modify form schema structure in campaign.ts
- ❌ Forget validation error handling
- ❌ Skip success message display

**Conversion Elements:**
- ❌ Have only one CTA on the page
- ❌ Skip social proof elements
- ❌ Forget trust signals
- ❌ Use vague CTA text ("Submit", "Click Here")
- ❌ Hide pricing (if applicable)

**Performance:**
- ❌ Load all images eagerly (use lazy loading)
- ❌ Skip Image component optimization
- ❌ Create huge bundle sizes (> 1MB)
- ❌ Forget to test build output

**Development:**
- ❌ Commit node_modules or dist/ folders
- ❌ Skip testing in development
- ❌ Pack without building first
- ❌ Forget to check console for errors

---

## Additional Resources

### Useful Hooks

**useCampaignEnv:**
Detect current environment (dev/preview/production).

```typescript
import { useCampaignEnv } from "@/hooks/use-campaign-env";

function MyComponent() {
  const env = useCampaignEnv();

  if (env === "dev") {
    // Development/template mode - show placeholder content
  } else {
    // Real Firebuzz environment (preview/production)
  }
}
```

### Icon Library (lucide-react)

Use lucide-react for all icons:

```typescript
import {
  ArrowRight,
  CheckCircle,
  Star,
  Users,
  Zap,
  Shield,
  Lock,
} from "lucide-react";

<CheckCircle className="w-5 h-5 text-emerald-500" />
```

### Toast Notifications (sonner)

Show toast notifications for user feedback:

```typescript
import { toast } from "sonner";

// Success
toast.success("Form submitted!", {
  description: "We'll be in touch soon.",
});

// Error
toast.error("Submission failed", {
  description: "Please check your information and try again.",
});

// Loading
const toastId = toast.loading("Submitting...");
// Later:
toast.success("Success!", { id: toastId });
```

### Common Utilities

**cn() - Class Name Merger:**
```typescript
import { cn } from "@/lib/utils";

<div className={cn(
  "base-class",
  isActive && "active-class",
  variant === "primary" && "primary-variant"
)} />
```

**Form API Client:**
```typescript
import { formApiClient } from "@/lib/form-api";

const result = await formApiClient.submitForm(formId, data);
if (result.success) {
  // Handle success
} else {
  // Handle error
  const errorMessage = formApiClient.getToastMessage(result);
  const fieldErrors = formApiClient.getValidationErrors(result);
}
```

---

## Conclusion

This guide covers everything needed to build high-converting, conversion-optimized landing pages in the Firebuzz template system. Follow these guidelines carefully to ensure:

✅ Technical compatibility with Firebuzz platform
✅ Conversion optimization best practices
✅ Accessibility and performance standards
✅ Consistent user experience across templates
✅ Proper analytics and consent management

**Key Takeaways:**
1. **Follow the architecture** - File structure and conventions are mandatory
2. **Don't modify config schemas** - Only change user-facing text
3. **Use internal packages** - Analytics, consent, design mode are required
4. **Optimize for conversions** - Multiple CTAs, social proof, trust signals
5. **Test thoroughly** - Dev, build, and pack verification required
6. **Document everything** - Update README and provide database entry

**When in doubt:**
- Check the base template for reference
- Follow existing component patterns
- Test early and often
- Prioritize user experience and conversions

Good luck building amazing templates! 🚀
