"use client";

import type { ToolSet } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { IconArrowUpRight } from "@firebuzz/ui/icons/tabler";
import type { UIToolInvocation } from "ai";
import { useMemo } from "react";
import { ToolPart } from "./tool-part";

interface PublishToPreviewProps {
	part: UIToolInvocation<ToolSet["publishToPreview"]>;
}

export const PublishToPreview = ({ part }: PublishToPreviewProps) => {
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
			if (part.output.success && part.output.previewUrl) {
				return (
					<Badge variant="outline" className="flex gap-1 items-center bg-muted">
						<a
							href={part.output.previewUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="flex gap-1 items-center text-xs text-primary hover:underline"
						>
							View <IconArrowUpRight className="size-3" />
						</a>
						
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
			toolName="Publish to Preview"
		>
			{message}
		</ToolPart>
	);
};
