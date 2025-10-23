"use client";

import { Label } from "@firebuzz/ui/components/ui/label";
import { ScrollArea } from "@firebuzz/ui/components/ui/scroll-area";
import { useDesignModeElement } from "@/components/providers/agent/design-mode";
import { parseClassName, updateClassName } from "@/lib/design-mode/class-utils";

import { AppearanceControls } from "./controls/appearance-controls";
import { BorderControls } from "./controls/border-controls";
import { ColorControls } from "./controls/color-controls";
import { LayoutControls } from "./controls/layout-controls";
import { SizeControls } from "./controls/size-controls";
import { SpacingControls } from "./controls/spacing-controls";
import { TypographyControls } from "./controls/typography-controls";
import { ImageElementContent } from "./element-content/image-element-content";
import { LinkElementContent } from "./element-content/link-element-content";
import { TextElementContent } from "./element-content/text-element-content";
import { MonacoTailwindEditor } from "./monaco-tailwind-editor";

export const ElementEditorContent = () => {
	const { selectedElement, updateElement } = useDesignModeElement();

	if (!selectedElement) {
		return null;
	}

	// Parse current classes directly from Convex state
	const parsedClasses = parseClassName(selectedElement.className);

	// Helper to update classes from control components
	const handleClassUpdate = (updates: Partial<typeof parsedClasses>) => {
		const newClassName = updateClassName(selectedElement.className, updates);

		// Don't update if className hasn't changed
		if (newClassName === selectedElement.className) {
			return;
		}

		updateElement(selectedElement.elementId, { className: newClassName });
	};

	const isImage = selectedElement.tagName === "IMG";
	const isLink = selectedElement.tagName === "A";
	const isTextElement =
		!isImage &&
		!isLink &&
		selectedElement.textContent !== undefined &&
		selectedElement.textContent !== null;

	return (
		<div className="flex flex-col h-full">
			{/* Content */}
			<ScrollArea className="flex-1">
				<div className="">
					{/* Content Section - Images */}
					{isImage && (
						<ImageElementContent
							key={selectedElement.elementId}
							elementId={selectedElement.elementId}
							src={selectedElement.src}
							alt={selectedElement.alt}
							isImageEditable={selectedElement.isImageEditable}
							updateElement={updateElement}
						/>
					)}

					{/* Content Section - Links */}
					{isLink && (
						<LinkElementContent
							key={selectedElement.elementId}
							elementId={selectedElement.elementId}
							href={selectedElement.href}
							target={selectedElement.target}
							rel={selectedElement.rel}
							isLinkEditable={selectedElement.isLinkEditable}
							updateElement={updateElement}
						/>
					)}

					{/* Content Section - Text */}
					{isTextElement && (
						<TextElementContent
							key={selectedElement.elementId}
							elementId={selectedElement.elementId}
							textContent={selectedElement.textContent}
							isTextEditable={selectedElement.isTextEditable}
							updateElement={updateElement}
						/>
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
								key={selectedElement.elementId}
								value={selectedElement.className}
								onChange={(newValue) => {
									updateElement(selectedElement.elementId, {
										className: newValue,
									});
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
