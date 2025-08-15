"use client";

import { format } from "date-fns";
import * as React from "react";

import { Button } from "@firebuzz/ui/components/ui/button";
import { Calendar } from "@firebuzz/ui/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@firebuzz/ui/components/ui/popover";
import { ScrollArea, ScrollBar } from "@firebuzz/ui/components/ui/scroll-area";
import { cn } from "@firebuzz/ui/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";

export interface DateTimePickerProps {
	value?: Date;
	onChange: (date: Date) => void;
	placeholder?: string;
	minuteStep?: number; // e.g., 5, 10, 15
	buttonClassName?: string;
}

// Reusable 24h date-time picker with calendar + hour/minute pickers
export const DateTimePicker: React.FC<DateTimePickerProps> = ({
	value,
	onChange,
	placeholder = "MM/DD/YYYY HH:mm",
	minuteStep = 5,
	buttonClassName,
}) => {
	const handleDateSelect = (date: Date | undefined) => {
		if (!date) return;
		const current = value || new Date();
		const next = new Date(date);
		// Preserve time from current value (or default to 09:00)
		const hours = value ? current.getHours() : 9;
		const minutes = value ? current.getMinutes() : 0;
		next.setHours(hours, minutes, 0, 0);
		onChange(next);
	};

	const handleTimeChange = (type: "hour" | "minute", rawValue: number) => {
		const base = value || new Date();
		const next = new Date(base);
		if (type === "hour") next.setHours(rawValue);
		if (type === "minute") next.setMinutes(rawValue);
		next.setSeconds(0);
		next.setMilliseconds(0);
		onChange(next);
	};

	const hours = React.useMemo(
		() => Array.from({ length: 24 }, (_, i) => i),
		[],
	);

	const minutes = React.useMemo(() => {
		const step = Math.max(1, Math.min(30, minuteStep));
		const arr: number[] = [];
		for (let m = 0; m < 60; m += step) arr.push(m);
		return arr;
	}, [minuteStep]);

	return (
		<Popover modal={true}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className={cn(
						"h-8 w-full justify-start text-left font-normal",
						!value && "text-muted-foreground",
						buttonClassName,
					)}
				>
					{value ? (
						format(value, "MM/dd/yyyy HH:mm")
					) : (
						<span>{placeholder}</span>
					)}
					<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[var(--radix-popover-trigger-width)] p-0"
				align="start"
			>
				<div className="sm:flex">
					<Calendar
						mode="single"
						selected={value}
						onSelect={handleDateSelect}
						initialFocus
					/>
					<div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x">
						<ScrollArea className="h-60 w-64 sm:h-[300px] sm:w-auto">
							<div className="flex sm:flex-col p-2">
								{hours.map((hour) => (
									<Button
										key={hour}
										size="icon"
										variant={
											value && value.getHours() === hour ? "default" : "ghost"
										}
										className="sm:w-full shrink-0 aspect-square"
										onClick={() => handleTimeChange("hour", hour)}
									>
										{hour.toString().padStart(2, "0")}
									</Button>
								))}
							</div>
							<ScrollBar orientation="horizontal" className="sm:hidden" />
						</ScrollArea>
						<ScrollArea className="h-60 w-64 sm:h-[300px] sm:w-auto">
							<div className="flex sm:flex-col p-2">
								{minutes.map((minute) => (
									<Button
										key={minute}
										size="icon"
										variant={
											value && value.getMinutes() === minute
												? "default"
												: "ghost"
										}
										className="sm:w-full shrink-0 aspect-square"
										onClick={() => handleTimeChange("minute", minute)}
									>
										{minute.toString().padStart(2, "0")}
									</Button>
								))}
							</div>
							<ScrollBar orientation="horizontal" className="sm:hidden" />
						</ScrollArea>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
};

DateTimePicker.displayName = "DateTimePicker";
