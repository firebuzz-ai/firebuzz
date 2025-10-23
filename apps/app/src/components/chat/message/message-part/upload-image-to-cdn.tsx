"use client";

import type { ToolSet } from "@firebuzz/convex";
import type { UIToolInvocation } from "ai";
import { useMemo } from "react";
import { ToolPart } from "./tool-part";

interface UploadImageToCDNProps {
	part: UIToolInvocation<ToolSet["uploadImageToCDN"]>;
}

export const UploadImageToCDN = ({ part }: UploadImageToCDNProps) => {
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
			if (part.output.success && part.output.cdnUrl) {
				return (
					<span className="font-mono text-xs truncate">
						{part.output.cdnUrl}
					</span>
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
			toolName="Upload Image to CDN"
		>
			{message}
		</ToolPart>
	);
};
