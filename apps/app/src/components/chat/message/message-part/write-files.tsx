"use client";

import type { ToolSet } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import type { UIToolInvocation } from "ai";
import { useMemo } from "react";
import { ToolPart } from "./tool-part";

interface WriteFilesProps {
	part: UIToolInvocation<ToolSet["writeFiles"]>;
}

export const WriteFiles = ({ part }: WriteFilesProps) => {
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
					<Badge variant="outline">
						{part.output.filesWritten}{" "}
						{part.output.filesWritten === 1 ? "file" : "files"} written
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

		if (part.input?.files) {
			const fileCount = part.input.files.length;
			return (
				<span className="text-xs">
					{fileCount} {fileCount === 1 ? "file" : "files"}
				</span>
			);
		}

		return null;
	}, [part.output, part.input]);

	return (
		<ToolPart className="justify-start" status={status} toolName="Write Files">
			{message}
		</ToolPart>
	);
};
