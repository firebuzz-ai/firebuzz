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
				const startLine = part.input?.startLine;
				const endLine = part.input?.endLine;

				// Determine if partial read or full file
				const isPartialRead = startLine !== undefined || endLine !== undefined;

				return (
					<Badge variant="outline" className="flex gap-1 items-center bg-muted">
						<span>{filePath}</span>
						{isPartialRead && (
							<>
								<span>-</span>
								<span className="text-xs text-muted-foreground">
									lines {startLine || 1}-{endLine || "end"}
								</span>
							</>
						)}
						<span>-</span>
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
			const startLine = part.input?.startLine;
			const endLine = part.input?.endLine;
			const isPartialRead = startLine !== undefined || endLine !== undefined;

			return (
				<span className="text-xs">
					{part.input.filePath}
					{isPartialRead && (
						<span className="text-muted-foreground">
							{" "}
							(lines {startLine || 1}-{endLine || "end"})
						</span>
					)}
				</span>
			);
		}

		return null;
	}, [part.output, part.input]);

	return (
		<ToolPart className="justify-start" status={status} toolName="Read File">
			{message}
		</ToolPart>
	);
};
