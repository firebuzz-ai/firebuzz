"use client";

import { envCloudflarePublic } from "@firebuzz/env";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Label } from "@firebuzz/ui/components/ui/label";
import { Info } from "@firebuzz/ui/icons/lucide";
import { useDebounce } from "@uidotdev/usehooks";
import { memo, useEffect, useState } from "react";
import type { useDesignModeElement } from "@/components/providers/agent/design-mode";
import { ImagePreview } from "@/components/reusables/image-preview";
import { ImageSelect } from "@/components/reusables/image-select";

interface ImageElementContentProps {
	elementId: string;
	src: string | undefined;
	alt: string | undefined;
	isImageEditable: boolean | undefined;
	updateElement: ReturnType<typeof useDesignModeElement>["updateElement"];
}

export const ImageElementContent = memo(
	({
		elementId,
		src,
		alt,
		isImageEditable,
		updateElement,
	}: ImageElementContentProps) => {
		const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();
		const [localAlt, setLocalAlt] = useState(alt || "");
		const debouncedAlt = useDebounce(localAlt, 300);

		// Update Convex when debounced alt value changes
		useEffect(() => {
			if (debouncedAlt !== alt) {
				updateElement(elementId, {
					alt: debouncedAlt,
				});
			}
		}, [debouncedAlt, elementId, alt, updateElement]);

		return (
			<div className="px-2 py-4 space-y-3 border-b">
				<h3 className="text-sm font-medium text-muted-foreground">Content</h3>

				{/* Show warning if image is not editable */}
				{isImageEditable === false && (
					<div className="flex gap-2 p-2 text-xs rounded-md bg-muted text-muted-foreground">
						<Info className="size-4 flex-shrink-0 mt-0.5" />
						<p>
							Image source and alt text are defined as variables in the code and
							cannot be edited directly in design mode.
						</p>
					</div>
				)}

				<div className="space-y-3">
					{/* Image Selector/Preview */}
					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">Image</Label>
						{!src && isImageEditable !== false ? (
							<ImageSelect
								onChange={(url) => {
									const fullUrl = `${NEXT_PUBLIC_R2_PUBLIC_URL}/${url}`;
									updateElement(elementId, { src: fullUrl });
								}}
							/>
						) : src ? (
							<ImagePreview
								src={src}
								handleDeselect={() => {
									updateElement(elementId, { src: "" });
								}}
							/>
						) : (
							<p className="text-xs text-muted-foreground">
								Image cannot be changed in design mode
							</p>
						)}
					</div>

					{/* Alt Text Input */}
					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">Alt Text</Label>
						<Input
							value={localAlt}
							onChange={(e) => setLocalAlt(e.target.value)}
							placeholder="Image description..."
							className="h-8 bg-muted"
							disabled={isImageEditable === false}
						/>
					</div>
				</div>
			</div>
		);
	},
);

ImageElementContent.displayName = "ImageElementContent";
