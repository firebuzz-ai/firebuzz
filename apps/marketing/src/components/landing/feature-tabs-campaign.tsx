"use client";

import { Button } from "@firebuzz/ui/components/ui/button";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import { useIsMobile } from "@firebuzz/ui/hooks/use-mobile";
import { BookOpen, CheckCheck, Video } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import * as React from "react";

const tabs = [
  { id: "ab-testing", label: "A/B Testing" },
  { id: "segmentation", label: "Segmentation" },
  { id: "localization", label: "Localization" },
  { id: "built-in-analytics", label: "Built-in Analytics" },
];

export const FeaturedTabsCampaign = () => {
  const [activeTab, setActiveTab] = React.useState("ab-testing");
  const isMobile = useIsMobile();
  const [isAutoPlaying, setIsAutoPlaying] = React.useState(true);
  const tabsContainerRef = React.useRef<HTMLDivElement | null>(null);
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const autoPlayIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const [indicatorStyle, setIndicatorStyle] =
    React.useState<React.CSSProperties>({
      width: 0,
      left: 0,
      opacity: 0,
    });

  const updateIndicatorPosition = React.useCallback(() => {
    const activeTabIndex = tabs.findIndex((tab) => tab.id === activeTab);

    if (
      activeTabIndex >= 0 &&
      tabRefs.current[activeTabIndex] &&
      tabsContainerRef.current
    ) {
      const activeTabElement = tabRefs.current[activeTabIndex];
      const containerRect = tabsContainerRef.current.getBoundingClientRect();
      const tabRect = activeTabElement.getBoundingClientRect();

      if (tabRect.width > 0 && containerRect.width > 0) {
        setIndicatorStyle({
          width: tabRect.width,
          left: tabRect.left - containerRect.left,
          opacity: 1,
          transform: "translateX(0)",
        });
      }
    }
  }, [activeTab]);

  const scrollToActiveTab = React.useCallback(() => {
    const activeTabIndex = tabs.findIndex((tab) => tab.id === activeTab);
    if (
      activeTabIndex >= 0 &&
      tabRefs.current[activeTabIndex] &&
      scrollContainerRef.current
    ) {
      const activeTabElement = tabRefs.current[activeTabIndex];
      const scrollContainer = scrollContainerRef.current;
      const containerRect = scrollContainer.getBoundingClientRect();
      const tabRect = activeTabElement.getBoundingClientRect();

      // Calculate the scroll position to center the active tab
      const scrollLeft =
        activeTabElement.offsetLeft -
        containerRect.width / 2 +
        tabRect.width / 2;

      scrollContainer.scrollTo({
        left: scrollLeft,
        behavior: isMobile ? "auto" : "smooth",
      });
    }
  }, [activeTab, isMobile]);

  const setTabRef = (index: number) => (el: HTMLButtonElement | null) => {
    tabRefs.current[index] = el;
    if (el && tabsContainerRef.current) {
      requestAnimationFrame(() => {
        updateIndicatorPosition();
        if (!isMobile) {
          scrollToActiveTab();
        }
      });
    }
  };

  const goToNextTab = React.useCallback(() => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    const nextIndex = (currentIndex + 1) % tabs.length;
    setActiveTab(tabs[nextIndex].id);
  }, [activeTab]);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds of inactivity
    if (autoPlayIntervalRef.current) {
      clearTimeout(autoPlayIntervalRef.current);
    }
    autoPlayIntervalRef.current = setTimeout(() => {
      setIsAutoPlaying(true);
    }, 10000);
  };

  React.useLayoutEffect(() => {
    updateIndicatorPosition();
    if (!isMobile) {
      scrollToActiveTab();
    }
  }, [updateIndicatorPosition, scrollToActiveTab, isMobile]);

  React.useEffect(() => {
    if (tabsContainerRef.current && tabRefs.current.length > 0) {
      updateIndicatorPosition();
      if (!isMobile) {
        scrollToActiveTab();
      }
    }
  }, [updateIndicatorPosition, scrollToActiveTab, isMobile]);

  React.useEffect(() => {
    const handleResize = () => {
      updateIndicatorPosition();
      if (!isMobile) {
        scrollToActiveTab();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateIndicatorPosition, scrollToActiveTab, isMobile]);

  // Auto-play interval effect - disabled on mobile
  React.useEffect(() => {
    if (!isAutoPlaying || isMobile) return;

    const interval = setInterval(() => {
      goToNextTab();
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, isMobile, goToNextTab]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (autoPlayIntervalRef.current) {
        clearTimeout(autoPlayIntervalRef.current);
      }
    };
  }, []);

  const getTabContent = (tabId: string) => {
    switch (tabId) {
      case "ab-testing":
        return (
          <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
            <div className="flex relative flex-col justify-center h-full">
              {/* Subtle Grid Pattern BG */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                    linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
                  `,
                  backgroundSize: "30px 30px",
                }}
              />
              <div className="absolute inset-0 z-[1] bg-gradient-to-bl to-background/40 from-background via-background/70" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeTab}-content`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex relative z-10 flex-col gap-6 justify-center p-6"
                >
                  <div className="relative z-10 space-y-1">
                    <h3 className="text-xl font-semibold">
                      Lightning Fast A/B Testing
                    </h3>
                    <p className="text-muted-foreground">
                      With Firebuzz, you can run A/B tests on server so no
                      flashy effects, just fast results.
                    </p>
                  </div>
                  <div className="lg:flex grid grid-cols-2 overflow-hidden border rounded-md *:px-2 *:py-1 text-xs bg-muted *:flex-1 *:flex *:items-center *:gap-1 *:text-nowrap text-muted-foreground relative z-10">
                    <div className="border-r border-b lg:border-b-0">
                      <CheckCheck className="truncate size-3 text-brand shrink-0" />{" "}
                      Server Side
                    </div>
                    <div className="border-b lg:border-r lg:border-b-0">
                      <CheckCheck className="size-3 text-brand shrink-0" />{" "}
                      Multiple Variants
                    </div>
                    <div className="border-r">
                      <CheckCheck className="size-3 text-brand shrink-0" />{" "}
                      Traffic Control
                    </div>
                    <div>
                      <CheckCheck className="size-3 text-brand shrink-0" />
                      Realtime Results
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="relative h-full border-t sm:border-t-0 sm:border-l bg-muted">
              {/* Overlay */}
              <div
                className="absolute inset-0 z-10"
                style={{
                  background:
                    "radial-gradient(circle at center, transparent 8%, hsl(var(--muted) / 0.3) 35%, hsl(var(--muted) / 0.8) 100%)",
                }}
              />
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeTab}-image`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="relative z-0"
                  style={{
                    willChange: "transform, opacity",
                    backfaceVisibility: "hidden",
                    transform: "translateZ(0)",
                  }}
                >
                  <Image
                    src="/landing/ab-test.svg"
                    unoptimized
                    alt="Firebuzz"
                    width={530}
                    height={340}
                    className="p-0 w-full h-full"
                    style={{
                      imageRendering: "crisp-edges",
                      shapeRendering: "crispEdges",
                    }}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        );
      case "segmentation":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2">
            <div className="flex relative flex-col justify-center h-full">
              {/* Subtle Grid Pattern BG */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                    linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
                  `,
                  backgroundSize: "30px 30px",
                }}
              />
              <div className="absolute inset-0 z-[1] bg-gradient-to-bl to-background/40 from-background via-background/70" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeTab}-content`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex relative z-10 flex-col gap-6 justify-center p-6"
                >
                  <div className="relative z-10 space-y-1">
                    <h3 className="text-xl font-semibold">
                      Segment Your Audience
                    </h3>
                    <p className="text-muted-foreground">
                      Firebuzz campaigns let you segment your audience and show
                      different landing page to each segment.
                    </p>
                  </div>
                  <div className="lg:flex grid grid-cols-2 overflow-hidden border rounded-md *:px-2 *:py-1 text-xs bg-muted *:flex-1 *:flex *:items-center *:gap-1 *:text-nowrap text-muted-foreground relative z-10">
                    <div className="border-r border-b lg:border-b-0">
                      <CheckCheck className="truncate size-3 text-brand shrink-0" />{" "}
                      Geography
                    </div>
                    <div className="border-b lg:border-r lg:border-b-0">
                      <CheckCheck className="size-3 text-brand shrink-0" />{" "}
                      Behavior
                    </div>
                    <div className="border-r">
                      <CheckCheck className="size-3 text-brand shrink-0" />{" "}
                      Device
                    </div>
                    <div>
                      <CheckCheck className="size-3 text-brand shrink-0" /> +100
                      variants
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="relative h-full border-t sm:border-t-0 sm:border-l bg-muted">
              {/* Overlay */}
              <div
                className="absolute inset-0 z-10"
                style={{
                  background:
                    "radial-gradient(circle at center, transparent 8%, hsl(var(--muted) / 0.3) 35%, hsl(var(--muted) / 0.8) 100%)",
                }}
              />
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeTab}-image`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="relative z-0"
                  style={{
                    willChange: "transform, opacity",
                    backfaceVisibility: "hidden",
                    transform: "translateZ(0)",
                  }}
                >
                  <Image
                    src="/landing/segment.svg"
                    unoptimized
                    alt="Firebuzz"
                    width={530}
                    height={340}
                    className="p-0 w-full h-full"
                    style={{
                      imageRendering: "crisp-edges",
                      shapeRendering: "crispEdges",
                    }}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        );
      case "localization":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2">
            <div className="flex relative flex-col justify-center h-full">
              {/* Subtle Grid Pattern BG */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                    linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
                  `,
                  backgroundSize: "30px 30px",
                }}
              />
              <div className="absolute inset-0 z-[1] bg-gradient-to-bl to-background/40 from-background via-background/70" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeTab}-content`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex relative z-10 flex-col gap-6 justify-center p-6"
                >
                  <div className="relative z-10 space-y-1">
                    <h3 className="text-xl font-semibold">
                      Localization? Easy.
                    </h3>
                    <p className="text-muted-foreground">
                      Running multi-language campaigns has never been easier.
                      Firebuz handles all the heavy lifting for you.
                    </p>
                  </div>
                  <div className="lg:flex grid grid-cols-2 overflow-hidden border rounded-md *:px-2 *:py-1 text-xs bg-muted *:flex-1 *:flex *:items-center *:gap-1 *:text-nowrap text-muted-foreground relative z-10">
                    <div className="border-r border-b lg:border-b-0">
                      <CheckCheck className="truncate size-3 text-brand shrink-0" />{" "}
                      Auto Detection
                    </div>
                    <div className="border-b lg:border-r lg:border-b-0">
                      <CheckCheck className="size-3 text-brand shrink-0" /> All
                      Languages
                    </div>
                    <div className="border-r">
                      <CheckCheck className="size-3 text-brand shrink-0" /> AI
                      Translations
                    </div>
                    <div>
                      <CheckCheck className="size-3 text-brand shrink-0" /> Full
                      Design Control
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="relative h-full border-t sm:border-t-0 sm:border-l bg-muted">
              {/* Overlay */}
              <div
                className="absolute inset-0 z-10"
                style={{
                  background:
                    "radial-gradient(circle at center, transparent 8%, hsl(var(--muted) / 0.3) 35%, hsl(var(--muted) / 0.8) 100%)",
                }}
              />
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeTab}-image`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="relative z-0"
                  style={{
                    willChange: "transform, opacity",
                    backfaceVisibility: "hidden",
                    transform: "translateZ(0)",
                  }}
                >
                  <Image
                    src="/landing/localization.svg"
                    unoptimized
                    alt="Firebuzz"
                    width={530}
                    height={340}
                    className="p-0 w-full h-full"
                    style={{
                      imageRendering: "crisp-edges",
                      shapeRendering: "crispEdges",
                    }}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        );
      case "built-in-analytics":
        return (
          <div className="grid overflow-hidden grid-cols-1 sm:grid-cols-2">
            <div className="flex relative flex-col justify-center h-full">
              {/* Subtle Grid Pattern BG */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                    linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
                  `,
                  backgroundSize: "30px 30px",
                }}
              />
              <div className="absolute inset-0 z-[1] bg-gradient-to-bl to-background/40 from-background via-background/70" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeTab}-content`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex relative z-10 flex-col gap-6 justify-center p-6"
                >
                  <div className="relative z-10 space-y-1">
                    <h3 className="text-xl font-semibold">
                      No more switching between tools
                    </h3>
                    <p className="text-muted-foreground">
                      Firebuzz gives you a complete solution for your campaign
                      management with built-in analytics and tracking.
                    </p>
                  </div>
                  <div className="lg:flex grid grid-cols-2 overflow-hidden border rounded-md *:px-2 *:py-1 text-xs bg-muted *:flex-1 *:flex *:items-center *:gap-1 *:text-nowrap text-muted-foreground relative z-10">
                    <div className="border-r border-b lg:border-b-0">
                      <CheckCheck className="truncate size-3 text-brand shrink-0" />
                      Realtime
                    </div>
                    <div className="border-b lg:border-r lg:border-b-0">
                      <CheckCheck className="size-3 text-brand shrink-0" />
                      External Tracking
                    </div>
                    <div className="border-r">
                      <CheckCheck className="size-3 text-brand shrink-0" />
                      GDPR Compliant
                    </div>
                    <div>
                      <CheckCheck className="size-3 text-brand shrink-0" />
                      Integrated
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="relative h-full border-t sm:border-t-0 sm:border-l bg-muted">
              {/* Overlay */}
              <div
                className="absolute inset-0 z-10"
                style={{
                  background:
                    "radial-gradient(circle at center, transparent 8%, hsl(var(--muted) / 0.3) 35%, hsl(var(--muted) / 0.8) 100%)",
                }}
              />
              <div className="absolute inset-y-0 right-0 z-10 w-40 bg-gradient-to-l to-transparent from-muted via-muted/70" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeTab}-image`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="relative z-0"
                  style={{
                    willChange: "transform, opacity",
                    backfaceVisibility: "hidden",
                    transform: "translateZ(0)",
                  }}
                >
                  <Image
                    src="/landing/analytics.svg"
                    unoptimized
                    alt="Firebuzz"
                    width={530}
                    height={340}
                    className="p-0 w-full h-full"
                    style={{
                      imageRendering: "crisp-edges",
                      shapeRendering: "crispEdges",
                    }}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="overflow-hidden mt-10 w-full rounded-lg border bg-card">
      {/* Tabs Header */}
      <div className="border-b bg-muted">
        <div className="relative w-full" ref={tabsContainerRef}>
          <div
            ref={scrollContainerRef}
            className="flex overflow-x-auto w-full scrollbar-hide snap-x snap-mandatory touch-pan-x"
            style={{
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {tabs.map((tab, index) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={setTabRef(index)}
                  onClick={() => handleTabClick(tab.id)}
                  className={cn(
                    "relative z-10 flex-shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors sm:px-6 hover:text-foreground snap-start min-w-fit",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                  type="button"
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          {/* Active tab indicator */}
          <div
            className="absolute bottom-0 h-px transition-all duration-300"
            style={indicatorStyle}
          >
            {/* Main indicator line */}
            <div className="w-full h-full bg-gradient-to-r from-transparent to-transparent via-brand" />
            {/* Glowing light effect - strong in center, fades to edges */}
            <div className="absolute inset-x-0 -inset-y-1 bg-gradient-to-r from-transparent to-transparent opacity-20 blur-sm via-brand" />
            <div className="absolute inset-x-0 -inset-y-2 bg-gradient-to-r from-transparent to-transparent opacity-10 blur-md via-brand" />
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="overflow-hidden max-w-full max-h-full">
        {getTabContent(activeTab)}
      </div>

      {/* Footer */}
      <div className="border-t bg-muted">
        <div className="flex justify-between w-full h-full sm:justify-start">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 h-10 text-xs truncate rounded-none sm:gap-2 text-muted-foreground"
          >
            <BookOpen className="size-3 sm:size-3.5" />
            Read Help Center
          </Button>
          <Separator orientation="vertical" className="h-10" />
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 h-10 text-xs truncate rounded-none sm:gap-2 text-muted-foreground"
          >
            <Video className="size-3 sm:size-3.5" />
            Watch Tutorial
          </Button>
        </div>
      </div>
    </div>
  );
};
