"use client";

import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Checkbox } from "@firebuzz/ui/components/ui/checkbox";
import { Label } from "@firebuzz/ui/components/ui/label";
import { ScrollArea } from "@firebuzz/ui/components/ui/scroll-area";
import { X } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import type { SingleSelectOption } from "./single-select-value";

interface MultiSelectValueProps {
  label?: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: SingleSelectOption[];
  placeholder?: string;
  description?: string;
  required?: boolean;
  maxHeight?: number;
}

export const MultiSelectValue = ({
  label,
  values,
  onChange,
  options,
  placeholder = "Select options",
  description,
  required = false,
  maxHeight = 300,
}: MultiSelectValueProps) => {
  const handleToggle = (value: string) => {
    const newValues = values.includes(value)
      ? values.filter((v) => v !== value)
      : [...values, value];
    onChange(newValues);
  };

  const handleRemove = (value: string) => {
    onChange(values.filter((v) => v !== value));
  };

  const selectedOptions = options.filter((opt) => values.includes(opt.value));

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
      )}

      {/* Selected values as badges */}
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1 p-2 rounded-md border bg-muted/30">
          {selectedOptions.map((option) => (
            <Badge key={option.value} variant="outline" className="gap-1 pr-1">
              {option.icon && (
                <div className="flex-shrink-0 w-3 h-3">{option.icon}</div>
              )}
              <span className="text-xs">{option.label}</span>
              <button
                type="button"
                onClick={() => handleRemove(option.value)}
                className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Options list */}
      <ScrollArea
        className={cn(
          "rounded-md border",
          values.length === 0 && "border-dashed"
        )}
        style={{ maxHeight }}
      >
        <div className="p-2 space-y-1">
          {options.length === 0 ? (
            <p className="py-4 text-sm text-center text-muted-foreground">
              {placeholder}
            </p>
          ) : (
            options.map((option) => {
              const isSelected = values.includes(option.value);
              return (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                    "hover:bg-muted",
                    isSelected &&
                      "bg-brand/5 hover:bg-brand/10 border-brand text-brand border border-brand"
                  )}
                  onClick={() => handleToggle(option.value)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggle(option.value)}
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex gap-2 items-center">
                      {option.icon && (
                        <div className="flex flex-shrink-0 justify-center items-center p-1 rounded-md border size-6 bg-muted">
                          {option.icon}
                        </div>
                      )}
                      <span className="text-sm font-medium">
                        {option.label}
                      </span>
                    </div>
                    {option.description && (
                      <p className="text-xs text-muted-foreground">
                        {option.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
};
