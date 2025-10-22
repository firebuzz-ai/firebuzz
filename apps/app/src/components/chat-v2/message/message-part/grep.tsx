"use client";

import type { ToolSet } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import type { UIToolInvocation } from "ai";
import { useMemo } from "react";
import { ToolPart } from "./tool-part";

interface GrepProps {
	part: UIToolInvocation<ToolSet["grep"]>;
}

export const Grep = ({ part }: GrepProps) => {
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
				const pattern = part.input?.pattern;
				const path = part.input?.path || ".";
				const totalMatches = part.output.totalMatches || 0;
				const matchesShown = part.output.matches?.length || 0;
				const includePattern = part.input?.includePattern;
				const excludePattern = part.input?.excludePattern;

				return (
					<div className="flex gap-1 items-center">
						<Badge
							variant="outline"
							className="flex gap-1 items-center bg-muted"
						>
							<span className="text-xs">"{pattern}"</span>
							<span>in</span>
							<span className="text-xs">{path}</span>
							{includePattern && (
								<>
									<span>-</span>
									<span className="text-xs text-muted-foreground">
										include: {includePattern}
									</span>
								</>
							)}
							{excludePattern && (
								<>
									<span>-</span>
									<span className="text-xs text-muted-foreground">
										exclude: {excludePattern}
									</span>
								</>
							)}
						</Badge>
						<span className="text-xs text-muted-foreground">
							{totalMatches === 0
								? "No matches found"
								: totalMatches === matchesShown
									? `${totalMatches} ${totalMatches === 1 ? "match" : "matches"} found`
									: `${matchesShown} of ${totalMatches} matches shown`}
						</span>
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
			const pattern = part.input?.pattern;
			const path = part.input?.path || ".";

			return (
				<span className="text-xs">
					Searching for "{pattern}" in {path}
				</span>
			);
		}

		return null;
	}, [part.output, part.input]);

	return (
		<ToolPart className="justify-start" status={status} toolName="Grep">
			{message}
		</ToolPart>
	);
};
