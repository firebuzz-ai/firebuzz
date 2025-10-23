"use client";

import type { ToolSet } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import type { UIToolInvocation } from "ai";
import { useMemo } from "react";
import { ToolPart } from "./tool-part";

interface GetTargetAudiencesProps {
	part: UIToolInvocation<ToolSet["getTargetAudiences"]>;
}

export const GetTargetAudiences = ({ part }: GetTargetAudiencesProps) => {
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
			if (part.output.success && part.output.data) {
				const count = part.output.data.length;

				return (
					<div className="flex gap-2 items-center">
						<Badge variant="outline" className="bg-muted">
							{count} {count === 1 ? "audience" : "audiences"}
						</Badge>
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

		if (part.input) {
			const numItems = part.input.numItems || 10;
			return <span className="text-xs">Fetching {numItems} audiences...</span>;
		}

		return null;
	}, [part.output, part.input]);

	return (
		<ToolPart
			className="justify-start"
			status={status}
			toolName="Get Target Audiences"
		>
			{message}
		</ToolPart>
	);
};
