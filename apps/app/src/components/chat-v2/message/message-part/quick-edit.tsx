"use client";

import type { ToolSet } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import type { UIToolInvocation } from "ai";
import { useMemo } from "react";
import { ToolPart } from "./tool-part";

interface QuickEditProps {
	part: UIToolInvocation<ToolSet["quickEdit"]>;
}

export const QuickEdit = ({ part }: QuickEditProps) => {
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
						{part.output.replacements}{" "}
						{part.output.replacements === 1 ? "replacement" : "replacements"}
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
		<ToolPart className="justify-start" status={status} toolName="Quick Edit">
			{message}
		</ToolPart>
	);
};
