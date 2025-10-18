"use client";

import type { ToolSet } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import type { UIToolInvocation } from "ai";
import { useMemo } from "react";
import { ToolPart } from "./tool-part";

interface GetFormSchemaProps {
	part: UIToolInvocation<ToolSet["getFormSchema"]>;
}

export const GetFormSchema = ({ part }: GetFormSchemaProps) => {
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
			if (part.output.success && part.output.schema) {
				const fieldCount = part.output.schema.length;
				return (
					<div className="flex gap-2 items-center">
						<Badge variant="outline" className="bg-muted">
							{fieldCount} {fieldCount === 1 ? "field" : "fields"} retrieved
						</Badge>
						{part.output.submitButtonText && (
							<Badge variant="outline" className="bg-muted/50 text-xs">
								{part.output.submitButtonText}
							</Badge>
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

		return <span className="text-xs">Fetching form schema...</span>;
	}, [part.output]);

	return (
		<ToolPart
			className="justify-start"
			status={status}
			toolName="Get Form Schema"
		>
			{message}
		</ToolPart>
	);
};
