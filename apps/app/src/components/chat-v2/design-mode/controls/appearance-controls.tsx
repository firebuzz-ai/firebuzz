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
	OPACITY_OPTIONS,
	SHADOW_OPTIONS,
} from "@/lib/design-mode/tailwind-mappings";

export interface AppearanceValues {
	opacity?: string;
	shadow?: string;
}

export interface AppearanceControlsProps {
	value: AppearanceValues;
	onChange: (updates: Partial<AppearanceValues>) => void;
}

export const AppearanceControls = ({
	value,
	onChange,
}: AppearanceControlsProps) => {
	return (
		<div className="space-y-4">
			{/* Opacity */}
			<div className="space-y-1.5">
				<Label className="text-xs text-muted-foreground">Opacity</Label>
				<Select
					value={value.opacity || ""}
					onValueChange={(val) => onChange({ opacity: val })}
				>
					<SelectTrigger className="h-8 bg-muted">
						<SelectValue placeholder="Default" />
					</SelectTrigger>
					<SelectContent>
						{OPACITY_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Shadow */}
			<div className="space-y-1.5">
				<Label className="text-xs text-muted-foreground">Shadow</Label>
				<Select
					value={value.shadow || ""}
					onValueChange={(val) => onChange({ shadow: val })}
				>
					<SelectTrigger className="h-8 bg-muted">
						<SelectValue placeholder="Default" />
					</SelectTrigger>
					<SelectContent>
						{SHADOW_OPTIONS.map((option) => (
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
