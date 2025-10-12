"use client";

import { Button } from "@firebuzz/ui/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@firebuzz/ui/components/ui/command";
import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@firebuzz/ui/components/ui/form";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@firebuzz/ui/components/ui/popover";
import { Check, ChevronsUpDown } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { useEffect, useState } from "react";
import { MONO_FONTS, SANS_FONTS, SERIF_FONTS } from "@/lib/theme/constants";
import { getFontFamilyWithFallbacks } from "@/lib/theme/utils";

// Dynamic font loading utility
const loadedFonts = new Set<string>();

const loadGoogleFont = (fontName: string) => {
	// Skip if already loaded or if it's a system font
	if (loadedFonts.has(fontName)) return;

	// Check if it's a system font (shouldn't be loaded)
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

	// Create Google Fonts URL
	const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName.replace(/\s+/g, "+"))}:wght@400;500;600&display=swap`;

	// Check if font is already loaded in document
	const existingLink = document.querySelector(`link[href="${fontUrl}"]`);
	if (existingLink) {
		loadedFonts.add(fontName);
		return;
	}

	// Create and inject font link
	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = fontUrl;
	link.onload = () => {
		loadedFonts.add(fontName);
	};
	document.head.appendChild(link);
};

interface TypographySectionProps {
	// biome-ignore lint/suspicious/noExplicitAny: Control type not available from form library
	control: any; // Control from form hook
	isLoading: boolean;
}

export const TypographySection = ({
	control,
	isLoading,
}: TypographySectionProps) => {
	// Combobox state management
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
		<div className="px-4 py-8 space-y-6 border-b">
			<div>
				<h2 className="text-lg font-medium">Typography</h2>
				<p className="text-sm text-muted-foreground">
					Configure the font settings for your theme
				</p>
			</div>
			<div className="space-y-4">
				<FormField
					control={control}
					name="fonts.sans"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Sans Font</FormLabel>
							<FormControl>
								<Popover open={sansOpen} onOpenChange={setSansOpen}>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											size="sm"
											aria-expanded={sansOpen}
											className="justify-between w-full"
											disabled={isLoading}
										>
											{field.value
												? [...SANS_FONTS.google, ...SANS_FONTS.system].find(
														(font) => font.value === field.value,
													)?.label
												: "Select font..."}
											<ChevronsUpDown className="!size-3.5 ml-2 opacity-50 shrink-0" />
										</Button>
									</PopoverTrigger>
									<PopoverContent
										className="w-[--radix-popover-trigger-width] p-0"
										align="start"
									>
										<Command>
											<CommandInput
												className="!h-8"
												placeholder="Search fonts..."
											/>
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
																field.onChange(
																	currentValue === field.value
																		? ""
																		: currentValue,
																);
																setSansOpen(false);
															}}
														>
															<Check
																className={cn(
																	"mr-2 h-4 w-4",
																	field.value === font.value
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
																field.onChange(
																	currentValue === field.value
																		? ""
																		: currentValue,
																);
																setSansOpen(false);
															}}
														>
															<Check
																className={cn(
																	"mr-2 h-4 w-4",
																	field.value === font.value
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
							</FormControl>
							<FormDescription>
								Choose the sans font for your theme
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={control}
					name="fonts.serif"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Serif Font</FormLabel>
							<FormControl>
								<Popover open={serifOpen} onOpenChange={setSerifOpen}>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											size="sm"
											aria-expanded={serifOpen}
											className="justify-between w-full"
											disabled={isLoading}
										>
											{field.value
												? [...SERIF_FONTS.google, ...SERIF_FONTS.system].find(
														(font) => font.value === field.value,
													)?.label
												: "Select font..."}
											<ChevronsUpDown className="!size-3.5 ml-2 opacity-50 shrink-0" />
										</Button>
									</PopoverTrigger>
									<PopoverContent
										className="w-[--radix-popover-trigger-width] p-0"
										align="start"
									>
										<Command>
											<CommandInput
												className="!h-8"
												placeholder="Search fonts..."
											/>
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
																field.onChange(
																	currentValue === field.value
																		? ""
																		: currentValue,
																);
																setSerifOpen(false);
															}}
														>
															<Check
																className={cn(
																	"mr-2 h-4 w-4",
																	field.value === font.value
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
																field.onChange(
																	currentValue === field.value
																		? ""
																		: currentValue,
																);
																setSerifOpen(false);
															}}
														>
															<Check
																className={cn(
																	"mr-2 h-4 w-4",
																	field.value === font.value
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
							</FormControl>
							<FormDescription>
								Choose the serif font for your theme
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={control}
					name="fonts.mono"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Mono Font</FormLabel>
							<FormControl>
								<Popover open={monoOpen} onOpenChange={setMonoOpen}>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											size="sm"
											aria-expanded={monoOpen}
											className="justify-between w-full"
											disabled={isLoading}
										>
											{field.value
												? [...MONO_FONTS.google, ...MONO_FONTS.system].find(
														(font) => font.value === field.value,
													)?.label
												: "Select font..."}
											<ChevronsUpDown className="!size-3.5 ml-2 opacity-50 shrink-0" />
										</Button>
									</PopoverTrigger>
									<PopoverContent
										className="w-[--radix-popover-trigger-width] p-0"
										align="start"
									>
										<Command>
											<CommandInput
												className="!h-8"
												placeholder="Search fonts..."
											/>
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
																field.onChange(
																	currentValue === field.value
																		? ""
																		: currentValue,
																);
																setMonoOpen(false);
															}}
														>
															<Check
																className={cn(
																	"mr-2 h-4 w-4",
																	field.value === font.value
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
																field.onChange(
																	currentValue === field.value
																		? ""
																		: currentValue,
																);
																setMonoOpen(false);
															}}
														>
															<Check
																className={cn(
																	"mr-2 h-4 w-4",
																	field.value === font.value
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
							</FormControl>
							<FormDescription>
								Choose the mono font for your theme
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>
			</div>
		</div>
	);
};
