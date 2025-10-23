"use client";

import { Button } from "@firebuzz/ui/components/ui/button";
import { Label } from "@firebuzz/ui/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@firebuzz/ui/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Lock, Scan, Unlock } from "@firebuzz/ui/icons/lucide";
import { useState } from "react";
import { extractSpacingValue } from "@/lib/design-mode/class-utils";
import {
	BORDER_RADIUS_OPTIONS,
	BORDER_STYLE_OPTIONS,
	BORDER_WIDTH_OPTIONS,
} from "@/lib/design-mode/tailwind-mappings";
import { SingleColorControl } from "./single-color-control";

export interface BorderValues {
	borderWidth?: string;
	borderXWidth?: string;
	borderYWidth?: string;
	borderTopWidth?: string;
	borderRightWidth?: string;
	borderBottomWidth?: string;
	borderLeftWidth?: string;
	borderStyle?: string;
	borderColor?: string;
	borderRadius?: string;
}

export interface BorderControlsProps {
	value: BorderValues;
	onChange: (updates: Partial<BorderValues>) => void;
}

type ViewMode = "axis" | "all-sides" | "lock";

export const BorderControls = ({ value, onChange }: BorderControlsProps) => {
	const [widthViewMode, setWidthViewMode] = useState<ViewMode>("axis");

	// Helper to determine current values based on view mode
	const getWidthValues = () => {
		if (widthViewMode === "lock") {
			const val = extractSpacingValue(value.borderWidth);
			return { all: val };
		}
		if (widthViewMode === "axis") {
			const x = extractSpacingValue(value.borderXWidth);
			const y = extractSpacingValue(value.borderYWidth);
			return { horizontal: x, vertical: y };
		}
		return {
			top: extractSpacingValue(value.borderTopWidth),
			right: extractSpacingValue(value.borderRightWidth),
			bottom: extractSpacingValue(value.borderBottomWidth),
			left: extractSpacingValue(value.borderLeftWidth),
		};
	};

	// Handlers for width changes
	const handleWidthChange = (field: string, val: string) => {
		if (widthViewMode === "lock") {
			// Clear all individual/axis width classes, set unified
			onChange({
				borderWidth: val,
				borderXWidth: undefined,
				borderYWidth: undefined,
				borderTopWidth: undefined,
				borderRightWidth: undefined,
				borderBottomWidth: undefined,
				borderLeftWidth: undefined,
			});
		} else if (widthViewMode === "axis") {
			// Clear unified and individual, set axis
			onChange({
				borderWidth: undefined,
				borderTopWidth: undefined,
				borderRightWidth: undefined,
				borderBottomWidth: undefined,
				borderLeftWidth: undefined,
				[field]: val,
			});
		} else {
			// Clear unified and axis, set individual
			onChange({
				borderWidth: undefined,
				borderXWidth: undefined,
				borderYWidth: undefined,
				[field]: val,
			});
		}
	};

	// Toggle handlers
	const toggleWidthExpand = () => {
		if (widthViewMode === "axis") {
			setWidthViewMode("all-sides");
		} else if (widthViewMode === "all-sides") {
			setWidthViewMode("axis");
		}
	};

	const toggleWidthLock = () => {
		if (widthViewMode === "lock") {
			setWidthViewMode("axis");
		} else {
			setWidthViewMode("lock");
		}
	};

	const widthValues = getWidthValues();

	return (
		<div className="space-y-4">
			{/* Border Width */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<Label className="text-xs text-muted-foreground">Width</Label>
					<div className="flex items-center gap-0.5">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={toggleWidthExpand}
									className="h-6 w-6 p-0"
									disabled={widthViewMode === "lock"}
								>
									<Scan className="size-3" />
								</Button>
							</TooltipTrigger>
							<TooltipContent side="top">
								<p className="text-xs">
									{widthViewMode === "axis" ? "Show all sides" : "Show axis"}
								</p>
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={toggleWidthLock}
									className="h-6 w-6 p-0"
								>
									{widthViewMode === "lock" ? (
										<Lock className="size-3" />
									) : (
										<Unlock className="size-3" />
									)}
								</Button>
							</TooltipTrigger>
							<TooltipContent side="top">
								<p className="text-xs">
									{widthViewMode === "lock" ? "Unlock sides" : "Lock all sides"}
								</p>
							</TooltipContent>
						</Tooltip>
					</div>
				</div>

				{widthViewMode === "lock" && (
					<Select
						value={widthValues.all}
						onValueChange={(val) => handleWidthChange("borderWidth", val)}
					>
						<SelectTrigger className="h-8 bg-muted">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{BORDER_WIDTH_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}

				{widthViewMode === "axis" && (
					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">
								Horizontal
							</Label>
							<Select
								value={widthValues.horizontal}
								onValueChange={(val) => handleWidthChange("borderXWidth", val)}
							>
								<SelectTrigger className="h-8 bg-muted">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{BORDER_WIDTH_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">Vertical</Label>
							<Select
								value={widthValues.vertical}
								onValueChange={(val) => handleWidthChange("borderYWidth", val)}
							>
								<SelectTrigger className="h-8 bg-muted">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{BORDER_WIDTH_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				)}

				{widthViewMode === "all-sides" && (
					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">Top</Label>
							<Select
								value={widthValues.top}
								onValueChange={(val) =>
									handleWidthChange("borderTopWidth", val)
								}
							>
								<SelectTrigger className="h-8 bg-muted">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{BORDER_WIDTH_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">Right</Label>
							<Select
								value={widthValues.right}
								onValueChange={(val) =>
									handleWidthChange("borderRightWidth", val)
								}
							>
								<SelectTrigger className="h-8 bg-muted">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{BORDER_WIDTH_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">Bottom</Label>
							<Select
								value={widthValues.bottom}
								onValueChange={(val) =>
									handleWidthChange("borderBottomWidth", val)
								}
							>
								<SelectTrigger className="h-8 bg-muted">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{BORDER_WIDTH_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">Left</Label>
							<Select
								value={widthValues.left}
								onValueChange={(val) =>
									handleWidthChange("borderLeftWidth", val)
								}
							>
								<SelectTrigger className="h-8 bg-muted">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{BORDER_WIDTH_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				)}
			</div>

			{/* Border Style */}
			<div className="space-y-1.5">
				<Label className="text-xs text-muted-foreground">Style</Label>
				<Select
					value={value.borderStyle || ""}
					onValueChange={(val) => onChange({ borderStyle: val })}
				>
					<SelectTrigger className="h-8 bg-muted">
						<SelectValue placeholder="Default" />
					</SelectTrigger>
					<SelectContent>
						{BORDER_STYLE_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Border Color */}
			<SingleColorControl
				label="Color"
				color={value.borderColor}
				onChange={(color) => onChange({ borderColor: color })}
				classPrefix="border"
			/>

			{/* Border Radius */}
			<div className="space-y-1.5">
				<Label className="text-xs text-muted-foreground">Radius</Label>
				<Select
					value={value.borderRadius || ""}
					onValueChange={(val) => onChange({ borderRadius: val })}
				>
					<SelectTrigger className="h-8 bg-muted">
						<SelectValue placeholder="Default" />
					</SelectTrigger>
					<SelectContent>
						{BORDER_RADIUS_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
};
