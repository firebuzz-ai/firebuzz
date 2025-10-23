"use client";

import type { ToolSet } from "@firebuzz/convex";
import type { UIToolInvocation } from "ai";
import { useMemo } from "react";
import { ToolPart } from "./tool-part";

interface CheckDevServerAndLogsProps {
	part: UIToolInvocation<ToolSet["checkDevServerAndLogs"]>;
}

export const CheckDevServerAndLogs = ({ part }: CheckDevServerAndLogsProps) => {
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
			if (part.output.error) {
				return (
					<span className="text-xs text-destructive">
						{part.output.error.message}
					</span>
				);
			}
		}

		return null;
	}, [part.output]);

	return (
		<ToolPart
			className="justify-start"
			status={status}
			toolName="Check Dev Server & Logs"
		>
			{message}
		</ToolPart>
	);
};
