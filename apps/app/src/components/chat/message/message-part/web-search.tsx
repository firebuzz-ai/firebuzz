"use client";

import type { ToolSet } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import type { UIToolInvocation } from "ai";
import { useMemo } from "react";
import { ToolPart } from "./tool-part";

interface WebSearchProps {
	part: UIToolInvocation<ToolSet["webSearch"]>;
}

export const WebSearch = ({ part }: WebSearchProps) => {
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
			if (part.output.success && part.output.results) {
				const resultCount = part.output.results.length;
				const query = part.input?.query;
				return (
					<Badge variant="outline" className="flex gap-1 items-center bg-muted">
						<span className="truncate">{query}</span> <span>-</span>
						<span className="text-xs text-muted-foreground">
							{resultCount} {resultCount === 1 ? "result" : "results"}
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
			return <span className="text-xs truncate">{part.input.query}</span>;
		}

		return null;
	}, [part.output, part.input]);

	return (
		<ToolPart className="justify-start" status={status} toolName="Web Search">
			{message}
		</ToolPart>
	);
};
