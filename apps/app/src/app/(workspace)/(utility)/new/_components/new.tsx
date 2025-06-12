"use client";

import { cn } from "@firebuzz/ui/lib/utils";
import React, { useRef } from "react";
import { AnimatedBackground } from "./animated-background";
import { Selection } from "./selection";

interface NewUserFlowProps {
  className?: string;
}

export const NewUserFlow = ({ className }: NewUserFlowProps) => {
  const animatedBackgroundRef = useRef<{
    startReveal: () => void;
    startFadeout: () => void;
  }>(null);

  const handleFadeout = () => {
    animatedBackgroundRef.current?.startFadeout();
  };

  // Start reveal animation on mount
  React.useEffect(() => {
    animatedBackgroundRef.current?.startReveal();
  }, []);

  return (
    <div
      className={cn("flex w-[100%] flex-col min-h-screen relative", className)}
    >
      <AnimatedBackground ref={animatedBackgroundRef} />
      <Selection handleFadeout={handleFadeout} />
    </div>
  );
};
