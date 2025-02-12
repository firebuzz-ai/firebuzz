"use client";

import { Button } from "@firebuzz/ui/components/ui/button";
import { Input } from "@firebuzz/ui/components/ui/input";
import {
  ArrowRightIcon,
  ChevronDown,
  Link,
  UnlockIcon,
} from "@firebuzz/ui/icons/lucide";
import { motion } from "motion/react";
import { useState } from "react";
import { LetterPullUp } from "./letter-animation";

export const OnboardingHome = () => {
  const [url, setUrl] = useState("");

  // Why: Define animation variants for different sections
  const titleVariants = {
    hidden: { opacity: 0, scale: 5 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut",
      },
    },
  };

  const messageVariants = {
    hidden: { opacity: 0, scale: 2 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut",
        delay: 0.4,
      },
    },
  };

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        delay: 1.8,
      },
    },
  };

  const footerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        delay: 2.3,
      },
    },
  };

  return (
    <div className="w-full max-w-md space-y-8 text-center">
      {/* Message Section */}
      <motion.div className="space-y-2">
        <motion.div
          className="text-6xl font-bold text-muted-foreground"
          variants={titleVariants}
          initial="hidden"
          animate="visible"
        >
          <LetterPullUp text="Hi, it's Firebuzz!" />
        </motion.div>
        <motion.div
          className="text-2xl font-semibold"
          variants={messageVariants}
          initial="hidden"
          animate="visible"
        >
          <LetterPullUp
            className="!text-2xl font-semibold"
            text="Let's get you onboarded"
          />
        </motion.div>
      </motion.div>

      {/* Form Section */}
      <motion.div
        className="space-y-4"
        variants={formVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="w-full relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pr-3 pointer-events-none bg-accent/50 border-r border-r-border rounded-l-md">
            <Link className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <Input
            type="url"
            placeholder="Enter your website URL"
            className="pl-12"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <Button className="w-full">
          Start Onboarding <UnlockIcon className="w-3 h-3" />
        </Button>
        <p className="text-sm text-muted-foreground">
          We'll analyze your website and provide personalized recommendations.
        </p>
      </motion.div>

      {/* Footer Section */}
      <motion.div
        className="flex items-center gap-4 w-full justify-between"
        variants={footerVariants}
        initial="hidden"
        animate="visible"
      >
        <Button
          variant="outline"
          className="gap-2 flex items-center h-8 flex-1"
        >
          Join a Team <ArrowRightIcon className="w-3 h-3" />
        </Button>
        <Button
          variant="outline"
          className="gap-2 flex items-center h-8 flex-1"
        >
          Change Workspace <ChevronDown className="w-3 h-3" />
        </Button>
      </motion.div>
    </div>
  );
};
