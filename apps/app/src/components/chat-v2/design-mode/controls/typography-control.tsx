"use client";

import { MONO_FONTS, SANS_FONTS, SERIF_FONTS } from "@/lib/theme/constants";
import { getFontFamilyWithFallbacks } from "@/lib/theme/utils";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@firebuzz/ui/components/ui/command";
import { Label } from "@firebuzz/ui/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@firebuzz/ui/components/ui/popover";
import { Check, ChevronsUpDown } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { useEffect, useState } from "react";

// Dynamic font loading utility
const loadedFonts = new Set<string>();

const loadGoogleFont = (fontName: string) => {
	if (loadedFonts.has(fontName)) return;

	const systemFonts = [
		"Arial",
		"Helvetica",
		"Helvetica Neue",
		"Segoe UI",
		"San Francisco",
		"system-ui",
		"sans-serif",
		"Times New Roman",
		"Georgia",
		"Times",
		"serif",
		"Monaco",
		"Consolas",
		"SF Mono",
		"Menlo",
		"Courier New",
		"Courier",
		"monospace",
	];

	if (systemFonts.includes(fontName)) return;

	const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName.replace(/\s+/g, "+"))}:wght@400;500;600&display=swap`;

	const existingLink = document.querySelector(`link[href="${fontUrl}"]`);
	if (existingLink) {
		loadedFonts.add(fontName);
		return;
	}

	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = fontUrl;
	link.onload = () => {
		loadedFonts.add(fontName);
	};
	document.head.appendChild(link);
};

interface TypographyControlProps {
	currentFonts: {
		sans: string;
		serif: string;
		mono: string;
	};
	onFontChange: (family: "sans" | "serif" | "mono", fontName: string) => void;
	isLoading: boolean;
}

export const TypographyControl = ({
	currentFonts,
	onFontChange,
	isLoading,
}: TypographyControlProps) => {
	const [sansOpen, setSansOpen] = useState(false);
	const [serifOpen, setSerifOpen] = useState(false);
	const [monoOpen, setMonoOpen] = useState(false);

	// Load Google Fonts when comboboxes open
	useEffect(() => {
		if (sansOpen) {
			for (const font of SANS_FONTS.google) {
				loadGoogleFont(font.value);
			}
		}
	}, [sansOpen]);

	useEffect(() => {
		if (serifOpen) {
			for (const font of SERIF_FONTS.google) {
				loadGoogleFont(font.value);
			}
		}
	}, [serifOpen]);

	useEffect(() => {
		if (monoOpen) {
			for (const font of MONO_FONTS.google) {
				loadGoogleFont(font.value);
			}
		}
	}, [monoOpen]);

	return (
		<div className="px-2 py-4 space-y-4">
			<div>
				<h3 className="text-sm font-medium">Typography</h3>
				<p className="text-xs text-muted-foreground">Configure font settings</p>
			</div>

			<div className="space-y-4">
				{/* Sans Font */}
				<div className="space-y-2">
					<Label className="text-xs">Sans Font</Label>
					<Popover open={sansOpen} onOpenChange={setSansOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								aria-expanded={sansOpen}
								className="justify-between w-full bg-muted"
								disabled={isLoading}
							>
								{currentFonts.sans
									? [...SANS_FONTS.google, ...SANS_FONTS.system].find(
											(font) => font.value === currentFonts.sans,
										)?.label || currentFonts.sans
									: "Select font..."}
								<ChevronsUpDown className="!size-3.5 ml-2 opacity-50 shrink-0" />
							</Button>
						</PopoverTrigger>
						<PopoverContent
							className="w-[--radix-popover-trigger-width] p-0"
							align="start"
						>
							<Command>
								<CommandInput className="!h-8" placeholder="Search fonts..." />
								<CommandList>
									<CommandEmpty>No font found.</CommandEmpty>
									<CommandGroup heading="Google Fonts">
										{SANS_FONTS.google.map((font) => (
											<CommandItem
												key={font.value}
												value={font.value}
												style={{
													fontFamily: getFontFamilyWithFallbacks(
														font.value,
														"sans",
													),
												}}
												onSelect={(currentValue) => {
													onFontChange("sans", currentValue);
													setSansOpen(false);
												}}
											>
												<Check
													className={cn(
														"mr-2 h-4 w-4",
														currentFonts.sans === font.value
															? "opacity-100"
															: "opacity-0",
													)}
												/>
												{font.label}
											</CommandItem>
										))}
									</CommandGroup>
									<CommandGroup heading="System Fonts">
										{SANS_FONTS.system.map((font) => (
											<CommandItem
												key={font.value}
												value={font.value}
												style={{
													fontFamily: getFontFamilyWithFallbacks(
														font.value,
														"sans",
													),
												}}
												onSelect={(currentValue) => {
													onFontChange("sans", currentValue);
													setSansOpen(false);
												}}
											>
												<Check
													className={cn(
														"mr-2 h-4 w-4",
														currentFonts.sans === font.value
															? "opacity-100"
															: "opacity-0",
													)}
												/>
												{font.label}
											</CommandItem>
										))}
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
					<p className="text-xs text-muted-foreground">
						Choose the sans font for your theme
					</p>
				</div>

				{/* Serif Font */}
				<div className="space-y-2">
					<Label className="text-xs">Serif Font</Label>
					<Popover open={serifOpen} onOpenChange={setSerifOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								aria-expanded={serifOpen}
								className="justify-between w-full bg-muted"
								disabled={isLoading}
							>
								{currentFonts.serif
									? [...SERIF_FONTS.google, ...SERIF_FONTS.system].find(
											(font) => font.value === currentFonts.serif,
										)?.label || currentFonts.serif
									: "Select font..."}
								<ChevronsUpDown className="!size-3.5 ml-2 opacity-50 shrink-0" />
							</Button>
						</PopoverTrigger>
						<PopoverContent
							className="w-[--radix-popover-trigger-width] p-0"
							align="start"
						>
							<Command>
								<CommandInput className="!h-8" placeholder="Search fonts..." />
								<CommandList>
									<CommandEmpty>No font found.</CommandEmpty>
									<CommandGroup heading="Google Fonts">
										{SERIF_FONTS.google.map((font) => (
											<CommandItem
												key={font.value}
												value={font.value}
												style={{
													fontFamily: getFontFamilyWithFallbacks(
														font.value,
														"serif",
													),
												}}
												onSelect={(currentValue) => {
													onFontChange("serif", currentValue);
													setSerifOpen(false);
												}}
											>
												<Check
													className={cn(
														"mr-2 h-4 w-4",
														currentFonts.serif === font.value
															? "opacity-100"
															: "opacity-0",
													)}
												/>
												{font.label}
											</CommandItem>
										))}
									</CommandGroup>
									<CommandGroup heading="System Fonts">
										{SERIF_FONTS.system.map((font) => (
											<CommandItem
												key={font.value}
												value={font.value}
												style={{
													fontFamily: getFontFamilyWithFallbacks(
														font.value,
														"serif",
													),
												}}
												onSelect={(currentValue) => {
													onFontChange("serif", currentValue);
													setSerifOpen(false);
												}}
											>
												<Check
													className={cn(
														"mr-2 h-4 w-4",
														currentFonts.serif === font.value
															? "opacity-100"
															: "opacity-0",
													)}
												/>
												{font.label}
											</CommandItem>
										))}
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
					<p className="text-xs text-muted-foreground">
						Choose the serif font for your theme
					</p>
				</div>

				{/* Mono Font */}
				<div className="space-y-2">
					<Label className="text-xs">Mono Font</Label>
					<Popover open={monoOpen} onOpenChange={setMonoOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								aria-expanded={monoOpen}
								className="justify-between w-full bg-muted"
								disabled={isLoading}
							>
								{currentFonts.mono
									? [...MONO_FONTS.google, ...MONO_FONTS.system].find(
											(font) => font.value === currentFonts.mono,
										)?.label || currentFonts.mono
									: "Select font..."}
								<ChevronsUpDown className="!size-3.5 ml-2 opacity-50 shrink-0" />
							</Button>
						</PopoverTrigger>
						<PopoverContent
							className="w-[--radix-popover-trigger-width] p-0"
							align="start"
						>
							<Command>
								<CommandInput className="!h-8" placeholder="Search fonts..." />
								<CommandList>
									<CommandEmpty>No font found.</CommandEmpty>
									<CommandGroup heading="Google Fonts">
										{MONO_FONTS.google.map((font) => (
											<CommandItem
												key={font.value}
												value={font.value}
												style={{
													fontFamily: getFontFamilyWithFallbacks(
														font.value,
														"mono",
													),
												}}
												onSelect={(currentValue) => {
													onFontChange("mono", currentValue);
													setMonoOpen(false);
												}}
											>
												<Check
													className={cn(
														"mr-2 h-4 w-4",
														currentFonts.mono === font.value
															? "opacity-100"
															: "opacity-0",
													)}
												/>
												{font.label}
											</CommandItem>
										))}
									</CommandGroup>
									<CommandGroup heading="System Fonts">
										{MONO_FONTS.system.map((font) => (
											<CommandItem
												key={font.value}
												value={font.value}
												style={{
													fontFamily: getFontFamilyWithFallbacks(
														font.value,
														"mono",
													),
												}}
												onSelect={(currentValue) => {
													onFontChange("mono", currentValue);
													setMonoOpen(false);
												}}
											>
												<Check
													className={cn(
														"mr-2 h-4 w-4",
														currentFonts.mono === font.value
															? "opacity-100"
															: "opacity-0",
													)}
												/>
												{font.label}
											</CommandItem>
										))}
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
					<p className="text-xs text-muted-foreground">
						Choose the mono font for your theme
					</p>
				</div>
			</div>
		</div>
	);
};
