"use client";

import { useDesignMode } from "@/hooks/agent/use-design-mode";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Label } from "@firebuzz/ui/components/ui/label";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@firebuzz/ui/components/ui/tabs";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import {
	Code,
	Database,
	Image as ImageIcon,
	Save,
	Type,
	X,
} from "@firebuzz/ui/icons/lucide";
import { useCallback, useEffect, useRef, useState } from "react";

export const ElementEditor = () => {
	const {
		selectedElement,
		updateElement,
		hasUnsavedChanges: hasUnsavedFileChanges,
		saveChangesToFiles,
		isLoading,
	} = useDesignMode();

	const [className, setClassName] = useState(
		selectedElement?.className || "",
	);
	const [textContent, setTextContent] = useState(
		selectedElement?.textContent || "",
	);
	const [src, setSrc] = useState(selectedElement?.src || "");
	const [alt, setAlt] = useState(selectedElement?.alt || "");

	// Track last selected element ID to detect when a NEW element is selected
	const lastElementIdRef = useRef<string | null>(null);

	// Update local state ONLY when a NEW element is selected, not on every selectedElement change
	useEffect(() => {
		if (selectedElement && selectedElement.elementId !== lastElementIdRef.current) {
			// New element selected - reset local state
			setClassName(selectedElement.className);
			setTextContent(selectedElement.textContent || "");
			setSrc(selectedElement.src || "");
			setAlt(selectedElement.alt || "");
			lastElementIdRef.current = selectedElement.elementId;
		} else if (!selectedElement) {
			// Element deselected - reset
			lastElementIdRef.current = null;
		}
	}, [selectedElement]);

	const hasUnsavedChanges = selectedElement
		? className !== selectedElement.className ||
			textContent !== (selectedElement.textContent || "") ||
			src !== (selectedElement.src || "") ||
			alt !== (selectedElement.alt || "")
		: false;

	// Real-time update function (no debouncing - pure real-time like Lovable)
	const handleRealtimeUpdate = useCallback(
		(updates: {
			className?: string;
			textContent?: string;
			src?: string;
			alt?: string;
		}) => {
			if (!selectedElement) return;
			updateElement(selectedElement.elementId, updates);
		},
		[selectedElement, updateElement],
	);

	const handleApplyChanges = async () => {
		if (!selectedElement) return;

		const updates: {
			className?: string;
			textContent?: string;
			src?: string;
			alt?: string;
		} = {};

		if (className !== selectedElement.className) {
			updates.className = className;
		}
		if (textContent !== (selectedElement.textContent || "")) {
			updates.textContent = textContent;
		}
		if (src !== (selectedElement.src || "")) {
			updates.src = src;
		}
		if (alt !== (selectedElement.alt || "")) {
			updates.alt = alt;
		}

		if (Object.keys(updates).length > 0) {
			await updateElement(selectedElement.elementId, updates);
		}
	};

	const handleReset = () => {
		if (selectedElement) {
			setClassName(selectedElement.className);
			setTextContent(selectedElement.textContent || "");
			setSrc(selectedElement.src || "");
			setAlt(selectedElement.alt || "");
		}
	};

	if (isLoading) {
		return (
			<div className="flex flex-col h-full p-4">
				<p className="text-sm text-muted-foreground">Loading...</p>
			</div>
		);
	}

	if (!selectedElement) {
		return (
			<div className="flex flex-col h-full p-4 items-center justify-center">
				<div className="text-center space-y-2">
					<p className="text-sm font-medium">No Element Selected</p>
					<p className="text-xs text-muted-foreground">
						Enable design mode and click on an element in the preview to edit
						it.
					</p>
				</div>
			</div>
		);
	}

	const isImage = selectedElement.tagName === "IMG";
	const isTextElement = !isImage && selectedElement.textContent;

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="p-4 border-b">
				<div className="flex items-center justify-between mb-2">
					<h3 className="text-sm font-semibold">Element Editor</h3>
				</div>
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<Code className="size-3" />
					<span className="font-mono">{selectedElement.tagName}</span>
					<Separator orientation="vertical" className="h-3" />
					<span className="truncate">{selectedElement.sourcePath}</span>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				<Tabs defaultValue="styles" className="w-full">
					<TabsList className="w-full">
						<TabsTrigger value="styles" className="flex-1">
							Styles
						</TabsTrigger>
						<TabsTrigger value="content" className="flex-1">
							Content
						</TabsTrigger>
					</TabsList>

					<TabsContent value="styles" className="space-y-4 mt-4">
						<div className="space-y-2">
							<Label htmlFor="className" className="text-xs">
								Class Name
							</Label>
							<Textarea
								id="className"
								value={className}
								onChange={(e) => {
									const newValue = e.target.value;
									setClassName(newValue);
									handleRealtimeUpdate({ className: newValue });
								}}
								placeholder="Enter Tailwind classes..."
								className="font-mono text-xs min-h-[100px]"
							/>
							<p className="text-xs text-muted-foreground">
								Space-separated Tailwind classes
							</p>
						</div>
					</TabsContent>

					<TabsContent value="content" className="space-y-4 mt-4">
						{isImage ? (
							<>
								<div className="space-y-2">
									<Label htmlFor="src" className="text-xs flex items-center gap-1">
										<ImageIcon className="size-3" />
										Image Source
									</Label>
									<Input
										id="src"
										value={src}
										onChange={(e) => {
											const newValue = e.target.value;
											setSrc(newValue);
											handleRealtimeUpdate({ src: newValue });
										}}
										placeholder="https://..."
										className="text-xs"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="alt" className="text-xs">
										Alt Text
									</Label>
									<Input
										id="alt"
										value={alt}
										onChange={(e) => {
											const newValue = e.target.value;
											setAlt(newValue);
											handleRealtimeUpdate({ alt: newValue });
										}}
										placeholder="Image description..."
										className="text-xs"
									/>
								</div>
							</>
						) : isTextElement ? (
							<div className="space-y-2">
								<Label htmlFor="textContent" className="text-xs flex items-center gap-1">
									<Type className="size-3" />
									Text Content
								</Label>
								<Textarea
									id="textContent"
									value={textContent}
									onChange={(e) => {
										const newValue = e.target.value;
										setTextContent(newValue);
										handleRealtimeUpdate({ textContent: newValue });
									}}
									placeholder="Enter text..."
									className="text-xs min-h-[100px]"
								/>
							</div>
						) : (
							<p className="text-xs text-muted-foreground">
								This element has no editable content.
							</p>
						)}
					</TabsContent>
				</Tabs>
			</div>

			{/* Footer Actions */}
			<div className="p-4 border-t space-y-2">
				<Button
					onClick={handleApplyChanges}
					disabled={!hasUnsavedChanges}
					className="w-full"
					size="sm"
				>
					<Save className="size-3 mr-2" />
					Apply Changes
				</Button>
				<Button
					onClick={handleReset}
					disabled={!hasUnsavedChanges}
					variant="outline"
					className="w-full"
					size="sm"
				>
					<X className="size-3 mr-2" />
					Reset
				</Button>

				{/* Save to File Button */}
				{hasUnsavedFileChanges && (
					<Button
						onClick={async () => {
							try {
								console.log("[Element Editor] Saving changes to files...");
								await saveChangesToFiles();
								console.log("[Element Editor] Changes saved successfully");
							} catch (error) {
								console.error("[Element Editor] Failed to save changes:", error);
							}
						}}
						variant="default"
						className="w-full"
						size="sm"
					>
						<Database className="size-3 mr-2" />
						Save to File
					</Button>
				)}
			</div>
		</div>
	);
};
