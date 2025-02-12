"use client";

import { useSignIn } from "@clerk/nextjs";
import { FakeDash, OTPInput, Slot } from "@firebuzz/ui/components/ui/input-otp";

import { toast } from "@firebuzz/ui/lib/utils";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

const OTPVerification = ({ email }: { email: string }) => {
  const router = useRouter();
  const { signIn, isLoaded: signInLoaded, setActive } = useSignIn();
  // STATES
  const [isResending, setIsResending] = useState(false);

  // HANDLERS
  const handleVerification = useCallback(
    async (code: string) => {
      if (!signInLoaded || !email || !code) return;

      try {
        toast.loading("Verifying...", { id: "verification" });

        // Use the code provided by the user and attempt verification
        const completeSignIn = await signIn.attemptFirstFactor({
          strategy: "email_code",
          code,
        });

        // This mainly for debuggin while developing.
        if (completeSignIn.status !== "complete") {
          console.log(JSON.stringify(completeSignIn, null, 2));
        }

        // Set Active Session
        await setActive({ session: completeSignIn.createdSessionId });

        toast.success("Successfully signed in.", {
          id: "verification",
          description: "Redirecting...",
          duration: 1000,
        });
        setTimeout(() => {
          router.refresh();
          router.push("/");
        }, 1000);
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      } catch (error: any) {
        console.log(error?.errors);
        toast.error(
          error?.errors?.[0].longMessage ??
            "Something went wrong. Please try again.",
          { id: "verification" }
        );
      }
    },
    [signIn, signInLoaded, setActive, email, router]
  );

  const handleResendCode = async () => {
    // Check if already resending
    if (isResending) return;
    // Check if loaded
    if (!signInLoaded) return;

    try {
      setIsResending(true);
      toast.loading("Resending the code...", {
        id: "resend-code-flow",
      });

      // Start Signin Flow
      const { supportedFirstFactors } = await signIn.create({
        identifier: email,
      });

      // Filter the returned array to find the 'phone_code' entry
      const firstEmailFactor = supportedFirstFactors?.find((factor) => {
        return factor.strategy === "email_code";
      });

      if (!firstEmailFactor) {
        setIsResending(false);
        toast.error("Email code is not supported.", {
          id: "resend-code-flow",
        });
        return;
      }

      const { emailAddressId } = firstEmailFactor;

      // Send the OTP code to the user
      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId,
      });

      setIsResending(false);

      toast.success("Check your email.", {
        description: "We have sent you a code to sign in.",
        id: "resend-code-flow",
      });
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    } catch (error: any) {
      setIsResending(false);
      console.log(error?.errors);
      toast.error(
        error?.errors?.[0].message ?? "Something went wrong. Please try again.",
        { id: "resend-code-flow" }
      );
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-8">
      {/* OTP Input */}
      <OTPInput
        maxLength={6}
        onComplete={handleVerification}
        render={({ slots }) => (
          <div className="flex gap-2">
            <div className="flex">
              {slots.slice(0, 3).map((slot, idx) => (
                <Slot
                  key={`slot-${
                    // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                    idx
                  }-1`}
                  {...slot}
                />
              ))}
            </div>

            <FakeDash />

            <div className="flex">
              {slots.slice(3).map((slot, idx) => (
                <Slot
                  key={`slot-${
                    // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                    idx
                  }-2`}
                  {...slot}
                />
              ))}
            </div>
          </div>
        )}
      />
      <div className="text-sm text-muted-foreground flex items-center gap-1">
        <p>Didn't you recieve the code?</p>{" "}
        <button
          type="button"
          onClick={handleResendCode}
          className="text-foreground underline underline-offset-4 decoration-primary hover:text-foreground/70 hover:decoration-primary/70 duration-200 transition-colors ease-in-out bg-transparent"
        >
          Resend
        </button>
      </div>
    </div>
  );
};

export default OTPVerification;
