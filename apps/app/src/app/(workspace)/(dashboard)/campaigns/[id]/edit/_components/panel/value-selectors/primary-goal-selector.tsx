"use client";

import { Button } from "@firebuzz/ui/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@firebuzz/ui/components/ui/command";
import { Label } from "@firebuzz/ui/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@firebuzz/ui/components/ui/popover";
import {
  ArrowUpRight,
  Calendar,
  Check,
  ChevronsUpDown,
  CreditCard,
  Download,
  Eye,
  FileText,
  Focus,
  Goal as GoalIcon,
  Heart,
  type LucideIcon,
  Mail,
  MousePointerClick,
  Percent,
  Phone,
  Share2,
  ShoppingCart,
  TextCursorInput,
  UserPlus,
} from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { useState } from "react";
import {
  useTrackingSetupModal,
  createTrackingSetupState,
} from "@/hooks/ui/use-tracking-setup-modal";

// Map icon names to actual icon components
const iconMap: Record<string, LucideIcon> = {
  "text-cursor-input": TextCursorInput,
  "mouse-pointer-click": MousePointerClick,
  eye: Eye,
  percent: Percent,
  goal: GoalIcon,
  focus: Focus,
  "shopping-cart": ShoppingCart,
  "user-plus": UserPlus,
  download: Download,
  mail: Mail,
  phone: Phone,
  calendar: Calendar,
  "file-text": FileText,
  "credit-card": CreditCard,
  "share-2": Share2,
  heart: Heart,
};

type Goal = {
  id: string;
  title: string;
  icon: string;
  description?: string;
  direction: "up" | "down";
  placement: "internal" | "external";
  value: number;
  currency?: string;
  type: "conversion" | "engagement";
  isCustom: boolean;
};

interface PrimaryGoalSelectorProps {
  selectedGoal?: Goal;
  availableGoals: Goal[];
  onGoalChange: (goal: Goal) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  onNavigateToCampaignOverview?: () => void;
}

export const PrimaryGoalSelector = ({
  selectedGoal,
  availableGoals,
  onGoalChange,
  label = "Primary Goal",
  className,
  disabled = false,
  onNavigateToCampaignOverview,
}: PrimaryGoalSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [, setTrackingSetupState] = useTrackingSetupModal();

  const handleGoalSelect = (goalId: string) => {
    if (disabled) return;
    const goal = availableGoals.find((g) => g.id === goalId);
    if (goal) {
      onGoalChange(goal);
      setOpen(false);
    }
  };

  const handleSetupTracking = () => {
    if (!selectedGoal || !selectedGoal.isCustom) return;
    
    const trackingSetupData = createTrackingSetupState(
      selectedGoal.id,
      selectedGoal.title,
      selectedGoal.placement,
      selectedGoal.value,
      selectedGoal.currency || "USD",
    );
    
    setTrackingSetupState({ trackingSetup: trackingSetupData });
  };

  const getGoalIcon = (goal: Goal) => {
    // If goal has a specific icon property, use it
    if (goal.icon && iconMap[goal.icon]) {
      const Icon = iconMap[goal.icon];
      return <Icon className="size-3.5 text-muted-foreground" />;
    }

    // Default icon if no icon property
    return <GoalIcon className="size-3.5 text-muted-foreground" />;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Goal Selection - Custom Combobox */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>{label}</Label>
          {onNavigateToCampaignOverview && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onNavigateToCampaignOverview}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              Edit Goals
              <ArrowUpRight className="size-3" />
            </Button>
          )}
        </div>
        <Popover open={open && !disabled} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              // biome-ignore lint/a11y/useSemanticElements: <explanation>
              role="combobox"
              aria-expanded={open}
              className="justify-between w-full h-8"
              disabled={disabled}
            >
              {selectedGoal ? (
                <div className="flex gap-2 items-center">
                  {getGoalIcon(selectedGoal)}
                  <span className="truncate">{selectedGoal.title}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">Select a goal</span>
              )}
              <ChevronsUpDown className="ml-2 w-4 h-4 opacity-50 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[--radix-popover-trigger-width] p-0"
            align="start"
          >
            <Command>
              <CommandInput placeholder="Search goals..." className="h-8" />
              <CommandList>
                <CommandEmpty>No goals found.</CommandEmpty>

                {/* Custom Events Group (on top) */}
                {availableGoals.filter((goal) => goal.isCustom).length > 0 && (
                  <CommandGroup heading="Custom Events">
                    {availableGoals
                      .filter((goal) => goal.isCustom)
                      .map((goal, index) => (
                        <CommandItem
                          key={`${goal.id}-${index}-custom`}
                          value={goal.id}
                          onSelect={() => handleGoalSelect(goal.id)}
                          className="flex gap-3 items-center cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "h-4 w-4",
                              selectedGoal?.id === goal.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {getGoalIcon(goal)}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{goal.title}</div>
                            {goal.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {goal.description}
                              </p>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                )}

                {/* Default Events Group */}
                {availableGoals.filter((goal) => !goal.isCustom).length > 0 && (
                  <CommandGroup heading="Default Events">
                    {availableGoals
                      .filter((goal) => !goal.isCustom)
                      .map((goal, index) => (
                        <CommandItem
                          key={`${goal.id}-${index}-default`}
                          value={goal.id}
                          onSelect={() => handleGoalSelect(goal.id)}
                          className="flex gap-3 items-center cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "h-4 w-4",
                              selectedGoal?.id === goal.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {getGoalIcon(goal)}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{goal.title}</div>
                            {goal.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {goal.description}
                              </p>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        {/* Setup Tracking for Custom Goals */}
        {selectedGoal?.isCustom && (
          <div className="mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSetupTracking}
              className="h-7 text-xs text-muted-foreground hover:text-foreground p-0"
            >
              Setup tracking
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
