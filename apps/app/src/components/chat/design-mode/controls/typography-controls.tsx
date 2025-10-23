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
	AlignCenter,
	AlignJustify,
	AlignLeft,
	AlignRight,
	Italic,
	Strikethrough,
	Underline,
} from "@firebuzz/ui/icons/lucide";
import {
	FONT_FAMILY_OPTIONS,
	FONT_SIZE_OPTIONS,
	FONT_WEIGHT_OPTIONS,
	LETTER_SPACING_OPTIONS,
	LINE_HEIGHT_OPTIONS,
} from "@/lib/design-mode/tailwind-mappings";

export interface TypographyValues {
	fontFamily?: string;
	fontSize?: string;
	fontWeight?: string;
	lineHeight?: string;
	letterSpacing?: string;
	textAlign?: string;
	textDecoration?: string;
	fontStyle?: string;
}

export interface TypographyControlsProps {
	value: TypographyValues;
	onChange: (updates: Partial<TypographyValues>) => void;
}

// Icon component for overline (using a custom path since lucide doesn't have it)
const OverlineIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className="size-4"
	>
		<path d="M4 3h16" />
		<path d="M8 7v6a4 4 0 0 0 8 0V7" />
	</svg>
);

export const TypographyControls = ({
	value,
	onChange,
}: TypographyControlsProps) => {
	return (
		<div className="space-y-3">
			{/* Font Family */}
			<div className="space-y-1.5">
				<Select
					value={value.fontFamily || "font-sans"}
					onValueChange={(val) => onChange({ fontFamily: val })}
				>
					<SelectTrigger className="h-8 bg-muted">
						<SelectValue placeholder="Default" />
					</SelectTrigger>
					<SelectContent>
						{FONT_FAMILY_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Font Weight and Font Size - Two columns */}
			<div className="grid grid-cols-2 gap-2">
				<div className="space-y-1.5">
					<Select
						value={value.fontWeight || "font-normal"}
						onValueChange={(val) => onChange({ fontWeight: val })}
					>
						<SelectTrigger className="h-8 bg-muted">
							<SelectValue placeholder="Regular" />
						</SelectTrigger>
						<SelectContent>
							{FONT_WEIGHT_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-1.5">
					<Select
						value={value.fontSize || "text-base"}
						onValueChange={(val) => onChange({ fontSize: val })}
					>
						<SelectTrigger className="h-8 bg-muted">
							<SelectValue placeholder="Default" />
						</SelectTrigger>
						<SelectContent>
							{FONT_SIZE_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Line Height and Letter Spacing - Two columns */}
			<div className="grid grid-cols-2 gap-2">
				<div className="space-y-1.5">
					<Label className="text-xs text-muted-foreground">Line Height</Label>
					<Select
						value={value.lineHeight || "leading-7"}
						onValueChange={(val) => onChange({ lineHeight: val })}
					>
						<SelectTrigger className="h-8 bg-muted">
							<SelectValue placeholder="1.75rem" />
						</SelectTrigger>
						<SelectContent>
							{LINE_HEIGHT_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-1.5">
					<Label className="text-xs text-muted-foreground">
						Letter Spacing
					</Label>
					<Select
						value={value.letterSpacing || "tracking-normal"}
						onValueChange={(val) => onChange({ letterSpacing: val })}
					>
						<SelectTrigger className="h-8 bg-muted">
							<SelectValue placeholder="0em" />
						</SelectTrigger>
						<SelectContent>
							{LETTER_SPACING_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Alignment and Decoration - Side by side */}
			<div className="grid grid-cols-2 gap-2">
				{/* Alignment */}
				<div className="space-y-1.5">
					<Label className="text-xs text-muted-foreground">Alignment</Label>
					<ButtonGroup className="overflow-hidden w-full h-8 rounded-md border bg-muted">
						<Button
							type="button"
							variant={value.textAlign === "text-left" ? "default" : "ghost"}
							onClick={() => onChange({ textAlign: "text-left" })}
							className="flex-1 h-8"
						>
							<AlignLeft />
						</Button>
						<Button
							type="button"
							variant={value.textAlign === "text-center" ? "default" : "ghost"}
							onClick={() => onChange({ textAlign: "text-center" })}
							className="flex-1 h-8"
						>
							<AlignCenter />
						</Button>
						<Button
							type="button"
							variant={value.textAlign === "text-right" ? "default" : "ghost"}
							onClick={() => onChange({ textAlign: "text-right" })}
							className="flex-1 h-8"
						>
							<AlignRight />
						</Button>
						<Button
							type="button"
							variant={value.textAlign === "text-justify" ? "default" : "ghost"}
							onClick={() => onChange({ textAlign: "text-justify" })}
							className="flex-1 h-8"
						>
							<AlignJustify />
						</Button>
					</ButtonGroup>
				</div>

				{/* Decoration */}
				<div className="space-y-1.5">
					<Label className="text-xs text-muted-foreground">Decoration</Label>
					<div className="flex gap-2">
						{/* Italic - independent toggle */}
						<ButtonGroup className="overflow-hidden h-8 rounded-md border bg-muted">
							<Button
								type="button"
								variant={value.fontStyle === "italic" ? "default" : "ghost"}
								onClick={() =>
									onChange({
										fontStyle: value.fontStyle === "italic" ? "" : "italic",
									})
								}
								className="px-3 h-8"
							>
								<Italic />
							</Button>
						</ButtonGroup>

						{/* Text decoration - mutually exclusive */}
						<ButtonGroup className="overflow-hidden flex-1 h-8 rounded-md border bg-muted">
							<Button
								type="button"
								variant={
									value.textDecoration === "line-through" ? "default" : "ghost"
								}
								onClick={() =>
									onChange({
										textDecoration:
											value.textDecoration === "line-through"
												? ""
												: "line-through",
									})
								}
								className="flex-1 h-8"
							>
								<Strikethrough />
							</Button>
							<Button
								type="button"
								variant={
									value.textDecoration === "underline" ? "default" : "ghost"
								}
								onClick={() =>
									onChange({
										textDecoration:
											value.textDecoration === "underline" ? "" : "underline",
									})
								}
								className="flex-1 h-8"
							>
								<Underline />
							</Button>
							<Button
								type="button"
								variant={
									value.textDecoration === "overline" ? "default" : "ghost"
								}
								onClick={() =>
									onChange({
										textDecoration:
											value.textDecoration === "overline" ? "" : "overline",
									})
								}
								className="flex-1 h-8"
							>
								<OverlineIcon />
							</Button>
						</ButtonGroup>
					</div>
				</div>
			</div>
		</div>
	);
};
