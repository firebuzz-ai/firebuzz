"use client";

import { envCloudflarePublic } from "@firebuzz/env";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Label } from "@firebuzz/ui/components/ui/label";
import { ScrollArea } from "@firebuzz/ui/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@firebuzz/ui/components/ui/select";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import { Info } from "@firebuzz/ui/icons/lucide";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePreview } from "@/components/reusables/image-preview";
import { ImageSelect } from "@/components/reusables/image-select";
import { useDesignModeElement } from "@/components/providers/agent/design-mode";
import { parseClassName, updateClassName } from "@/lib/design-mode/class-utils";

import { AppearanceControls } from "./controls/appearance-controls";
import { BorderControls } from "./controls/border-controls";
import { ColorControls } from "./controls/color-controls";
import { LayoutControls } from "./controls/layout-controls";
import { SizeControls } from "./controls/size-controls";
import { SpacingControls } from "./controls/spacing-controls";
import { TypographyControls } from "./controls/typography-controls";
import { MonacoTailwindEditor } from "./monaco-tailwind-editor";

export const ElementEditorContent = () => {
	const { selectedElement, updateElement } = useDesignModeElement();
	const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();

	const [className, setClassName] = useState(selectedElement?.className || "");
	const [textContent, setTextContent] = useState(
		selectedElement?.textContent || "",
	);
	const [src, setSrc] = useState(selectedElement?.src || "");
	const [alt, setAlt] = useState(selectedElement?.alt || "");
	const [href, setHref] = useState(selectedElement?.href || "");
	const [target, setTarget] = useState(selectedElement?.target || "");
	const [rel, setRel] = useState(selectedElement?.rel || "");

	// Track last selected element ID to detect when a NEW element is selected
	const lastElementIdRef = useRef<string | null>(null);
	const selectedElementIdRef = useRef<string | null>(null);

	// Update local state ONLY when a NEW element is selected, not on every selectedElement change
	useEffect(() => {
		if (
			selectedElement &&
			selectedElement.elementId !== lastElementIdRef.current
		) {
			// New element selected - reset local state
			setClassName(selectedElement.className);
			setTextContent(selectedElement.textContent || "");
			setSrc(selectedElement.src || "");
			setAlt(selectedElement.alt || "");
			setHref(selectedElement.href || "");
			setTarget(selectedElement.target || "");
			setRel(selectedElement.rel || "");
			lastElementIdRef.current = selectedElement.elementId;
			selectedElementIdRef.current = selectedElement.elementId;
		} else if (!selectedElement) {
			// Element deselected - reset
			lastElementIdRef.current = null;
			selectedElementIdRef.current = null;
		}
	}, [selectedElement]);

	// Real-time update function (no debouncing here - updateElement handles it internally)
	const handleRealtimeUpdate = useCallback(
		(updates: {
			className?: string;
			textContent?: string;
			src?: string;
			alt?: string;
			href?: string;
			target?: string;
			rel?: string;
		}) => {
			const currentElementId = selectedElementIdRef.current;
			if (!currentElementId) return;

			// Call updateElement immediately - it handles:
			// 1. Immediate iframe update (real-time visual feedback)
			// 2. Debounced database mutation (performance optimization)
			updateElement(currentElementId, updates);
		},
		[updateElement],
	);

	if (!selectedElement) {
		return null;
	}

	const isImage = selectedElement.tagName === "IMG";
	const isLink = selectedElement.tagName === "A";
	const isTextElement =
		!isImage &&
		!isLink &&
		selectedElement.textContent !== undefined &&
		selectedElement.textContent !== null;

	// Parse current classes
	const parsedClasses = parseClassName(className);

	// Helper to update classes from control components
	const handleClassUpdate = (updates: Partial<typeof parsedClasses>) => {
		const newClassName = updateClassName(className, updates);
		setClassName(newClassName);
		handleRealtimeUpdate({ className: newClassName });
	};

	return (
		<div className="flex flex-col h-full">
			{/* Content */}
			<ScrollArea className="flex-1">
				<div className="">
					{/* Content Section - Images */}
					{isImage && (
						<div className="px-2 py-4 space-y-3 border-b">
							<h3 className="text-sm font-medium text-muted-foreground">
								Content
							</h3>

							{/* Show warning if image is not editable */}
							{selectedElement.isImageEditable === false && (
								<div className="flex gap-2 p-2 text-xs rounded-md bg-muted text-muted-foreground">
									<Info className="size-4 flex-shrink-0 mt-0.5" />
									<p>
										Image source and alt text are defined as variables in the
										code and cannot be edited directly in design mode.
									</p>
								</div>
							)}

							<div className="space-y-3">
								{/* Image Selector/Preview */}
								<div className="space-y-1.5">
									<Label className="text-xs text-muted-foreground">Image</Label>
									{!src && selectedElement.isImageEditable !== false ? (
										<ImageSelect
											onChange={(url) => {
												const fullUrl = `${NEXT_PUBLIC_R2_PUBLIC_URL}/${url}`;
												setSrc(fullUrl);
												handleRealtimeUpdate({ src: fullUrl });
											}}
										/>
									) : src ? (
										<ImagePreview
											src={src}
											handleDeselect={() => {
												setSrc("");
												handleRealtimeUpdate({ src: "" });
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
									<Label className="text-xs text-muted-foreground">
										Alt Text
									</Label>
									<Input
										value={alt}
										onChange={(e) => {
											const newValue = e.target.value;
											setAlt(newValue);
											handleRealtimeUpdate({ alt: newValue });
										}}
										placeholder="Image description..."
										className="h-8 bg-muted"
										disabled={selectedElement.isImageEditable === false}
									/>
								</div>
							</div>
						</div>
					)}

					{/* Content Section - Links */}
					{isLink && (
						<div className="px-2 py-4 space-y-3 border-b">
							<h3 className="text-sm font-medium text-muted-foreground">
								Content
							</h3>

							{/* Show warning if link is not editable */}
							{selectedElement.isLinkEditable === false && (
								<div className="flex gap-2 p-2 text-xs rounded-md bg-muted text-muted-foreground">
									<Info className="size-4 flex-shrink-0 mt-0.5" />
									<p>
										Link attributes are defined as variables in the code and
										cannot be edited directly in design mode.
									</p>
								</div>
							)}

							<div className="space-y-3">
								{/* Href Input */}
								<div className="space-y-1.5">
									<Label className="text-xs text-muted-foreground">URL</Label>
									<Input
										value={href}
										onChange={(e) => {
											const newValue = e.target.value;
											setHref(newValue);
											handleRealtimeUpdate({ href: newValue });
										}}
										placeholder="https://..."
										className="h-8 bg-muted"
										disabled={selectedElement.isLinkEditable === false}
									/>
								</div>

								{/* Target Select */}
								<div className="space-y-1.5">
									<Label className="text-xs text-muted-foreground">
										Target
									</Label>
									<Select
										value={target || "_self"}
										onValueChange={(val) => {
											setTarget(val);
											handleRealtimeUpdate({ target: val });
										}}
										disabled={selectedElement.isLinkEditable === false}
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
										value={rel}
										onChange={(e) => {
											const newValue = e.target.value;
											setRel(newValue);
											handleRealtimeUpdate({ rel: newValue });
										}}
										placeholder="nofollow, noopener, noreferrer..."
										className="h-8 bg-muted"
										disabled={selectedElement.isLinkEditable === false}
									/>
									<p className="text-xs text-muted-foreground">
										Common values: nofollow, noopener, noreferrer
									</p>
								</div>
							</div>
						</div>
					)}

					{/* Content Section - Text */}
					{isTextElement && (
						<div className="px-2 py-4 space-y-3 border-b">
							<h3 className="text-sm font-medium text-muted-foreground">
								Content
							</h3>

							{/* Show warning if text is not editable */}
							{selectedElement.isTextEditable === false && (
								<div className="flex gap-2 p-2 text-xs rounded-md bg-muted text-muted-foreground">
									<Info className="size-4 flex-shrink-0 mt-0.5" />
									<p>
										Text content is defined as a variable or expression in the
										code and cannot be edited directly in design mode.
									</p>
								</div>
							)}

							<div className="space-y-1.5">
								<Label className="text-xs text-muted-foreground">
									Text Content
								</Label>
								<Textarea
									value={textContent}
									onChange={(e) => {
										const newValue = e.target.value;
										setTextContent(newValue);
										handleRealtimeUpdate({ textContent: newValue });
									}}
									placeholder="Enter text..."
									className="min-h-[100px] bg-muted"
									rows={4}
									disabled={selectedElement.isTextEditable === false}
								/>
							</div>
						</div>
					)}

					{/* Typography Section */}
					<div className="px-2 py-4 space-y-3 border-b">
						<h3 className="text-sm font-medium text-muted-foreground">
							Typography
						</h3>
						<TypographyControls
							value={{
								fontFamily: parsedClasses.fontFamily,
								fontSize: parsedClasses.fontSize,
								fontWeight: parsedClasses.fontWeight,
								lineHeight: parsedClasses.lineHeight,
								letterSpacing: parsedClasses.letterSpacing,
								textAlign: parsedClasses.textAlign,
								textDecoration: parsedClasses.textDecoration,
								fontStyle: parsedClasses.fontStyle,
							}}
							onChange={(updates) => handleClassUpdate(updates)}
						/>
					</div>

					{/* Color Section */}
					<div className="px-2 py-4 space-y-3 border-b">
						<h3 className="text-sm font-medium text-muted-foreground">
							Colors
						</h3>
						<ColorControls
							textColor={parsedClasses.textColor}
							backgroundColor={parsedClasses.backgroundColor}
							onTextColorChange={(color) =>
								handleClassUpdate({ textColor: color })
							}
							onBackgroundColorChange={(color) =>
								handleClassUpdate({ backgroundColor: color })
							}
						/>
					</div>

					{/* Layout Section */}
					<div className="px-2 py-4 space-y-3 border-b">
						<h3 className="text-sm font-medium text-muted-foreground">
							Layout
						</h3>
						<LayoutControls
							value={{
								display: parsedClasses.display,
								flexDirection: parsedClasses.flexDirection,
								justifyContent: parsedClasses.justifyContent,
								alignItems: parsedClasses.alignItems,
								gap: parsedClasses.gap,
								gridCols: parsedClasses.gridCols,
								gridRows: parsedClasses.gridRows,
								spaceX: parsedClasses.spaceX,
								spaceY: parsedClasses.spaceY,
							}}
							onChange={(updates) => handleClassUpdate(updates)}
						/>
					</div>

					{/* Size Section */}
					<div className="px-2 py-4 space-y-3 border-b">
						<h3 className="text-sm font-medium text-muted-foreground">Size</h3>
						<SizeControls
							value={{
								width: parsedClasses.width,
								height: parsedClasses.height,
								minWidth: parsedClasses.minWidth,
								maxWidth: parsedClasses.maxWidth,
								minHeight: parsedClasses.minHeight,
								maxHeight: parsedClasses.maxHeight,
							}}
							onChange={(updates) => handleClassUpdate(updates)}
						/>
					</div>

					{/* Spacing Section */}
					<div className="px-2 py-4 space-y-3 border-b">
						<h3 className="text-sm font-medium text-muted-foreground">
							Spacing
						</h3>
						<SpacingControls
							value={{
								marginTop: parsedClasses.marginTop,
								marginRight: parsedClasses.marginRight,
								marginBottom: parsedClasses.marginBottom,
								marginLeft: parsedClasses.marginLeft,
								paddingTop: parsedClasses.paddingTop,
								paddingRight: parsedClasses.paddingRight,
								paddingBottom: parsedClasses.paddingBottom,
								paddingLeft: parsedClasses.paddingLeft,
								marginX: parsedClasses.marginX,
								marginY: parsedClasses.marginY,
								paddingX: parsedClasses.paddingX,
								paddingY: parsedClasses.paddingY,
								margin: parsedClasses.margin,
								padding: parsedClasses.padding,
							}}
							onChange={(updates) => handleClassUpdate(updates)}
						/>
					</div>

					{/* Border Section */}
					<div className="px-2 py-4 space-y-3 border-b">
						<h3 className="text-sm font-medium text-muted-foreground">
							Border
						</h3>
						<BorderControls
							value={{
								borderWidth: parsedClasses.borderWidth,
								borderXWidth: parsedClasses.borderXWidth,
								borderYWidth: parsedClasses.borderYWidth,
								borderTopWidth: parsedClasses.borderTopWidth,
								borderRightWidth: parsedClasses.borderRightWidth,
								borderBottomWidth: parsedClasses.borderBottomWidth,
								borderLeftWidth: parsedClasses.borderLeftWidth,
								borderStyle: parsedClasses.borderStyle,
								borderColor: parsedClasses.borderColor,
								borderRadius: parsedClasses.borderRadius,
							}}
							onChange={(updates) => handleClassUpdate(updates)}
						/>
					</div>

					{/* Appearance Section */}
					<div className="px-2 py-4 space-y-3 border-b">
						<h3 className="text-sm font-medium text-muted-foreground">
							Appearance
						</h3>
						<AppearanceControls
							value={{
								opacity: parsedClasses.opacity,
								shadow: parsedClasses.shadow,
							}}
							onChange={(updates) => handleClassUpdate(updates)}
						/>
					</div>

					{/* Advanced Section */}
					<div className="px-2 py-4 space-y-3">
						<h3 className="text-sm font-medium text-muted-foreground">
							Advanced
						</h3>
						<div className="space-y-1.5">
							<Label
								htmlFor="className"
								className="text-xs text-muted-foreground"
							>
								Tailwind Classes
							</Label>
							<MonacoTailwindEditor
								value={className}
								onChange={(newValue) => {
									setClassName(newValue);
									handleRealtimeUpdate({ className: newValue });
								}}
								placeholder="Enter Tailwind classes..."
							/>
							<p className="text-xs text-muted-foreground">
								Space-separated Tailwind classes with autocomplete
							</p>
						</div>
					</div>
				</div>
			</ScrollArea>
		</div>
	);
};
