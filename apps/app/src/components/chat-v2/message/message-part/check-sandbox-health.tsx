"use client";

import type { ToolSet } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import type { UIToolInvocation } from "ai";
import { useMemo } from "react";
import { ToolPart } from "./tool-part";

interface CheckSandboxHealthProps {
	part: UIToolInvocation<ToolSet["checkSandboxHealth"]>;
}

export const CheckSandboxHealth = ({ part }: CheckSandboxHealthProps) => {
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
		if (part?.output) {
			return (
				<Badge variant="outline" className="capitalize">
					{part.output.status}
				</Badge>
			);
		}

		return null;
	}, [part.output]);

	return (
		<ToolPart
			className="justify-start"
			status={status}
			toolName="Check Sandbox Health"
		>
			{message}
		</ToolPart>
	);
};
