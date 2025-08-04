"use client";

import { Label } from "@firebuzz/ui/components/ui/label";
import { Toggle } from "@firebuzz/ui/components/ui/toggle";
import { cn } from "@firebuzz/ui/lib/utils";

interface DayOfWeekSelectorProps {
  label?: string;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  description?: string;
  required?: boolean;
  showWeekendHighlight?: boolean;
}

const DAYS = [
  { value: "monday", label: "Mon", fullLabel: "Monday", isWeekend: false },
  { value: "tuesday", label: "Tue", fullLabel: "Tuesday", isWeekend: false },
  {
    value: "wednesday",
    label: "Wed",
    fullLabel: "Wednesday",
    isWeekend: false,
  },
  { value: "thursday", label: "Thu", fullLabel: "Thursday", isWeekend: false },
  { value: "friday", label: "Fri", fullLabel: "Friday", isWeekend: false },
  { value: "saturday", label: "Sat", fullLabel: "Saturday", isWeekend: true },
  { value: "sunday", label: "Sun", fullLabel: "Sunday", isWeekend: true },
];

export const DayOfWeekSelector = ({
  label,
  value,
  onChange,
  multiple = false,
  description,
  required = false,
  showWeekendHighlight = true,
}: DayOfWeekSelectorProps) => {
  const selectedDays = multiple
    ? Array.isArray(value)
      ? value
      : []
    : Array.isArray(value)
      ? value
      : [value].filter(Boolean);

  const handleDayToggle = (dayValue: string) => {
    if (multiple) {
      const newDays = selectedDays.includes(dayValue)
        ? selectedDays.filter((d) => d !== dayValue)
        : [...selectedDays, dayValue];
      onChange(newDays);
    } else {
      onChange(selectedDays.includes(dayValue) ? "" : dayValue);
    }
  };

  const handleQuickSelect = (type: "weekdays" | "weekend" | "all" | "none") => {
    if (!multiple) return;

    let newDays: string[] = [];
    switch (type) {
      case "weekdays":
        newDays = DAYS.filter((d) => !d.isWeekend).map((d) => d.value);
        break;
      case "weekend":
        newDays = DAYS.filter((d) => d.isWeekend).map((d) => d.value);
        break;
      case "all":
        newDays = DAYS.map((d) => d.value);
        break;
      case "none":
        newDays = [];
        break;
    }
    onChange(newDays);
  };

  const isAllWeekdaysSelected = DAYS.filter((d) => !d.isWeekend).every((d) =>
    selectedDays.includes(d.value)
  );
  const isAllWeekendsSelected = DAYS.filter((d) => d.isWeekend).every((d) =>
    selectedDays.includes(d.value)
  );
  const isAllSelected = DAYS.every((d) => selectedDays.includes(d.value));

  return (
    <div className="space-y-3">
      {label && (
        <Label>
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
      )}

      {/* Day selector */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1 rounded-lg bg-muted/30">
          {DAYS.map((day) => {
            const isSelected = selectedDays.includes(day.value);
            return (
              <Toggle
                key={day.value}
                pressed={isSelected}
                onPressedChange={() => handleDayToggle(day.value)}
                className={cn(
                  "flex-1 min-w-[80px] h-12 font-medium text-xs transition-all border",
                  "data-[state=on]:bg-brand/5 data-[state=on]:text-brand data-[state=on]:border-brand",
                  showWeekendHighlight &&
                    day.isWeekend &&
                    !isSelected &&
                    "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500 text-emerald-500"
                )}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold">{day.label}</span>
                  <span className="text-[10px] opacity-70">
                    {day.fullLabel}
                  </span>
                </div>
              </Toggle>
            );
          })}
        </div>

        {/* Quick select buttons for multiple selection */}
        {multiple && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleQuickSelect("all")}
              className={cn(
                "px-3 py-1 text-xs rounded-md border transition-colors",
                isAllSelected
                  ? "text-white bg-brand border-brand"
                  : "hover:bg-muted"
              )}
            >
              All days
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect("weekdays")}
              className={cn(
                "text-xs px-3 py-1 rounded-md border transition-colors",
                isAllWeekdaysSelected && !isAllWeekendsSelected
                  ? "bg-brand text-white border-brand"
                  : "hover:bg-muted"
              )}
            >
              Weekdays
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect("weekend")}
              className={cn(
                "text-xs px-3 py-1 rounded-md border transition-colors",
                isAllWeekendsSelected && !isAllWeekdaysSelected
                  ? "bg-brand text-white border-brand"
                  : "hover:bg-muted"
              )}
            >
              Weekend
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect("none")}
              className="px-3 py-1 ml-auto text-xs rounded-md border transition-colors hover:bg-muted"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Selected days summary */}
      {selectedDays.length > 0 && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Selected: </span>
          {selectedDays.length === 7
            ? "Every day"
            : selectedDays.length === 5 &&
                DAYS.filter((d) => !d.isWeekend).every((d) =>
                  selectedDays.includes(d.value)
                )
              ? "Weekdays only"
              : selectedDays.length === 2 &&
                  DAYS.filter((d) => d.isWeekend).every((d) =>
                    selectedDays.includes(d.value)
                  )
                ? "Weekends only"
                : DAYS.filter((d) => selectedDays.includes(d.value))
                    .map((d) => d.fullLabel)
                    .join(", ")}
        </div>
      )}

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
};
