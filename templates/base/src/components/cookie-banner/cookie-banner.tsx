"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useConsent,
  useConsentBanner,
  useConsentModal,
} from "@firebuzz/consent-manager";
import { useCampaignEnv } from "@/hooks/use-campaign-env";
import * as React from "react";
import { CookiePreferencesDialog } from "./cookie-preferences-dialog";

interface CookieBannerProps {
  showBrandColors?: boolean;
}

/**
 * Cookie Banner Component with GDPR compliance, focus trapping, and scroll blocking.
 *
 * Features:
 * - Initial consent banner (bottom of screen)
 * - Detailed preferences dialog with focus trapping
 * - Scroll blocking when banner/dialog is open
 * - Keyboard navigation support
 * - Screen reader friendly
 * - Respects user preferences and consent state
 */
export const CookieBanner: React.FC<CookieBannerProps> = () => {
  const [isHydrated, setIsHydrated] = React.useState(false);
  const campaignEnv = useCampaignEnv();
  
  // Ensure hydration is complete before showing banner to prevent SSR mismatch
  React.useEffect(() => {
    setIsHydrated(true);
  }, []);
  const { isConsentRequired, privacyPolicyUrl, termsOfServiceUrl } = useConsent();
  const {
    showBanner,
    acceptAll,
    rejectAll,
    openModal,
    texts: bannerTexts,
  } = useConsentBanner();
  const {
    showModal: showPreferencesDialog,
    setShowModal: setShowPreferencesDialog,
  } = useConsentModal();

  // Refs for focus management
  const bannerRef = React.useRef<HTMLDivElement>(null);
  const firstFocusableRef = React.useRef<HTMLButtonElement>(null);
  const lastFocusableRef = React.useRef<HTMLButtonElement>(null);

  // No need for local state management - handled by consent manager hooks

  // Scroll blocking effect
  React.useEffect(() => {
    const shouldBlockScroll = showBanner || showPreferencesDialog;

    if (shouldBlockScroll) {
      // Save current scroll position
      const scrollY = window.scrollY;

      // Apply scroll blocking styles
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";

      return () => {
        // Restore scroll position
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [showBanner, showPreferencesDialog]);

  // Focus trapping for banner
  React.useEffect(() => {
    if (showBanner && bannerRef.current) {
      // Focus the first button when banner appears
      setTimeout(() => {
        firstFocusableRef.current?.focus();
      }, 100);
    }
  }, [showBanner]);

  // Keyboard navigation for banner
  const handleBannerKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      const focusableElements = bannerRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[
        focusableElements.length - 1
      ] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    } else if (e.key === "Escape") {
      // Allow escape to accept essential cookies only
      handleAcceptEssential();
    }
  }, []);

  // Handle accepting all cookies
  const handleAcceptAll = React.useCallback(() => {
    acceptAll();
  }, [acceptAll]);

  // Handle accepting essential cookies only
  const handleAcceptEssential = React.useCallback(() => {
    rejectAll();
  }, [rejectAll]);

  // Handle opening preferences dialog
  const handleOpenPreferences = React.useCallback(() => {
    openModal();
  }, [openModal]);

  // Conditional rendering logic based on environment and consent requirements
  const shouldShowBanner = React.useMemo(() => {
    // In dev environment (template mode): always show banner for demonstration
    if (campaignEnv === 'dev') {
      return showBanner;
    }
    
    // In preview/production: only show if consent is actually required
    return isConsentRequired && showBanner;
  }, [campaignEnv, isConsentRequired, showBanner]);

  // Don't render anything if not hydrated yet (prevents SSR mismatch)
  if (!isHydrated) {
    return null;
  }

  // Don't render anything if banner shouldn't be shown
  if (!shouldShowBanner && !showPreferencesDialog) {
    return null;
  }

  return (
    <>
      {/* Main Cookie Banner */}
      {shouldShowBanner && (
        <div
          ref={bannerRef}
          onKeyDown={handleBannerKeyDown}
          className="flex fixed inset-0 bottom-0 z-50 justify-center items-end p-4 border-t shadow-lg bg-background/80"
          role="dialog"
          aria-label="Cookie consent banner"
          aria-describedby="cookie-banner-description"
        >
          <div className="mx-auto max-w-lg">
            <Card className="overflow-hidden border-border">
              <CardHeader className="pb-0">
                <CardTitle className="flex gap-2 items-center text-lg">
                  {bannerTexts.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p
                  id="cookie-banner-description"
                  className="text-sm leading-relaxed text-muted-foreground"
                >
                  {bannerTexts.description}
                </p>
              </CardContent>
              <CardFooter className="flex gap-2 items-center py-4 border-t bg-muted">
                <Button
                  ref={firstFocusableRef}
                  onClick={handleAcceptAll}
                  size="sm"
                >
                  {bannerTexts.acceptAll}
                </Button>

                <Button
                  ref={lastFocusableRef}
                  onClick={handleOpenPreferences}
                  variant="outline"
                  size="sm"
                >
                  {bannerTexts.manageCookies}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}

      {/* Cookie Preferences Dialog */}
      <CookiePreferencesDialog
        open={showPreferencesDialog}
        onOpenChange={setShowPreferencesDialog}
        privacyPolicyUrl={privacyPolicyUrl}
        termsOfServiceUrl={termsOfServiceUrl}
      />
    </>
  );
};

CookieBanner.displayName = "CookieBanner";