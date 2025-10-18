"use client";

import type { ToolSet } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import type { UIToolInvocation } from "ai";
import { useMemo } from "react";
import { ToolPart } from "./tool-part";

interface TakeWebsiteSnapshotProps {
	part: UIToolInvocation<ToolSet["takeWebsiteSnapshot"]>;
}

export const TakeWebsiteSnapshot = ({ part }: TakeWebsiteSnapshotProps) => {
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
			if (part.output.success && part.output.url) {
				const cleanURL = (url: string) => {
					return url
						.replace(/^https?:\/\//, "")
						.replace(/^www\./, "")
						.replace(/\/$/, "");
				};
				const cleanedUrl = cleanURL(part.output.url);
				return (
					<Badge
						variant="outline"
						className="font-mono text-xs bg-muted text-muted-foreground"
					>
						{cleanedUrl}
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
			return (
				<span className="font-mono text-xs truncate">{part.input.url}</span>
			);
		}

		return null;
	}, [part.output, part.input]);

	return (
		<ToolPart
			className="justify-start"
			status={status}
			toolName="Take Website Snapshot"
		>
			{message}
		</ToolPart>
	);
};
