"use client";

import type { ToolSet } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import type { UIToolInvocation } from "ai";
import { useMemo } from "react";
import { ToolPart } from "./tool-part";

interface GetTestimonialsProps {
	part: UIToolInvocation<ToolSet["getTestimonials"]>;
}

export const GetTestimonials = ({ part }: GetTestimonialsProps) => {
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
			if (part.output.success && part.output.data) {
				const count = part.output.data.length;

				return (
					<div className="flex gap-2 items-center">
						<Badge variant="outline" className="bg-muted">
							{count} {count === 1 ? "testimonial" : "testimonials"}
						</Badge>
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
			const numItems = part.input.numItems || 10;
			return (
				<span className="text-xs">Fetching {numItems} testimonials...</span>
			);
		}

		return null;
	}, [part.output, part.input]);

	return (
		<ToolPart
			className="justify-start"
			status={status}
			toolName="Get Testimonials"
		>
			{message}
		</ToolPart>
	);
};
