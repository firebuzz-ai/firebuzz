"use client";

import { Label } from "@firebuzz/ui/components/ui/label";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import { Info } from "@firebuzz/ui/icons/lucide";
import { useDebounce } from "@uidotdev/usehooks";
import { memo, useEffect, useState } from "react";
import type { useDesignModeElement } from "@/components/providers/agent/design-mode";

interface TextElementContentProps {
	elementId: string;
	textContent: string | null | undefined;
	isTextEditable: boolean | undefined;
	updateElement: ReturnType<typeof useDesignModeElement>["updateElement"];
}

export const TextElementContent = memo(
	({
		elementId,
		textContent,
		isTextEditable,
		updateElement,
	}: TextElementContentProps) => {
		const [localText, setLocalText] = useState(textContent || "");
		const debouncedText = useDebounce(localText, 300);

		// Update Convex when debounced value changes
		useEffect(() => {
			if (debouncedText !== textContent) {
				updateElement(elementId, {
					textContent: debouncedText,
				});
			}
		}, [debouncedText, elementId, textContent, updateElement]);

		return (
			<div className="px-2 py-4 space-y-3 border-b">
				<h3 className="text-sm font-medium text-muted-foreground">Content</h3>

				{/* Show warning if text is not editable */}
				{isTextEditable === false && (
					<div className="flex gap-2 p-2 text-xs rounded-md bg-muted text-muted-foreground">
						<Info className="size-4 flex-shrink-0 mt-0.5" />
						<p>
							Text content is defined as a variable or expression in the code
							and cannot be edited directly in design mode.
						</p>
					</div>
				)}

				<div className="space-y-1.5">
					<Label className="text-xs text-muted-foreground">Text Content</Label>
					<Textarea
						value={localText}
						onChange={(e) => setLocalText(e.target.value)}
						placeholder="Enter text..."
						className="min-h-[100px] bg-muted"
						rows={4}
						disabled={isTextEditable === false}
					/>
				</div>
			</div>
		);
	},
);

TextElementContent.displayName = "TextElementContent";
