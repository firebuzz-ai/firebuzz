"use client";

import { useIsMobile } from "@firebuzz/ui/hooks/use-mobile";
import { DesktopLayout } from "./layouts/desktop";
import { MobileLayout } from "./layouts/mobile";

export const Edit = () => {
  const isMobile = useIsMobile();

  return isMobile ? <MobileLayout /> : <DesktopLayout />;
};
