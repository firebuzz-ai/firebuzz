"use client";

import { useConsent } from "@firebuzz/consent-manager";
import { cva, type VariantProps } from "class-variance-authority";
import { Cookie, Settings } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { useCampaignEnv } from "@/hooks/use-campaign-env";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { CookiePreferencesDialog } from "./cookie-preferences-dialog";

const cookiePreferencesButtonVariants = cva("transition-all duration-200", {
  variants: {
    variant: {
      floating: "shadow-lg hover:shadow-xl z-40",
      inline: "",
    },
    position: {
      "bottom-left": "fixed bottom-4 left-4",
      "bottom-right": "fixed bottom-4 right-4",
      "top-left": "fixed top-4 left-4",
      "top-right": "fixed top-4 right-4",
    },
    size: {
      sm: "",
      md: "",
      lg: "",
    },
  },
  compoundVariants: [
    {
      variant: "floating",
      size: "sm",
      className: "h-10 w-10 rounded-full p-0",
    },
    {
      variant: "floating",
      size: "md",
      className: "h-12 w-12 rounded-full p-0",
    },
    {
      variant: "floating",
      size: "lg",
      className: "h-14 w-14 rounded-full p-0",
    },
    {
      variant: "inline",
      size: "sm",
      className: "h-8 px-3 text-xs",
    },
    {
      variant: "inline",
      size: "md",
      className: "h-10 px-4 py-2",
    },
    {
      variant: "inline",
      size: "lg",
      className: "h-11 px-8 py-2",
    },
  ],
  defaultVariants: {
    variant: "floating",
    position: "bottom-left",
    size: "md",
  },
});

interface CookiePreferencesButtonProps
  extends VariantProps<typeof cookiePreferencesButtonVariants> {
  className?: string;
  privacyPolicyUrl?: string;
  showLabel?: boolean;
}

/**
 * Cookie Preferences Button - allows users to revisit and change their cookie preferences
 *
 * @example
 * // Floating button (default)
 * <CookiePreferencesButton />
 *
 * @example
 * // Floating button in different position
 * <CookiePreferencesButton position="top-right" size="lg" />
 *
 * @example
 * // Inline button with label
 * <CookiePreferencesButton
 *   variant="inline"
 *   showLabel
 *   privacyPolicyUrl="/privacy"
 * />
 */
export const CookiePreferencesButton: React.FC<
  CookiePreferencesButtonProps
> = ({
  variant = "floating",
  position = "bottom-left",
  size = "md",
  className,
  privacyPolicyUrl,
  showLabel = false,
}) => {
  // All hooks must be called before any early returns
  const campaignEnv = useCampaignEnv();
  const { consentState, isConsentRequired } = useConsent();
  const [open, setOpen] = React.useState(false);

  // Conditional rendering logic based on environment and consent requirements
  const shouldShowButton = React.useMemo(() => {
    // Only show button if user has interacted with cookies
    if (!consentState?.hasUserInteracted) {
      return false;
    }

    // In dev environment (template mode): always show button for demonstration
    if (campaignEnv === "dev") {
      return true;
    }

    // In preview/production: only show if consent is actually required
    return isConsentRequired;
  }, [consentState?.hasUserInteracted, campaignEnv, isConsentRequired]);

  // Don't render if button shouldn't be shown
  if (!shouldShowButton) {
    return null;
  }

  const isFloating = variant === "floating";
  const IconComponent = isFloating ? Cookie : Settings;

  const buttonContent = (
    <>
      <IconComponent
        className={cn(
          "transition-transform duration-200 hover:scale-110",
          isFloating ? "w-5 h-5" : "w-4 h-4",
          !isFloating && showLabel && "mr-2"
        )}
      />
      {!isFloating && showLabel && (
        <span className="font-medium">Cookie Settings</span>
      )}
    </>
  );

  const button = (
    <Button
      onClick={() => setOpen(true)}
      variant={isFloating ? "default" : "outline"}
      className={cn(
        cookiePreferencesButtonVariants({
          variant,
          position: isFloating ? position : undefined,
          size,
        }),
        className
      )}
      aria-label="Cookie Settings"
    >
      {buttonContent}
    </Button>
  );

  return (
    <>
      {isFloating ? (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent
            side={position?.includes("top") ? "bottom" : "top"}
            align={position?.includes("left") ? "start" : "end"}
          >
            <p>Cookie Settings</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        button
      )}

      <CookiePreferencesDialog
        open={open}
        onOpenChange={setOpen}
        privacyPolicyUrl={privacyPolicyUrl}
      />
    </>
  );
};

CookiePreferencesButton.displayName = "CookiePreferencesButton";
