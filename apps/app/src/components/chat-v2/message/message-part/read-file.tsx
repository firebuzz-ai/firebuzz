"use client";

import type { ToolSet } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import type { UIToolInvocation } from "ai";
import { useMemo } from "react";
import { ToolPart } from "./tool-part";

interface ReadFileProps {
	part: UIToolInvocation<ToolSet["readFile"]>;
}

export const ReadFile = ({ part }: ReadFileProps) => {
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
				const contentLength = part.output.content?.length || 0;
				const filePath = part.input?.filePath;
				return (
					<Badge variant="outline" className="flex gap-1 items-center bg-muted">
						<span>{filePath}</span> <span>-</span>
						<span className="text-xs text-muted-foreground">
							{contentLength} characters
						</span>
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
			return <span className="text-xs">{part.input.filePath}</span>;
		}

		return null;
	}, [part.output, part.input]);

	return (
		<ToolPart className="justify-start" status={status} toolName="Read File">
			{message}
		</ToolPart>
	);
};
