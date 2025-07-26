"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@firebuzz/ui/components/ui/button";
import { Calendar } from "@firebuzz/ui/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@firebuzz/ui/components/ui/popover";

export function DatePicker({
  value,
  onChange,
  placeholder,
}: {
  value: Date | undefined;
  onChange: (value: Date | undefined) => void;
  placeholder?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-empty={!value}
          className="data-[empty=true]:text-muted-foreground w-full justify-start text-left font-normal h-8"
        >
          <CalendarIcon />
          {value ? (
            format(new Date(value), "PPP")
          ) : (
            <span>{placeholder || "Pick a date"}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="overflow-hidden p-0 w-auto">
        <Calendar mode="single" selected={value} onSelect={onChange} />
      </PopoverContent>
    </Popover>
  );
}
