"use client";

import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Checkbox } from "@firebuzz/ui/components/ui/checkbox";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Label } from "@firebuzz/ui/components/ui/label";
import { ScrollArea } from "@firebuzz/ui/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Search, X } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { countriesAndLanguages } from "@firebuzz/utils";
import { useMemo, useState } from "react";

interface CountryMultiSelectProps {
  label?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  description?: string;
  required?: boolean;
  maxHeight?: number;
}

export const CountryMultiSelect = ({
  label,
  values,
  onChange,
  placeholder = "Select countries",
  description,
  required = false,
  maxHeight = 300,
}: CountryMultiSelectProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Get all countries from the constants
  const allCountries = useMemo(() => {
    return countriesAndLanguages.map((country) => ({
      value: country.code,
      label: country.country,
    }));
  }, []);

  // Filter countries based on search term
  const filteredCountries = useMemo(() => {
    if (!searchTerm) return allCountries;

    return allCountries.filter(
      (country) =>
        country.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        country.value.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allCountries, searchTerm]);

  const handleToggle = (value: string) => {
    const newValues = values.includes(value)
      ? values.filter((v) => v !== value)
      : [...values, value];
    onChange(newValues);
  };

  const handleRemove = (value: string) => {
    onChange(values.filter((v) => v !== value));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const selectedCountries = allCountries.filter((country) =>
    values.includes(country.value)
  );

  return (
    <div className="space-y-3">
      {label && (
        <Label>
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
      )}

      {/* Selected countries as badges */}
      {selectedCountries.length > 0 && (
        <div className="flex relative flex-wrap gap-1 p-3 rounded-md border bg-muted/30">
          {selectedCountries.map((country) => (
            <Badge key={country.value} variant="outline" className="gap-1 pr-1">
              <span className="text-xs">{country.label}</span>
              <button
                type="button"
                onClick={() => handleRemove(country.value)}
                className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          {/* Clear all button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="iconXs"
                className="absolute top-2 right-2"
                onClick={handleClearAll}
                disabled={values.length === 0}
              >
                <X className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear all</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Search and actions */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 size-3 text-muted-foreground" />
          <Input
            placeholder="Search countries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-8"
            type="search"
          />
        </div>
      </div>

      {/* Countries list */}
      <div className="rounded-md border">
        <ScrollArea style={{ height: maxHeight }} className="w-full">
          <div className="p-2 space-y-1">
            {filteredCountries.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? "No countries found" : placeholder}
                </p>
              </div>
            ) : (
              filteredCountries.map((country) => {
                const isSelected = values.includes(country.value);
                return (
                  <div
                    key={country.value}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                      "hover:bg-muted",
                      isSelected &&
                        "bg-brand/5 hover:bg-brand/10 border border-brand"
                    )}
                    onClick={() => handleToggle(country.value)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggle(country.value)}
                    />
                    <div className="flex-1">
                      <div className="flex gap-2 items-center">
                        <span className="text-sm font-medium">
                          {country.label}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {country.value}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
};
