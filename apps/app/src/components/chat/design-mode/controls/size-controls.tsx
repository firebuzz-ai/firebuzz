"use client";

import { Label } from "@firebuzz/ui/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@firebuzz/ui/components/ui/select";
import {
	HEIGHT_OPTIONS,
	MAX_HEIGHT_OPTIONS,
	MAX_WIDTH_OPTIONS,
	MIN_HEIGHT_OPTIONS,
	MIN_WIDTH_OPTIONS,
	WIDTH_OPTIONS,
} from "@/lib/design-mode/tailwind-mappings";

export interface SizeValues {
	width?: string;
	height?: string;
	minWidth?: string;
	maxWidth?: string;
	minHeight?: string;
	maxHeight?: string;
}

export interface SizeControlsProps {
	value: SizeValues;
	onChange: (updates: Partial<SizeValues>) => void;
}

// Helper to extract size value from class (e.g., "w-full" -> "full", "max-w-lg" -> "lg")
const getSizeValue = (sizeClass?: string): string => {
	if (!sizeClass) return "";
	const match = sizeClass.match(/-([a-z0-9./]+)$/);
	return match ? match[1] : "";
};

export const SizeControls = ({ value, onChange }: SizeControlsProps) => {
	return (
		<div className="space-y-4">
			{/* Width & Height */}
			<div className="grid grid-cols-2 gap-2">
				<div className="space-y-1.5">
					<Label className="text-xs text-muted-foreground">Width</Label>
					<Select
						value={getSizeValue(value.width)}
						onValueChange={(val) => onChange({ width: val })}
					>
						<SelectTrigger className="h-8 bg-muted">
							<SelectValue placeholder="Auto" />
						</SelectTrigger>
						<SelectContent>
							{WIDTH_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-1.5">
					<Label className="text-xs text-muted-foreground">Height</Label>
					<Select
						value={getSizeValue(value.height)}
						onValueChange={(val) => onChange({ height: val })}
					>
						<SelectTrigger className="h-8 bg-muted">
							<SelectValue placeholder="Auto" />
						</SelectTrigger>
						<SelectContent>
							{HEIGHT_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Min Width & Min Height */}
			<div className="grid grid-cols-2 gap-2">
				<div className="space-y-1.5">
					<Label className="text-xs text-muted-foreground">Min Width</Label>
					<Select
						value={getSizeValue(value.minWidth)}
						onValueChange={(val) => onChange({ minWidth: val })}
					>
						<SelectTrigger className="h-8 bg-muted">
							<SelectValue placeholder="None" />
						</SelectTrigger>
						<SelectContent>
							{MIN_WIDTH_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-1.5">
					<Label className="text-xs text-muted-foreground">Min Height</Label>
					<Select
						value={getSizeValue(value.minHeight)}
						onValueChange={(val) => onChange({ minHeight: val })}
					>
						<SelectTrigger className="h-8 bg-muted">
							<SelectValue placeholder="None" />
						</SelectTrigger>
						<SelectContent>
							{MIN_HEIGHT_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Max Width & Max Height */}
			<div className="grid grid-cols-2 gap-2">
				<div className="space-y-1.5">
					<Label className="text-xs text-muted-foreground">Max Width</Label>
					<Select
						value={getSizeValue(value.maxWidth)}
						onValueChange={(val) => onChange({ maxWidth: val })}
					>
						<SelectTrigger className="h-8 bg-muted">
							<SelectValue placeholder="None" />
						</SelectTrigger>
						<SelectContent>
							{MAX_WIDTH_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-1.5">
					<Label className="text-xs text-muted-foreground">Max Height</Label>
					<Select
						value={getSizeValue(value.maxHeight)}
						onValueChange={(val) => onChange({ maxHeight: val })}
					>
						<SelectTrigger className="h-8 bg-muted">
							<SelectValue placeholder="None" />
						</SelectTrigger>
						<SelectContent>
							{MAX_HEIGHT_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
		</div>
	);
};
