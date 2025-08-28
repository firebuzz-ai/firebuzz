"use client";

import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button, buttonVariants } from "@firebuzz/ui/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@firebuzz/ui/components/ui/command";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Label } from "@firebuzz/ui/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@firebuzz/ui/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@firebuzz/ui/components/ui/select";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
  ArrowRight,
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
  Lock,
  type LucideIcon,
  Mail,
  MousePointerClick,
  Percent,
  Phone,
  Plus,
  Share2,
  ShoppingCart,
  TextCursorInput,
  UserPlus,
} from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { useState } from "react";

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
  description?: string;
  icon: string;
  direction: "up" | "down";
  placement: "internal" | "external";
  value: number;
  currency?: string;
  type: "conversion" | "engagement";
  isCustom: boolean;
};

interface GoalSelectorProps {
  selectedGoal?: Goal;
  availableGoals: Goal[];
  onGoalChange: (goal: Goal) => void;
  onValueChange: (value: number) => void;
  onCurrencyChange: (currency: string) => void;
  label?: string;
  className?: string;
  onNavigateToCustomEvents?: (editEventId?: string) => void;
  onCreateCustomEvent?: () => void;
  customGoalsCount?: number;
  campaignType?: "lead-generation" | "traffic" | "e-commerce" | string;
}

const currencyOptions = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "JPY", label: "JPY (¥)" },
  { value: "CAD", label: "CAD ($)" },
  { value: "AUD", label: "AUD ($)" },
  { value: "CHF", label: "CHF (₣)" },
  { value: "CNY", label: "CNY (¥)" },
  { value: "INR", label: "INR (₹)" },
  { value: "BRL", label: "BRL (R$)" },
  { value: "TRY", label: "TRY (₺)" },
  { value: "SEK", label: "SEK (kr)" },
  { value: "NOK", label: "NOK (kr)" },
  { value: "DKK", label: "DKK (kr)" },
  { value: "MXN", label: "MXN ($)" },
];

export const GoalSelector = ({
  selectedGoal,
  availableGoals,
  onGoalChange,
  onValueChange,
  onCurrencyChange,
  label = "Primary Goal",
  className,
  onNavigateToCustomEvents,
  onCreateCustomEvent,
  campaignType,
}: GoalSelectorProps) => {
  const [open, setOpen] = useState(false);

  const handleGoalSelect = (goalId: string) => {
    const goal = availableGoals.find((g) => g.id === goalId);
    if (goal) {
      onGoalChange(goal);
      setOpen(false);
    }
  };

  const getGoalIcon = (goal: Goal) => {
    // Use icon from goal.icon property if available
    if (goal.icon && iconMap[goal.icon]) {
      const Icon = iconMap[goal.icon];
      return <Icon className="size-3.5 text-muted-foreground" />;
    }

    // Default icon if no icon property
    return <GoalIcon className="size-3.5 text-muted-foreground" />;
  };

  // Disable goal selection for lead-generation campaigns
  const isLeadGeneration = campaignType === "lead-generation";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Goal Selection - Custom Combobox */}
      <div className="space-y-2">
        <Label>{label}</Label>
        {isLeadGeneration ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  buttonVariants({
                    variant: "outline",
                    className: "justify-between w-full h-8",
                  })
                )}
              >
                <div className="flex gap-2 items-center">
                  <TextCursorInput className="size-3.5 text-muted-foreground" />
                  <span className="text-sm">Form Submission</span>
                </div>

                <Lock className="size-3.5 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              This is the default goal for lead generation campaigns.
            </TooltipContent>
          </Tooltip>
        ) : (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                // biome-ignore lint/a11y/useSemanticElements: <explanation>
                role="combobox"
                aria-expanded={open}
                className="justify-between w-full h-8"
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
                <CommandInput placeholder="Search events..." className="h-8" />
                <CommandList>
                  <CommandEmpty>No events found.</CommandEmpty>

                  {/* Custom Events Group (on top) */}
                  {availableGoals.filter((goal) => goal.isCustom).length >
                    0 && (
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
                              <div className="font-medium truncate">
                                {goal.title}
                              </div>
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
                  {availableGoals.filter((goal) => !goal.isCustom).length >
                    0 && (
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
                              <div className="font-medium truncate">
                                {goal.title}
                              </div>
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
        )}
      </div>

      {/* Goal Value and Currency */}
      {selectedGoal && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="goal-value">Goal Value</Label>
              <Input
                id="goal-value"
                type="number"
                value={selectedGoal.value}
                onChange={(e) => {
                  const value = Number.parseFloat(e.target.value) || 0;
                  onValueChange(value);
                }}
                min="0"
                step="0.01"
                className="h-8"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal-currency">Currency</Label>
              <Select
                value={selectedGoal.currency || "USD"}
                onValueChange={onCurrencyChange}
              >
                <SelectTrigger id="goal-currency" className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      <Separator />

      {/* Tracked Events Section */}
      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Tracked Events</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={onCreateCustomEvent}
              className="h-7 text-xs"
            >
              <Plus className="size-3" />
              Add Event
            </Button>
          </div>

          <div className="p-3 rounded-lg border bg-muted">
            {(() => {
              // Filter built-in events based on campaign type
              const builtInEvents = availableGoals.filter((goal) => {
                if (goal.isCustom) return false;
                return true;
              });

              const customEvents = availableGoals.filter(
                (goal) => goal.isCustom
              );
              const allTrackedEvents = [...builtInEvents, ...customEvents];

              return allTrackedEvents.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {/* Custom Events First (clickable) */}
                  {customEvents.map((goal, index) => (
                    <Tooltip key={`${goal.id}-${index}-custom`}>
                      <TooltipTrigger asChild>
                        <Badge
                          className="flex items-center gap-1.5 px-2 py-1 cursor-pointer"
                          onClick={() => onNavigateToCustomEvents?.(goal.id)}
                        >
                          {getGoalIcon(goal)}
                          <span className="text-xs">{goal.title}</span>
                          <ArrowRight className="size-2.5 ml-1 opacity-60" />
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Click to edit custom event</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}

                  {/* Built-in Events */}
                  {builtInEvents.map((goal, index) => (
                    <Tooltip key={`${goal.id}-${index}-default`}>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1.5 px-2 py-1"
                        >
                          {getGoalIcon(goal)}
                          <span className="text-xs">{goal.title}</span>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Built-in event tracked automatically</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              ) : (
                <div className="py-2 text-center">
                  <p className="text-sm text-muted-foreground">
                    No tracked events yet
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onCreateCustomEvent}
                    className="mt-2 h-7 text-xs"
                  >
                    Create your first event
                  </Button>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
