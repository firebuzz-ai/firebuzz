"use client";
import { useSignIn } from "@clerk/nextjs";
import type { OAuthStrategy } from "@clerk/types";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { AppleCustomIcon, GoogleIcon } from "@firebuzz/ui/icons/social";
import { toast } from "@firebuzz/ui/lib/utils";

import { useState } from "react";

const OAuthSignIn = () => {
  const { isLoaded, signIn } = useSignIn();

  // STATES
  const [isHandling, setIsHandling] = useState<OAuthStrategy | "email" | null>(
    null
  );
  // HANDLERS
  const handleOauthSignin = async (strategy: OAuthStrategy) => {
    if (isHandling || !isLoaded) return;
    try {
      setIsHandling(strategy);
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (error) {
      console.log(error);
      setIsHandling(null);
      toast.error(
        (error as Error)?.message ?? "Something went wrong. Please try again."
      );
    }
  };

  return (
    <div className="flex flex-wrap flex-1 gap-4 items-center">
      <Button
        className="flex-1"
        variant="outline"
        onClick={() => {
          handleOauthSignin("oauth_apple");
        }}
      >
        {isHandling === "oauth_apple" ? (
          <div className="flex gap-2 items-center">
            <Spinner size="xs" variant="default" /> Redirecting to Apple...
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <AppleCustomIcon />
            Sign in with Apple
          </div>
        )}
      </Button>
      <Button
        className="flex-1"
        variant="outline"
        onClick={() => {
          handleOauthSignin("oauth_google");
        }}
      >
        {isHandling === "oauth_google" ? (
          <div className="flex gap-2 items-center">
            <Spinner size="xs" variant="default" /> Redirecting to Google...
          </div>
        ) : (
          <div className="flex gap-2 justify-center items-center">
            <GoogleIcon />
            Sign in with Google
          </div>
        )}
      </Button>
    </div>
  );
};

export default OAuthSignIn;
