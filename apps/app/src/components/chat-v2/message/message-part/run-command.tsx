"use client";

import type { ToolSet } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import type { UIToolInvocation } from "ai";
import { useMemo } from "react";
import { ToolPart } from "./tool-part";

interface RunCommandProps {
	part: UIToolInvocation<ToolSet["runCommand"]>;
}

export const RunCommand = ({ part }: RunCommandProps) => {
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
					<Badge variant="outline" className="bg-muted">
						Exit code: {part.output.exitCode}
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

		if (part.input) {
			const commandStr = part.input.args
				? `${part.input.command} ${part.input.args.join(" ")}`
				: part.input.command;

			return <span className="font-mono text-xs">{commandStr}</span>;
		}

		return null;
	}, [part.output, part.input]);

	return (
		<ToolPart className="justify-start" status={status} toolName="Run Command">
			{message}
		</ToolPart>
	);
};
