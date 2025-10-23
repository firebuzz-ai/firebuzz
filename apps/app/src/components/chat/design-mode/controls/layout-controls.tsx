"use client";

import { Button } from "@firebuzz/ui/components/ui/button";
import { ButtonGroup } from "@firebuzz/ui/components/ui/button-group";
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
import {
	AlignCenterHorizontal,
	AlignCenterVertical,
	AlignEndHorizontal,
	AlignEndVertical,
	AlignJustify,
	AlignStartHorizontal,
	AlignStartVertical,
	ArrowDown,
	ArrowRight,
	Columns2,
	Columns3,
	EyeOff,
	Grid2x2,
	LayoutGrid,
	RectangleHorizontal,
	Square,
} from "@firebuzz/ui/icons/lucide";
import {
	ALIGN_ITEMS_OPTIONS,
	GAP_OPTIONS,
	GRID_COLS_OPTIONS,
	GRID_ROWS_OPTIONS,
	JUSTIFY_CONTENT_OPTIONS,
	SPACE_OPTIONS,
} from "@/lib/design-mode/tailwind-mappings";

export interface LayoutValues {
	display?: string;
	flexDirection?: string;
	justifyContent?: string;
	alignItems?: string;
	gap?: string;
	gridCols?: string;
	gridRows?: string;
	spaceX?: string;
	spaceY?: string;
}

export interface LayoutControlsProps {
	value: LayoutValues;
	onChange: (updates: Partial<LayoutValues>) => void;
}

// Helper to extract space value or return empty string for unset
const getSpaceValue = (spaceClass?: string): string => {
	if (!spaceClass) return "";
	const match = spaceClass.match(/-([a-z0-9.]+)$/);
	return match ? match[1] : "";
};

export const LayoutControls = ({ value, onChange }: LayoutControlsProps) => {
	const isFlex = value.display === "flex" || value.display === "inline-flex";
	const isGrid = value.display === "grid" || value.display === "inline-grid";

	// Default to "block" if no display is set
	const currentDisplay = value.display || "block";

	return (
		<div className="space-y-4">
			{/* Display Type Button Group */}
			<div className="space-y-1.5">
				<Label className="text-xs text-muted-foreground">Display</Label>
				<ButtonGroup className="overflow-hidden w-full h-8 rounded-md border bg-muted grid grid-cols-8">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant={currentDisplay === "block" ? "default" : "ghost"}
								onClick={() => onChange({ display: "block" })}
								className="flex-1 h-8"
							>
								<Square className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="top">
							<p className="text-xs">Block</p>
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant={
									currentDisplay === "inline-block" ? "default" : "ghost"
								}
								onClick={() => onChange({ display: "inline-block" })}
								className="flex-1 h-8"
							>
								<RectangleHorizontal className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="top">
							<p className="text-xs">Inline Block</p>
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant={currentDisplay === "inline" ? "default" : "ghost"}
								onClick={() => onChange({ display: "inline" })}
								className="flex-1 h-8"
							>
								<AlignJustify className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="top">
							<p className="text-xs">Inline</p>
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant={currentDisplay === "flex" ? "default" : "ghost"}
								onClick={() => onChange({ display: "flex" })}
								className="flex-1 h-8"
							>
								<Columns3 className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="top">
							<p className="text-xs">Flex</p>
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant={currentDisplay === "inline-flex" ? "default" : "ghost"}
								onClick={() => onChange({ display: "inline-flex" })}
								className="flex-1 h-8"
							>
								<Columns2 className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="top">
							<p className="text-xs">Inline Flex</p>
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant={currentDisplay === "grid" ? "default" : "ghost"}
								onClick={() => onChange({ display: "grid" })}
								className="flex-1 h-8"
							>
								<LayoutGrid className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="top">
							<p className="text-xs">Grid</p>
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant={currentDisplay === "inline-grid" ? "default" : "ghost"}
								onClick={() => onChange({ display: "inline-grid" })}
								className="flex-1 h-8"
							>
								<Grid2x2 className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="top">
							<p className="text-xs">Inline Grid</p>
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant={currentDisplay === "hidden" ? "default" : "ghost"}
								onClick={() => onChange({ display: "hidden" })}
								className="flex-1 h-8"
							>
								<EyeOff className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="top">
							<p className="text-xs">Hidden</p>
						</TooltipContent>
					</Tooltip>
				</ButtonGroup>
			</div>

			{/* Space Between (for all display types) */}
			{currentDisplay !== "hidden" && (
				<div className="grid grid-cols-2 gap-2">
					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">Space X</Label>
						<Select
							value={getSpaceValue(value.spaceX)}
							onValueChange={(val) => onChange({ spaceX: val })}
						>
							<SelectTrigger className="h-8 bg-muted">
								<SelectValue placeholder="None" />
							</SelectTrigger>
							<SelectContent>
								{SPACE_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">Space Y</Label>
						<Select
							value={getSpaceValue(value.spaceY)}
							onValueChange={(val) => onChange({ spaceY: val })}
						>
							<SelectTrigger className="h-8 bg-muted">
								<SelectValue placeholder="None" />
							</SelectTrigger>
							<SelectContent>
								{SPACE_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			)}

			{/* Flex Controls */}
			{isFlex && (
				<>
					{/* Direction and Justify - Side by side */}
					<div className="grid grid-cols-2 gap-2">
						{/* Flex Direction */}
						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">Direction</Label>
							<ButtonGroup className="overflow-hidden w-full h-8 rounded-md border bg-muted grid grid-cols-2">
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											type="button"
											variant={
												value.flexDirection === "flex-row" ? "default" : "ghost"
											}
											onClick={() => onChange({ flexDirection: "flex-row" })}
											className="flex-1 h-8"
										>
											<ArrowRight className="size-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent side="top">
										<p className="text-xs">Row</p>
									</TooltipContent>
								</Tooltip>

								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											type="button"
											variant={
												value.flexDirection === "flex-col" ? "default" : "ghost"
											}
											onClick={() => onChange({ flexDirection: "flex-col" })}
											className="flex-1 h-8"
										>
											<ArrowDown className="size-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent side="top">
										<p className="text-xs">Column</p>
									</TooltipContent>
								</Tooltip>
							</ButtonGroup>
						</div>

						{/* Align Items */}
						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">Align</Label>
							<ButtonGroup className="overflow-hidden w-full h-8 rounded-md border bg-muted grid grid-cols-4">
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											type="button"
											variant={
												value.alignItems === "items-start" ? "default" : "ghost"
											}
											onClick={() => onChange({ alignItems: "items-start" })}
											className="flex-1 h-8"
										>
											{value.flexDirection === "flex-col" ? (
												<AlignStartHorizontal className="size-4" />
											) : (
												<AlignStartVertical className="size-4" />
											)}
										</Button>
									</TooltipTrigger>
									<TooltipContent side="top">
										<p className="text-xs">Start</p>
									</TooltipContent>
								</Tooltip>

								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											type="button"
											variant={
												value.alignItems === "items-center"
													? "default"
													: "ghost"
											}
											onClick={() => onChange({ alignItems: "items-center" })}
											className="flex-1 h-8"
										>
											{value.flexDirection === "flex-col" ? (
												<AlignCenterHorizontal className="size-4" />
											) : (
												<AlignCenterVertical className="size-4" />
											)}
										</Button>
									</TooltipTrigger>
									<TooltipContent side="top">
										<p className="text-xs">Center</p>
									</TooltipContent>
								</Tooltip>

								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											type="button"
											variant={
												value.alignItems === "items-end" ? "default" : "ghost"
											}
											onClick={() => onChange({ alignItems: "items-end" })}
											className="flex-1 h-8"
										>
											{value.flexDirection === "flex-col" ? (
												<AlignEndHorizontal className="size-4" />
											) : (
												<AlignEndVertical className="size-4" />
											)}
										</Button>
									</TooltipTrigger>
									<TooltipContent side="top">
										<p className="text-xs">End</p>
									</TooltipContent>
								</Tooltip>

								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											type="button"
											variant={
												value.alignItems === "items-stretch"
													? "default"
													: "ghost"
											}
											onClick={() => onChange({ alignItems: "items-stretch" })}
											className="flex-1 h-8"
										>
											<RectangleHorizontal className="size-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent side="top">
										<p className="text-xs">Stretch</p>
									</TooltipContent>
								</Tooltip>
							</ButtonGroup>
						</div>
					</div>

					{/* Justify Content */}
					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">Justify</Label>
						<Select
							value={value.justifyContent || ""}
							onValueChange={(val) => onChange({ justifyContent: val })}
						>
							<SelectTrigger className="h-8 bg-muted">
								<SelectValue placeholder="Default" />
							</SelectTrigger>
							<SelectContent>
								{JUSTIFY_CONTENT_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Gap */}
					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">Gap</Label>
						<Select
							value={value.gap || ""}
							onValueChange={(val) => onChange({ gap: val })}
						>
							<SelectTrigger className="h-8 bg-muted">
								<SelectValue placeholder="Default" />
							</SelectTrigger>
							<SelectContent>
								{GAP_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</>
			)}

			{/* Grid Controls */}
			{isGrid && (
				<>
					{/* Grid Columns */}
					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">Columns</Label>
						<Select
							value={value.gridCols || ""}
							onValueChange={(val) => onChange({ gridCols: val })}
						>
							<SelectTrigger className="h-8 bg-muted">
								<SelectValue placeholder="Default" />
							</SelectTrigger>
							<SelectContent>
								{GRID_COLS_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Grid Rows */}
					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">Rows</Label>
						<Select
							value={value.gridRows || ""}
							onValueChange={(val) => onChange({ gridRows: val })}
						>
							<SelectTrigger className="h-8 bg-muted">
								<SelectValue placeholder="Default" />
							</SelectTrigger>
							<SelectContent>
								{GRID_ROWS_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Gap */}
					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">Gap</Label>
						<Select
							value={value.gap || ""}
							onValueChange={(val) => onChange({ gap: val })}
						>
							<SelectTrigger className="h-8 bg-muted">
								<SelectValue placeholder="Default" />
							</SelectTrigger>
							<SelectContent>
								{GAP_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Justify Content */}
					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">Justify</Label>
						<Select
							value={value.justifyContent || ""}
							onValueChange={(val) => onChange({ justifyContent: val })}
						>
							<SelectTrigger className="h-8 bg-muted">
								<SelectValue placeholder="Default" />
							</SelectTrigger>
							<SelectContent>
								{JUSTIFY_CONTENT_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Align Items */}
					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">Align</Label>
						<Select
							value={value.alignItems || ""}
							onValueChange={(val) => onChange({ alignItems: val })}
						>
							<SelectTrigger className="h-8 bg-muted">
								<SelectValue placeholder="Default" />
							</SelectTrigger>
							<SelectContent>
								{ALIGN_ITEMS_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</>
			)}
		</div>
	);
};
