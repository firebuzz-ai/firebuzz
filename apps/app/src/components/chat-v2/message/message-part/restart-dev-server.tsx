"use client";

import type { ToolSet } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import type { UIToolInvocation } from "ai";
import { useMemo } from "react";
import { ToolPart } from "./tool-part";

interface RestartDevServerProps {
	part: UIToolInvocation<ToolSet["restartDevServer"]>;
}

export const RestartDevServer = ({ part }: RestartDevServerProps) => {
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
			if (part.output.success) {
				return (
					<Badge variant="emerald" className="w-fit">
						Dev server restarted
					</Badge>
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

		return null;
	}, [part.output]);

	return (
		<ToolPart
			className="justify-start"
			status={status}
			toolName="Restart Dev Server"
		>
			{message}
		</ToolPart>
	);
};
