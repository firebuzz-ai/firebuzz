"use client";

import type { ToolSet } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { RotateCcw } from "@firebuzz/ui/icons/lucide";
import type { UIToolInvocation } from "ai";
import { useMemo } from "react";
import { ToolPart } from "./tool-part";

interface RevertToVersionProps {
	part: UIToolInvocation<ToolSet["revertToVersion"]>;
}

export const RevertToVersion = ({ part }: RevertToVersionProps) => {
	const status = useMemo(() => {
		if (part.state === "input-available" || part.state === "input-streaming") {
			return "loading";
		}

		if (part.state === "output-available") {
			return "success";
		}

		return "error";
	}, [part.state]);

	const message = useMemo(() => {
		if (part?.output?.success) {
			return (
				<Badge variant="outline" className="flex gap-1 items-center">
					<RotateCcw className="w-3 h-3" />
					Reverted successfully
				</Badge>
			);
		}

		if (part?.output?.error) {
			return (
				<span className="text-xs text-destructive">
					{part.output.error.message}
				</span>
			);
		}

		if (part.input?.versionId) {
			return (
				<span className="text-xs text-muted-foreground">
					Reverting to version {part.input.versionId}...
				</span>
			);
		}

		return null;
	}, [part]);

	return (
		<ToolPart status={status} toolName="Revert To Version">
			{message}
		</ToolPart>
	);
};
