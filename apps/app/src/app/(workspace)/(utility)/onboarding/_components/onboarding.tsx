"use client";

import { api, useCachedRichQuery } from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { sleep } from "@firebuzz/utils";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatedBackground } from "../../new/_components/animated-background";
import { OnboardingFlowPreview } from "./flow-preview";
import { Indicators } from "./indicators";
import { Step1 } from "./step-1";
import { Step2 } from "./step-2";
import { Step3 } from "./step-3";
import { Step4 } from "./step-4";
import { Step5 } from "./step-5";

export const Onboarding = () => {
  const router = useRouter();
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const animatedBackgroundRef = useRef<{
    startReveal: () => void;
    startFadeout: () => void;
  }>(null);

  const { data: onboarding, isPending: isOnboardingLoading } =
    useCachedRichQuery(
      api.collections.onboarding.queries.getCurrentWorkspaceOnboarding
    );

  const onboardingStep = useMemo(() => {
    if (!isOnboardingLoading && onboarding?.step) return onboarding.step;
    return 1;
  }, [isOnboardingLoading, onboarding?.step]);

  const animationStep = useMemo(() => {
    if (!isOnboardingLoading && onboarding?.animationStep)
      return onboarding.animationStep;
    return 1;
  }, [isOnboardingLoading, onboarding?.animationStep]);

  // Handle onboarding completion
  useEffect(() => {
    if (onboarding?.isCompleted) {
      // Start the animated background reveal
      setTimeout(() => {
        animatedBackgroundRef.current?.startReveal();
      }, 100);

      // Start countdown after background animation starts
      setTimeout(() => {
        const countdownInterval = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              // Start fadeout and redirect
              setTimeout(async () => {
                animatedBackgroundRef.current?.startFadeout();
                setIsFadingOut(true);
                await sleep(1000);
                router.push("/");
              }, 500);
              return 0;
            }
            return prev - 1;
          });
        }, 1000); // Count down every second
      }, 1500); // Start countdown 1.5s after background starts
    }
  }, [onboarding?.isCompleted, router]);

  // Loading state
  if (isOnboardingLoading && !onboarding) {
    return (
      <div className="flex items-center justify-center flex-1">
        <Spinner size="sm" />
      </div>
    );
  }

  // Show completion animation
  if (onboarding?.isCompleted) {
    return (
      <div className="relative flex flex-col items-center justify-center flex-1 overflow-hidden">
        <AnimatedBackground ref={animatedBackgroundRef} />

        <AnimatePresence>
          {!isFadingOut && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
                transition: {
                  duration: 0.8,
                  ease: [0.16, 1, 0.3, 1],
                  delay: 1.2, // Wait for background animation to start
                },
              }}
              exit={{
                opacity: 0,
                scale: 0.8,
                y: 50,
                transition: { duration: 0.1, ease: "easeInOut" },
              }}
              className="relative z-10 max-w-2xl px-8 space-y-6 text-center"
            >
              {/* Countdown */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { delay: 1.8, duration: 0.6 },
                }}
                className="flex flex-col items-center space-y-4"
              >
                {countdown > 0 && (
                  <motion.div
                    key={countdown}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{
                      scale: 1,
                      opacity: 1,
                      transition: {
                        type: "spring",
                        stiffness: 200,
                        damping: 10,
                      },
                    }}
                    exit={{
                      scale: 1.5,
                      opacity: 0,
                      transition: { duration: 0.3 },
                    }}
                    className="text-8xl md:text-9xl font-bold bg-gradient-to-r from-[#f97f27] via-[#ff6b00] to-[#f97f27] bg-clip-text text-transparent"
                  >
                    {countdown}
                  </motion.div>
                )}

                <motion.p
                  className="text-lg font-medium text-muted-foreground"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: { delay: 2.2, duration: 0.5 },
                  }}
                >
                  Ready to buzzz!
                </motion.p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Show regular onboarding flow
  return (
    <div className="flex flex-col items-center justify-center flex-1 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key="onboarding-container"
          initial={{ opacity: 0, y: 100 }}
          exit={{
            opacity: 0,
            transition: { duration: 0.1, ease: "easeInOut" },
          }}
          animate={{
            opacity: 1,
            y: 0,
            transition: { duration: 0.3, ease: "easeInOut" },
          }}
          className="grid w-full h-full relative max-w-5xl grid-cols-2 border rounded-lg max-h-[60vh] shadow-sm overflow-hidden"
        >
          <div className="flex flex-col items-start justify-center gap-8 py-8 overflow-hidden">
            {/* Indicators */}
            <Indicators step={onboardingStep} />

            {/* Steps */}
            <div className="flex flex-col flex-1 w-full h-full">
              {onboardingStep === 1 && onboarding?._id && (
                <Step1 onboardingData={onboarding} />
              )}
              {onboardingStep === 2 && onboarding?._id && (
                <Step2 onboardingData={onboarding} />
              )}
              {onboardingStep === 3 && onboarding?._id && (
                <Step3 onboardingData={onboarding} />
              )}
              {onboardingStep === 4 && onboarding?._id && (
                <Step4 onboardingData={onboarding} />
              )}
              {onboardingStep === 5 && onboarding?._id && (
                <Step5 onboardingData={onboarding} />
              )}
            </div>
          </div>

          {/* Right Side - Campaign Preview */}
          <div className="relative max-h-full overflow-hidden border-l bg-muted">
            <OnboardingFlowPreview step={animationStep} />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
