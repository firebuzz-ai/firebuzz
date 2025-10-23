"use client";

import type { ToolSet } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import type { UIToolInvocation } from "ai";
import { useMemo } from "react";
import { ToolPart } from "./tool-part";

interface BuildLandingPageProps {
	part: UIToolInvocation<ToolSet["buildLandingPage"]>;
}

export const BuildLandingPage = ({ part }: BuildLandingPageProps) => {
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
				return <Badge variant="emerald">Completed</Badge>;
			}

			if (part.output.error) {
				return <Badge variant="destructive">Build failed</Badge>;
			}
		}

		return <span className="text-xs">Building project...</span>;
	}, [part.output]);

	return (
		<ToolPart className="justify-start" status={status} toolName="Build">
			{message}
		</ToolPart>
	);
};
