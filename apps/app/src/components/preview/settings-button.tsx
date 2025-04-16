"use client";

import { useSettingsSheet } from "@/hooks/ui/use-settings-sheet";
import type { Id } from "@firebuzz/convex/nextjs";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Settings } from "@firebuzz/ui/icons/lucide";

interface SettingsButtonProps {
  landingPageId: Id<"landingPages">;
}

export const SettingsButton = (_props: SettingsButtonProps) => {
  const { setIsOpen } = useSettingsSheet();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="!size-8"
          onClick={() => setIsOpen(true)}
        >
          <Settings className="!size-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Settings</TooltipContent>
    </Tooltip>
  );
};
