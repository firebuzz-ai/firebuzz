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
	MARGIN_SPACING_OPTIONS,
	PADDING_SPACING_OPTIONS,
} from "@/lib/design-mode/tailwind-mappings";

export interface SpacingValues {
	marginTop?: string;
	marginRight?: string;
	marginBottom?: string;
	marginLeft?: string;
	paddingTop?: string;
	paddingRight?: string;
	paddingBottom?: string;
	paddingLeft?: string;
	marginX?: string;
	marginY?: string;
	paddingX?: string;
	paddingY?: string;
	margin?: string;
	padding?: string;
}

export interface SpacingControlsProps {
	value: SpacingValues;
	onChange: (updates: Partial<SpacingValues>) => void;
}

type ViewMode = "axis" | "all-sides" | "lock";

export const SpacingControls = ({ value, onChange }: SpacingControlsProps) => {
	const [marginViewMode, setMarginViewMode] = useState<ViewMode>("axis");
	const [paddingViewMode, setPaddingViewMode] = useState<ViewMode>("axis");

	// Helper to determine current values based on view mode
	const getMarginValues = () => {
		if (marginViewMode === "lock") {
			const val = extractSpacingValue(value.margin);
			return { all: val };
		}
		if (marginViewMode === "axis") {
			const x = extractSpacingValue(value.marginX);
			const y = extractSpacingValue(value.marginY);
			return { horizontal: x, vertical: y };
		}
		return {
			top: extractSpacingValue(value.marginTop),
			right: extractSpacingValue(value.marginRight),
			bottom: extractSpacingValue(value.marginBottom),
			left: extractSpacingValue(value.marginLeft),
		};
	};

	const getPaddingValues = () => {
		if (paddingViewMode === "lock") {
			const val = extractSpacingValue(value.padding);
			return { all: val };
		}
		if (paddingViewMode === "axis") {
			const x = extractSpacingValue(value.paddingX);
			const y = extractSpacingValue(value.paddingY);
			return { horizontal: x, vertical: y };
		}
		return {
			top: extractSpacingValue(value.paddingTop),
			right: extractSpacingValue(value.paddingRight),
			bottom: extractSpacingValue(value.paddingBottom),
			left: extractSpacingValue(value.paddingLeft),
		};
	};

	// Handlers for margin changes
	const handleMarginChange = (field: string, val: string) => {
		if (marginViewMode === "lock") {
			// Clear all individual/axis margin classes, set unified
			onChange({
				margin: val,
				marginX: undefined,
				marginY: undefined,
				marginTop: undefined,
				marginRight: undefined,
				marginBottom: undefined,
				marginLeft: undefined,
			});
		} else if (marginViewMode === "axis") {
			if (field === "horizontal") {
				onChange({
					marginX: val,
					margin: undefined,
					marginLeft: undefined,
					marginRight: undefined,
				});
			} else {
				onChange({
					marginY: val,
					margin: undefined,
					marginTop: undefined,
					marginBottom: undefined,
				});
			}
		} else {
			// all-sides mode
			onChange({
				[`margin${field.charAt(0).toUpperCase()}${field.slice(1)}`]: val,
				margin: undefined,
				marginX: undefined,
				marginY: undefined,
			});
		}
	};

	// Handlers for padding changes
	const handlePaddingChange = (field: string, val: string) => {
		if (paddingViewMode === "lock") {
			// Clear all individual/axis padding classes, set unified
			onChange({
				padding: val,
				paddingX: undefined,
				paddingY: undefined,
				paddingTop: undefined,
				paddingRight: undefined,
				paddingBottom: undefined,
				paddingLeft: undefined,
			});
		} else if (paddingViewMode === "axis") {
			if (field === "horizontal") {
				onChange({
					paddingX: val,
					padding: undefined,
					paddingLeft: undefined,
					paddingRight: undefined,
				});
			} else {
				onChange({
					paddingY: val,
					padding: undefined,
					paddingTop: undefined,
					paddingBottom: undefined,
				});
			}
		} else {
			// all-sides mode
			onChange({
				[`padding${field.charAt(0).toUpperCase()}${field.slice(1)}`]: val,
				padding: undefined,
				paddingX: undefined,
				paddingY: undefined,
			});
		}
	};

	// Toggle between axis and all-sides modes
	const toggleMarginExpand = () => {
		if (marginViewMode === "lock") return;
		setMarginViewMode(marginViewMode === "axis" ? "all-sides" : "axis");
	};

	const togglePaddingExpand = () => {
		if (paddingViewMode === "lock") return;
		setPaddingViewMode(paddingViewMode === "axis" ? "all-sides" : "axis");
	};

	// Toggle lock mode
	const toggleMarginLock = () => {
		setMarginViewMode(marginViewMode === "lock" ? "axis" : "lock");
	};

	const togglePaddingLock = () => {
		setPaddingViewMode(paddingViewMode === "lock" ? "axis" : "lock");
	};

	const marginValues = getMarginValues();
	const paddingValues = getPaddingValues();

	return (
		<div className="space-y-6">
			{/* Margin Section */}
			<div className="space-y-3">
				<div className="flex justify-between items-center">
					<Label className="text-xs font-medium text-muted-foreground">
						Margin
					</Label>
					<div className="flex gap-1">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={toggleMarginExpand}
									className="p-0 w-6 h-6"
									disabled={marginViewMode === "lock"}
								>
									<Scan className="size-3" />
								</Button>
							</TooltipTrigger>
							<TooltipContent side="top">
								<p className="text-xs">
									{marginViewMode === "axis" ? "Show all sides" : "Show axis"}
								</p>
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={toggleMarginLock}
									className="p-0 w-6 h-6"
								>
									{marginViewMode === "lock" ? (
										<Lock className="size-3" />
									) : (
										<Unlock className="size-3" />
									)}
								</Button>
							</TooltipTrigger>
							<TooltipContent side="top">
								<p className="text-xs">
									{marginViewMode === "lock"
										? "Unlock sides"
										: "Lock all sides"}
								</p>
							</TooltipContent>
						</Tooltip>
					</div>
				</div>

				{marginViewMode === "lock" && (
					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">All</Label>
						<Select
							value={marginValues.all || "0"}
							onValueChange={(val) => handleMarginChange("all", val)}
						>
							<SelectTrigger className="h-8 bg-muted">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{MARGIN_SPACING_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}

				{marginViewMode === "axis" && (
					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">
								Horizontal
							</Label>
							<Select
								value={marginValues.horizontal || "0"}
								onValueChange={(val) => handleMarginChange("horizontal", val)}
							>
								<SelectTrigger className="h-8 bg-muted">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{MARGIN_SPACING_OPTIONS.map((option) => (
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
								value={marginValues.vertical || "0"}
								onValueChange={(val) => handleMarginChange("vertical", val)}
							>
								<SelectTrigger className="h-8 bg-muted">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{MARGIN_SPACING_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				)}

				{marginViewMode === "all-sides" && (
					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">Top</Label>
							<Select
								value={marginValues.top || "0"}
								onValueChange={(val) => handleMarginChange("top", val)}
							>
								<SelectTrigger className="h-8 bg-muted">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{MARGIN_SPACING_OPTIONS.map((option) => (
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
								value={marginValues.right || "0"}
								onValueChange={(val) => handleMarginChange("right", val)}
							>
								<SelectTrigger className="h-8 bg-muted">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{MARGIN_SPACING_OPTIONS.map((option) => (
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
								value={marginValues.bottom || "0"}
								onValueChange={(val) => handleMarginChange("bottom", val)}
							>
								<SelectTrigger className="h-8 bg-muted">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{MARGIN_SPACING_OPTIONS.map((option) => (
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
								value={marginValues.left || "0"}
								onValueChange={(val) => handleMarginChange("left", val)}
							>
								<SelectTrigger className="h-8 bg-muted">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{MARGIN_SPACING_OPTIONS.map((option) => (
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

			{/* Padding Section */}
			<div className="space-y-3">
				<div className="flex justify-between items-center">
					<Label className="text-xs font-medium text-muted-foreground">
						Padding
					</Label>
					<div className="flex gap-1">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={togglePaddingExpand}
									className="p-0 w-6 h-6"
									disabled={paddingViewMode === "lock"}
								>
									<Scan className="size-3" />
								</Button>
							</TooltipTrigger>
							<TooltipContent side="top">
								<p className="text-xs">
									{paddingViewMode === "axis" ? "Show all sides" : "Show axis"}
								</p>
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={togglePaddingLock}
									className="p-0 w-6 h-6"
								>
									{paddingViewMode === "lock" ? (
										<Lock className="size-3" />
									) : (
										<Unlock className="size-3" />
									)}
								</Button>
							</TooltipTrigger>
							<TooltipContent side="top">
								<p className="text-xs">
									{paddingViewMode === "lock"
										? "Unlock sides"
										: "Lock all sides"}
								</p>
							</TooltipContent>
						</Tooltip>
					</div>
				</div>

				{paddingViewMode === "lock" && (
					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">All</Label>
						<Select
							value={paddingValues.all || "0"}
							onValueChange={(val) => handlePaddingChange("all", val)}
						>
							<SelectTrigger className="h-8 bg-muted">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{PADDING_SPACING_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}

				{paddingViewMode === "axis" && (
					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">
								Horizontal
							</Label>
							<Select
								value={paddingValues.horizontal || "0"}
								onValueChange={(val) => handlePaddingChange("horizontal", val)}
							>
								<SelectTrigger className="h-8 bg-muted">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PADDING_SPACING_OPTIONS.map((option) => (
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
								value={paddingValues.vertical || "0"}
								onValueChange={(val) => handlePaddingChange("vertical", val)}
							>
								<SelectTrigger className="h-8 bg-muted">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PADDING_SPACING_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				)}

				{paddingViewMode === "all-sides" && (
					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">Top</Label>
							<Select
								value={paddingValues.top || "0"}
								onValueChange={(val) => handlePaddingChange("top", val)}
							>
								<SelectTrigger className="h-8 bg-muted">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PADDING_SPACING_OPTIONS.map((option) => (
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
								value={paddingValues.right || "0"}
								onValueChange={(val) => handlePaddingChange("right", val)}
							>
								<SelectTrigger className="h-8 bg-muted">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PADDING_SPACING_OPTIONS.map((option) => (
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
								value={paddingValues.bottom || "0"}
								onValueChange={(val) => handlePaddingChange("bottom", val)}
							>
								<SelectTrigger className="h-8 bg-muted">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PADDING_SPACING_OPTIONS.map((option) => (
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
								value={paddingValues.left || "0"}
								onValueChange={(val) => handlePaddingChange("left", val)}
							>
								<SelectTrigger className="h-8 bg-muted">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PADDING_SPACING_OPTIONS.map((option) => (
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
		</div>
	);
};
