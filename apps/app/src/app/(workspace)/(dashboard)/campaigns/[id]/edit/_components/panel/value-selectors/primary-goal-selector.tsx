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
  Check,
  ChevronsUpDown,
  Focus,
  Goal as GoalIcon,
  MousePointerClick,
} from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { useState } from "react";

type Goal = {
  id: string;
  title: string;
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

  const handleGoalSelect = (goalId: string) => {
    if (disabled) return;
    const goal = availableGoals.find((g) => g.id === goalId);
    if (goal) {
      onGoalChange(goal);
      setOpen(false);
    }
  };

  const getGoalTypeIcon = (type: string, isCustom = false) => {
    if (isCustom) {
      return <Focus className="size-3.5 text-muted-foreground" />;
    }
    switch (type) {
      case "conversion":
        return <GoalIcon className="size-3.5 text-muted-foreground" />;
      case "engagement":
        return <MousePointerClick className="size-3.5 text-muted-foreground" />;
      default:
        return <GoalIcon className="size-3.5 text-muted-foreground" />;
    }
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
                  {getGoalTypeIcon(selectedGoal.type, selectedGoal.isCustom)}
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
                <CommandGroup>
                  {availableGoals.map((goal) => (
                    <CommandItem
                      key={goal.id}
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
                      {getGoalTypeIcon(goal.type, goal.isCustom)}
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
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
