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
import { Check, ChevronsUpDown } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import type { ReactNode } from "react";
import * as React from "react";

export interface ComboboxSelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface ComboboxSelectValueProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboboxSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const ComboboxSelectValue = ({
  label,
  value,
  onChange,
  options,
  placeholder = "Select option...",
  searchPlaceholder = "Search options...",
  emptyMessage = "No option found.",
  description,
  required = false,
  disabled = false,
  className,
}: ComboboxSelectValueProps) => {
  const [open, setOpen] = React.useState(false);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label
          className={cn(
            required && "after:content-['*'] after:ml-0.5 after:text-red-500"
          )}
        >
          {label}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            // biome-ignore lint/a11y/useSemanticElements: <explanation>
            role="combobox"
            aria-expanded={open}
            className="justify-between w-full h-8"
            disabled={disabled}
          >
            <div className="flex gap-2 items-center">
              {selectedOption?.icon && (
                <div className="flex-shrink-0 w-4 h-4">
                  {selectedOption.icon}
                </div>
              )}
              <span className={cn(selectedOption && "text-brand", "truncate")}>
                {selectedOption ? selectedOption.label : placeholder}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 w-4 h-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-full p-0 w-[var(--radix-popover-trigger-width)]"
          align="start"
        >
          <Command>
            <CommandInput className="h-8" placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={(currentValue) => {
                      onChange(currentValue === value ? "" : currentValue);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex gap-2 items-center">
                      {option.icon && (
                        <div className="flex-shrink-0 w-4 h-4">
                          {option.icon}
                        </div>
                      )}
                      <span>{option.label}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
};
