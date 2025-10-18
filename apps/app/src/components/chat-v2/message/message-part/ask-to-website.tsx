"use client";

import type { ToolSet } from "@firebuzz/convex";
import type { UIToolInvocation } from "ai";
import { useMemo } from "react";
import { ToolPart } from "./tool-part";

interface AskToWebsiteProps {
	part: UIToolInvocation<ToolSet["askToWebsite"]>;
}

export const AskToWebsite = ({ part }: AskToWebsiteProps) => {
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
			if (part.output.success && part.output.answer) {
				return (
					<div className="flex flex-col gap-1">
						<span className="text-xs italic">{part.input?.query}</span>
						{part.output.context && (
							<span className="text-xs text-muted-foreground">
								{part.output.context.length} context sources
							</span>
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

		if (part.input) {
			return (
				<span className="text-xs italic truncate">{part.input.query}</span>
			);
		}

		return null;
	}, [part.output, part.input]);

	return (
		<ToolPart className="justify-start" status={status} toolName="Ask to Website">
			{message}
		</ToolPart>
	);
};
