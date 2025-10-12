"use client";

import type { ToolSet } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { GitCommit } from "@firebuzz/ui/icons/lucide";
import type { UIToolInvocation } from "ai";
import { useMemo } from "react";
import { ToolPart } from "./tool-part";

interface ListLandingPageVersionsProps {
	part: UIToolInvocation<ToolSet["listLandingPageVersions"]>;
}

export const ListLandingPageVersions = ({
	part,
}: ListLandingPageVersionsProps) => {
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
		if (part?.output?.success && part?.output?.versions) {
			const versions = part.output.versions;

			if (versions.length === 0) {
				return (
					<span className="text-xs text-muted-foreground">
						No versions saved yet
					</span>
				);
			}

			return (
				<div className="flex flex-col gap-2">
					{versions.map((version) => (
						<div key={version._id} className="flex items-center gap-2">
							<Badge variant="outline" className="flex items-center gap-1">
								<GitCommit className="w-3 h-3" />
								Version {version.number}
							</Badge>
							{version.commitMessage && (
								<span className="text-xs text-muted-foreground">
									{version.commitMessage}
								</span>
							)}
							<span className="text-xs text-muted-foreground">
								ID: {version._id}
							</span>
						</div>
					))}
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

		return (
			<span className="text-xs text-muted-foreground">Loading versions...</span>
		);
	}, [part]);

	return (
		<ToolPart status={status} toolName="List Versions">
			{message}
		</ToolPart>
	);
};
