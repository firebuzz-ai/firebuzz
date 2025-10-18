"use client";

import type { ToolSet } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import type { UIToolInvocation } from "ai";
import { useMemo } from "react";
import { ToolPart } from "./tool-part";

interface GetCustomEventsProps {
	part: UIToolInvocation<ToolSet["getCustomEvents"]>;
}

export const GetCustomEvents = ({ part }: GetCustomEventsProps) => {
	const status = useMemo(() => {
		if (part.state === "input-available" || part.state === "input-streaming") {
			return "loading";
		}

		if (part.state === "output-available" && part.output?.success) {
			return "success";
		}

		return "error";
	}, [part.state, part.output]);

	const message = useMemo(() => {
		if (part?.output) {
			if (part.output.success && part.output.events) {
				const eventCount = part.output.events.length;
				const conversionEvents = part.output.events.filter(
					(e) => e.type === "conversion",
				).length;
				const engagementEvents = part.output.events.filter(
					(e) => e.type === "engagement",
				).length;

				return (
					<div className="flex gap-2 items-center">
						<Badge variant="outline" className="bg-muted">
							{eventCount} {eventCount === 1 ? "event" : "events"} retrieved
						</Badge>
						{conversionEvents > 0 && (
							<Badge
								variant="outline"
								className="bg-green-500/10 text-green-700 text-xs"
							>
								{conversionEvents} conversion
							</Badge>
						)}
						{engagementEvents > 0 && (
							<Badge
								variant="outline"
								className="bg-blue-500/10 text-blue-700 text-xs"
							>
								{engagementEvents} engagement
							</Badge>
						)}
					</div>
				);
			}

			if (part.output.error) {
				return (
					<span className="text-xs text-destructive">
						{part.output.error.message}
					</span>
				);
			}
		}

		return <span className="text-xs">Fetching custom events...</span>;
	}, [part.output]);

	return (
		<ToolPart
			className="justify-start"
			status={status}
			toolName="Get Custom Events"
		>
			{message}
		</ToolPart>
	);
};
