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
  { id: "powerful-agent", label: "Powerful Agent" },
  { id: "themes", label: "Themes" },
  { id: "images-files", label: "Images & Files" },
  { id: "instant-publish", label: "Instant Publish" },
];

export const FeaturedTabsEditor = () => {
  const [activeTab, setActiveTab] = React.useState("powerful-agent");
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
      case "powerful-agent":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2">
            <div className="flex flex-col gap-6 justify-center p-6">
              <div className="space-y-1">
                <h3 className="text-xl font-semibold">Let AI do the work</h3>
                <p className="text-muted-foreground">
                  You will be able to create fully customized landing pages with
                  our AI-Agent that knows your business.
                </p>
              </div>
              <div className="lg:flex grid grid-cols-2 overflow-hidden border rounded-md *:px-2 *:py-1 text-xs bg-muted  lg:*:border-r last:*:border-r-0 *:flex-1 *:flex *:items-center *:gap-1 *:text-nowrap text-muted-foreground">
                <div>
                  <CheckCheck className="truncate size-3 text-brand shrink-0" />{" "}
                  Full Customization
                </div>
                <div>
                  <CheckCheck className="size-3 text-brand shrink-0" />{" "}
                  Knowledgebase
                </div>
                <div>
                  <CheckCheck className="size-3 text-brand shrink-0" /> Search
                  Web
                </div>
                <div>
                  <CheckCheck className="size-3 text-brand shrink-0" /> Run Code
                </div>
              </div>
            </div>
            <div className="relative space-y-2 h-full border-t sm:border-t-0 sm:border-l bg-muted">
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b to-muted/40 from-muted via-muted/70" />
              <Image
                src="/landing/agent-4.svg"
                unoptimized
                alt="Firebuzz"
                width={530}
                height={340}
              />
            </div>
          </div>
        );
      case "themes":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2">
            <div className="flex flex-col gap-6 justify-center p-6">
              <div className="space-y-1">
                <h3 className="text-xl font-semibold">Your Brand, Your Way</h3>
                <p className="text-muted-foreground">
                  Choose from our collection of themes and customize them based
                  on your brand characteristics.
                </p>
              </div>
              <div className="lg:flex grid grid-cols-2 overflow-hidden border rounded-md *:px-2 *:py-1 text-xs bg-muted  lg:*:border-r last:*:border-r-0 *:flex-1 *:flex *:items-center *:gap-1 *:text-nowrap text-muted-foreground">
                <div>
                  <CheckCheck className="truncate size-3 text-brand shrink-0" />{" "}
                  Color Palette
                </div>
                <div>
                  <CheckCheck className="size-3 text-brand shrink-0" /> Fonts
                </div>
                <div>
                  <CheckCheck className="size-3 text-brand shrink-0" /> Light &
                  Dark
                </div>
                <div>
                  <CheckCheck className="size-3 text-brand shrink-0" /> Assets
                </div>
              </div>
            </div>
            <div className="relative space-y-2 h-full border-t sm:border-t-0 sm:border-l bg-muted">
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b to-muted/40 from-muted via-muted/70" />
              <Image
                src="/landing/theme-2.svg"
                unoptimized
                alt="Firebuzz"
                width={530}
                height={340}
              />
            </div>
          </div>
        );
      case "images-files":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2">
            <div className="flex flex-col gap-6 justify-center p-6">
              <div className="space-y-1">
                <h3 className="text-xl font-semibold">Images? Handled.</h3>
                <p className="text-muted-foreground">
                  Firebuzz gives you very powerfull asset management system. Use
                  storage to store images, files and everything else.
                </p>
              </div>
              <div className="lg:flex grid grid-cols-2 overflow-hidden border rounded-md *:px-2 *:py-1 text-xs bg-muted  lg:*:border-r last:*:border-r-0 *:flex-1 *:flex *:items-center *:gap-1 *:text-nowrap text-muted-foreground">
                <div>
                  <CheckCheck className="truncate size-3 text-brand shrink-0" />{" "}
                  AI Generation
                </div>
                <div>
                  <CheckCheck className="size-3 text-brand shrink-0" /> Stock
                  Images
                </div>
                <div>
                  <CheckCheck className="size-3 text-brand shrink-0" /> Search
                  File Storage
                </div>
                <div>
                  <CheckCheck className="size-3 text-brand shrink-0" /> Auto
                  Optimize
                </div>
              </div>
            </div>
            <div className="relative space-y-2 h-full border-t sm:border-t-0 sm:border-l bg-muted">
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b to-muted/40 from-muted via-muted/70" />
              <Image
                src="/landing/image-gen-3.svg"
                unoptimized
                alt="Firebuzz"
                width={530}
                height={340}
              />
            </div>
          </div>
        );
      case "instant-publish":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2">
            <div className="flex flex-col gap-6 justify-center p-6">
              <div className="space-y-1">
                <h3 className="text-xl font-semibold">
                  Publish in seconds (10s)
                </h3>
                <p className="text-muted-foreground">
                  Our hosting infrastructure is built to be fast and scalable.
                  Publish your landing page in seconds.
                </p>
              </div>
              <div className="lg:flex grid grid-cols-2 overflow-hidden border rounded-md *:px-2 *:py-1 text-xs bg-muted  lg:*:border-r last:*:border-r-0 *:flex-1 *:flex *:items-center *:gap-1 *:text-nowrap text-muted-foreground">
                <div>
                  <CheckCheck className="truncate size-3 text-brand shrink-0" />{" "}
                  Global CDN
                </div>
                <div>
                  <CheckCheck className="size-3 text-brand shrink-0" /> High
                  Traffic
                </div>
                <div>
                  <CheckCheck className="size-3 text-brand shrink-0" /> Fast
                  Load
                </div>
                <div>
                  <CheckCheck className="size-3 text-brand shrink-0" /> SSL
                  Secured
                </div>
              </div>
            </div>
            <div className="relative space-y-2 h-full border-t sm:border-t-0 sm:border-l bg-muted">
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b to-muted/40 from-muted via-muted/70" />
              <Image
                src="/landing/publish-2.svg"
                unoptimized
                alt="Firebuzz"
                width={530}
                height={340}
              />
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
            className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory touch-pan-x w-full"
            style={{
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              msOverflowStyle: "none"
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
                    "relative z-10 flex-shrink-0 px-4 sm:px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors hover:text-foreground snap-start min-w-fit",
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
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{
            duration: 0.3,
            ease: "easeInOut",
          }}
        >
          {getTabContent(activeTab)}
        </motion.div>
      </AnimatePresence>

      {/* Footer */}
      <div className="border-t bg-muted">
        <div className="flex items-stretch h-full">
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
