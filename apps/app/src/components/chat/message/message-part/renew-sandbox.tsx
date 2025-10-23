"use client";

import type { ToolSet } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import type { UIToolInvocation } from "ai";
import { useMemo } from "react";
import { ToolPart } from "./tool-part";

interface RenewSandboxProps {
	part: UIToolInvocation<ToolSet["renewSandbox"]>;
}

export const RenewSandbox = ({ part }: RenewSandboxProps) => {
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
					<div className="flex flex-col gap-1">
						<Badge variant="emerald" className="w-fit">
							Sandbox renewed
						</Badge>
						{part.input?.reason && (
							<span className="text-xs italic text-muted-foreground">
								Reason: {part.input.reason}
							</span>
						)}
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

		if (part.input?.reason) {
			return (
				<span className="text-xs italic text-muted-foreground">
					{part.input.reason}
				</span>
			);
		}

		return null;
	}, [part.output, part.input]);

	return (
		<ToolPart
			className="justify-start"
			status={status}
			toolName="Renew Sandbox"
		>
			{message}
		</ToolPart>
	);
};
