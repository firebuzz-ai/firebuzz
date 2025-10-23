"use client";

import type { ToolSet } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { FileCheck, FilePlus, FileX } from "@firebuzz/ui/icons/lucide";
import type { UIToolInvocation } from "ai";
import { useMemo } from "react";
import { ToolPart } from "./tool-part";

interface PreviewVersionRevertProps {
	part: UIToolInvocation<ToolSet["previewVersionRevert"]>;
}

export const PreviewVersionRevert = ({ part }: PreviewVersionRevertProps) => {
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
			const { filesChanged, filesAdded, filesDeleted } = part.output;
			const total =
				(filesChanged || 0) + (filesAdded || 0) + (filesDeleted || 0);

			if (total === 0) {
				return (
					<span className="text-xs text-muted-foreground">No changes</span>
				);
			}

			return (
				<div className="flex flex-wrap gap-2 items-center">
					{filesChanged && filesChanged > 0 ? (
						<Badge variant="outline" className="flex gap-1 items-center">
							<FileCheck className="w-3 h-3" />
							{filesChanged} modified
						</Badge>
					) : null}
					{filesAdded && filesAdded > 0 ? (
						<Badge variant="outline" className="flex gap-1 items-center">
							<FilePlus className="w-3 h-3 text-green-600" />
							{filesAdded} added
						</Badge>
					) : null}
					{filesDeleted && filesDeleted > 0 ? (
						<Badge variant="outline" className="flex gap-1 items-center">
							<FileX className="w-3 h-3 text-red-600" />
							{filesDeleted} deleted
						</Badge>
					) : null}
				</div>
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
					Analyzing version {part.input.versionId}...
				</span>
			);
		}

		return null;
	}, [part]);

	return (
		<ToolPart status={status} toolName="Preview Version Revert">
			{message}
		</ToolPart>
	);
};
