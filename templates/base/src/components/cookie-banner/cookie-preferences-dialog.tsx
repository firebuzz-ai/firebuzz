"use client";

import type { ConsentPreferences } from "@firebuzz/consent-manager";
import { 
  useConsent, 
  useConsentCategories,
  useConsentModal 
} from "@firebuzz/consent-manager";
import { Cookie, Shield, Target, Zap } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

interface CookiePreferencesDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Privacy policy URL (optional) */
  privacyPolicyUrl?: string;
  /** Terms of service URL (optional) */
  termsOfServiceUrl?: string;
  /** Called when preferences are saved */
  onSave?: () => void;
  /** Called when accept all is clicked */
  onAcceptAll?: () => void;
  /** Called when reject all is clicked */
  onRejectAll?: () => void;
}

/**
 * Shared Cookie Preferences Dialog Component
 *
 * Used by both the cookie banner and the cookie preferences button
 * to provide a consistent preferences management interface.
 */
export const CookiePreferencesDialog: React.FC<
  CookiePreferencesDialogProps
> = ({
  open,
  onOpenChange,
  privacyPolicyUrl,
  termsOfServiceUrl,
  onSave,
  onAcceptAll,
  onRejectAll,
}) => {
  const { texts, acceptAll, rejectAll, updateConsent } = useConsent();
  const {
    preferences,
    updateCategory,
    texts: categoryTexts,
  } = useConsentCategories();
  const { closeModal } = useConsentModal();

  const cookieCategories = [
    {
      id: "necessary" as const,
      title: categoryTexts.necessary.title,
      description: categoryTexts.necessary.description,
      icon: Shield,
      required: true,
    },
    {
      id: "functional" as const,
      title: categoryTexts.functional.title,
      description: categoryTexts.functional.description,
      icon: Zap,
      required: false,
    },
    {
      id: "analytics" as const,
      title: categoryTexts.analytics.title,
      description: categoryTexts.analytics.description,
      icon: Target,
      required: false,
    },
    {
      id: "marketing" as const,
      title: categoryTexts.marketing.title,
      description: categoryTexts.marketing.description,
      icon: Cookie,
      required: false,
    },
  ];

  const handlePreferenceChange = React.useCallback(
    (key: keyof ConsentPreferences, value: boolean) => {
      updateCategory(key, value);
    },
    [updateCategory]
  );

  const handleSave = React.useCallback(async () => {
    // Save the current preferences state to ensure everything is committed
    await updateConsent(preferences);
    // Close the modal in the consent manager (this will also hide the banner)
    closeModal();
    onSave?.();
    onOpenChange(false);
  }, [updateConsent, preferences, closeModal, onSave, onOpenChange]);

  const handleAcceptAll = React.useCallback(() => {
    acceptAll();
    onAcceptAll?.();
    onOpenChange(false);
  }, [acceptAll, onAcceptAll, onOpenChange]);

  const handleRejectAll = React.useCallback(() => {
    rejectAll();
    onRejectAll?.();
    onOpenChange(false);
  }, [rejectAll, onRejectAll, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 border-b">
          <DialogTitle className="flex gap-2 items-center">
            {texts.modal.title}
          </DialogTitle>
          <DialogDescription className="text-left">
            {texts.modal.description}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {cookieCategories.map((category) => {
            const isEnabled = preferences[category.id];

            return (
              <div
                key={category.id}
                className="flex justify-between items-start p-4 space-x-4 rounded-lg border bg-card"
              >
                <div className="flex flex-1 items-start space-x-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex gap-2 items-center">
                      <h4 className="text-sm font-medium">{category.title}</h4>
                      {category.required && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {category.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) =>
                      handlePreferenceChange(category.id, checked)
                    }
                    disabled={category.required}
                    aria-label={`${category.title} ${category.required ? "(required)" : ""}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="inline-block p-6 space-y-4 border-t bg-muted/30">
          <div className="flex flex-col gap-3 justify-between sm:flex-row">
            <Button onClick={handleSave} className="flex-1 sm:flex-none">
              {texts.modal.save}
            </Button>
            <div className="flex gap-2 items-center">
              <Button
                onClick={handleAcceptAll}
                variant="outline"
                className="flex-1 sm:flex-none"
              >
                {texts.modal.acceptAll}
              </Button>
              <Button
                onClick={handleRejectAll}
                variant="outline"
                className="flex-1 sm:flex-none"
              >
                {texts.modal.rejectAll}
              </Button>
            </div>
          </div>

          {(privacyPolicyUrl || termsOfServiceUrl) && (
            <div className="pt-4 border-t">
              <p className="text-xs text-center text-muted-foreground">
                For more information, please read our{" "}
                {privacyPolicyUrl && (
                  <>
                    <a
                      href={privacyPolicyUrl}
                      className="font-medium text-primary hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {texts.footer.privacyPolicy || "Privacy Policy"}
                    </a>
                    {termsOfServiceUrl && <span>{" "}and{" "}</span>}
                  </>
                )}
                {termsOfServiceUrl && (
                  <a
                    href={termsOfServiceUrl}
                    className="font-medium text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Terms of Service
                  </a>
                )}
              </p>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

CookiePreferencesDialog.displayName = "CookiePreferencesDialog";