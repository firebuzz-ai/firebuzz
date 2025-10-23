"use client";

import { Input } from "@firebuzz/ui/components/ui/input";
import { Label } from "@firebuzz/ui/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@firebuzz/ui/components/ui/select";
import { Info } from "@firebuzz/ui/icons/lucide";
import { useDebounce } from "@uidotdev/usehooks";
import { memo, useEffect, useState } from "react";
import type { useDesignModeElement } from "@/components/providers/agent/design-mode";

interface LinkElementContentProps {
	elementId: string;
	href: string | undefined;
	target: string | undefined;
	rel: string | undefined;
	isLinkEditable: boolean | undefined;
	updateElement: ReturnType<typeof useDesignModeElement>["updateElement"];
}

export const LinkElementContent = memo(
	({
		elementId,
		href,
		target,
		rel,
		isLinkEditable,
		updateElement,
	}: LinkElementContentProps) => {
		const [localHref, setLocalHref] = useState(href || "");
		const [localRel, setLocalRel] = useState(rel || "");
		const debouncedHref = useDebounce(localHref, 300);
		const debouncedRel = useDebounce(localRel, 300);

		// Update Convex when debounced href value changes
		useEffect(() => {
			if (debouncedHref !== href) {
				updateElement(elementId, {
					href: debouncedHref,
				});
			}
		}, [debouncedHref, elementId, href, updateElement]);

		// Update Convex when debounced rel value changes
		useEffect(() => {
			if (debouncedRel !== rel) {
				updateElement(elementId, {
					rel: debouncedRel,
				});
			}
		}, [debouncedRel, elementId, rel, updateElement]);

		return (
			<div className="px-2 py-4 space-y-3 border-b">
				<h3 className="text-sm font-medium text-muted-foreground">Content</h3>

				{/* Show warning if link is not editable */}
				{isLinkEditable === false && (
					<div className="flex gap-2 p-2 text-xs rounded-md bg-muted text-muted-foreground">
						<Info className="size-4 flex-shrink-0 mt-0.5" />
						<p>
							Link attributes are defined as variables in the code and cannot be
							edited directly in design mode.
						</p>
					</div>
				)}

				<div className="space-y-3">
					{/* Href Input */}
					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">URL</Label>
						<Input
							value={localHref}
							onChange={(e) => setLocalHref(e.target.value)}
							placeholder="https://..."
							className="h-8 bg-muted"
							disabled={isLinkEditable === false}
						/>
					</div>

					{/* Target Select */}
					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">Target</Label>
						<Select
							value={target || "_self"}
							onValueChange={(val) => {
								updateElement(elementId, { target: val });
							}}
							disabled={isLinkEditable === false}
						>
							<SelectTrigger className="h-8 bg-muted">
								<SelectValue placeholder="Select target" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="_self">Same Window</SelectItem>
								<SelectItem value="_blank">New Window</SelectItem>
								<SelectItem value="_parent">Parent Frame</SelectItem>
								<SelectItem value="_top">Top Frame</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Rel Input */}
					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">Rel</Label>
						<Input
							value={localRel}
							onChange={(e) => setLocalRel(e.target.value)}
							placeholder="nofollow, noopener, noreferrer..."
							className="h-8 bg-muted"
							disabled={isLinkEditable === false}
						/>
						<p className="text-xs text-muted-foreground">
							Common values: nofollow, noopener, noreferrer
						</p>
					</div>
				</div>
			</div>
		);
	},
);

LinkElementContent.displayName = "LinkElementContent";
