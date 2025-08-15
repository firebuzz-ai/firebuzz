"use client";

import { DateTimePicker } from "@firebuzz/ui/components/reusable/date-time-picker";
import { Button } from "@firebuzz/ui/components/ui/button";
//
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { Label } from "@firebuzz/ui/components/ui/label";
import { useState } from "react";

export interface ScheduleDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSchedule: (date: Date) => void;
	currentScheduledAt?: string;
	isReschedule?: boolean;
	isLoading?: boolean;
}

export const ScheduleDialog = ({
	open,
	onOpenChange,
	onSchedule,
	currentScheduledAt,
	isReschedule = false,
	isLoading = false,
}: ScheduleDialogProps) => {
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(
		currentScheduledAt ? new Date(currentScheduledAt) : undefined,
	);

	const handlePickerChange = (next: Date) => setSelectedDate(next);

	const handleSchedule = () => {
		if (!selectedDate) return;

		const next = new Date(selectedDate);
		next.setSeconds(0);
		next.setMilliseconds(0);
		onSchedule(next);
	};

	const isValidDateTime = () => {
		if (!selectedDate) return false;

		const scheduledDateTime = new Date(selectedDate);

		const now = new Date();
		const minTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now

		return scheduledDateTime > minTime;
	};

	const getScheduleSummary = () => {
		if (!selectedDate || !isValidDateTime()) return null;

		const scheduledDateTime = new Date(selectedDate);

		const formatter = new Intl.DateTimeFormat("en-US", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
			timeZoneName: "short",
		});

		return formatter.format(scheduledDateTime);
	};

	// Time options removed; handled inside DateTimePicker

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				onOpenAutoFocus={(e) => e.preventDefault()}
				className="sm:max-w-md w-full flex flex-col !gap-0 !p-0"
			>
				<DialogHeader className="px-4 py-4 border-b">
					<div className="w-full">
						<DialogTitle>
							{isReschedule ? "Reschedule Campaign" : "Schedule Campaign"}
						</DialogTitle>
						<DialogDescription>
							{isReschedule
								? "Choose a new date and time to publish this campaign to production."
								: "Choose when to publish this campaign to production."}
						</DialogDescription>
					</div>
				</DialogHeader>

				<div className="p-4 space-y-4">
					<div className="space-y-2">
						<Label>Date & Time</Label>
						<DateTimePicker
							value={selectedDate}
							onChange={handlePickerChange}
							buttonClassName="h-8"
							minuteStep={5}
						/>
						<p className="text-xs text-muted-foreground">
							Time is in your local timezone
						</p>
					</div>

					{/* Schedule Summary */}
					{getScheduleSummary() && (
						<div className="rounded-md bg-muted p-3">
							<p className="text-sm font-medium">Will publish on:</p>
							<p className="text-sm text-muted-foreground">
								{getScheduleSummary()}
							</p>
						</div>
					)}

					{/* Validation Message */}
					{selectedDate && !isValidDateTime() && (
						<div className="rounded-md bg-destructive/10 p-3">
							<p className="text-sm text-destructive">
								Scheduled time must be at least 5 minutes in the future
							</p>
						</div>
					)}
				</div>

				<div className="p-4 border-t flex items-center justify-end gap-2">
					<Button
						variant="outline"
						onClick={handleSchedule}
						disabled={!isValidDateTime() || isLoading}
						size="sm"
						className="w-full"
					>
						{isLoading
							? "Scheduling..."
							: isReschedule
								? "Reschedule"
								: "Schedule"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};
