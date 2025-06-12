"use client";
import { useSignUp } from "@clerk/nextjs";
import type { OAuthStrategy } from "@clerk/types";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { AppleCustomIcon, GoogleIcon } from "@firebuzz/ui/icons/social";
import { toast } from "@firebuzz/ui/lib/utils";
import { useState } from "react";

const OAuthSignUp = () => {
  const { isLoaded, signUp } = useSignUp();

  // STATES
  const [isHandling, setIsHandling] = useState<OAuthStrategy | "email" | null>(
    null
  );

  // HANDLERS
  const handleOauthSignup = async (strategy: OAuthStrategy) => {
    if (isHandling || !isLoaded) return;
    try {
      setIsHandling(strategy);
      await signUp.authenticateWithRedirect({
        strategy,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/new",
      });
    } catch (error) {
      console.log(error);
      setIsHandling(null);
      toast.error(
        (error as Error).message ?? "Something went wrong. Please try again."
      );
    }
  };

  return (
    <div className="flex flex-wrap items-center flex-1 gap-4">
      <Button
        className="flex-1"
        variant="outline"
        onClick={() => {
          handleOauthSignup("oauth_apple");
        }}
      >
        {isHandling === "oauth_apple" ? (
          <div className="flex items-center gap-2">
            <Spinner size="xs" variant="default" /> Redirecting to Apple...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <AppleCustomIcon />
            Sign up with Apple
          </div>
        )}
      </Button>
      <Button
        className="flex-1"
        variant="outline"
        onClick={() => {
          handleOauthSignup("oauth_google");
        }}
      >
        {isHandling === "oauth_google" ? (
          <div className="flex items-center gap-2">
            <Spinner size="xs" variant="default" /> Redirecting to Google...
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <GoogleIcon />
            Sign up with Google
          </div>
        )}
      </Button>

      {/* CAPTCHA Widget */}
      <div id="clerk-captcha" />
    </div>
  );
};

export default OAuthSignUp;
