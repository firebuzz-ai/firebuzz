"use client";

import { useDesignMode } from "@/hooks/agent/use-design-mode";
import { useColorSelectorModal } from "@/hooks/ui/use-color-selector-modal";
import { COLOR_CATEGORY_ORDER } from "@/lib/theme/constants";
import { getCategoryForColor, getDescriptionForColor } from "@/lib/theme/utils";
import { api, useCachedQuery } from "@firebuzz/convex";
import { TextShimmer } from "@firebuzz/ui/components/reusable/text-shimmer";
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
import { ScrollArea } from "@firebuzz/ui/components/ui/scroll-area";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Check, ChevronDown } from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { hexToHsl, hslToHex } from "@firebuzz/utils";
import { useState } from "react";
import { RadiusControl } from "./controls/radius-control";
import { ThemeColorsControls } from "./controls/theme-colors-controls";
import { TypographyControl } from "./controls/typography-control";

interface ThemeColorItem {
	name: string;
	displayName: string;
	value: string;
	hexValue: string;
	category: string;
	theme: "light" | "dark";
	description: string;
	themeName: string;
	themeId: string;
}

// Helper function to extract colors from theme
const getThemeColors = (theme: {
	lightTheme?: {
		primary?: string;
		secondary?: string;
		accent?: string;
		background?: string;
	};
}) => {
	try {
		return [
			hslToHex(theme.lightTheme?.primary || "222.2 84% 4.9%"),
			hslToHex(theme.lightTheme?.secondary || "210 40% 96%"),
			hslToHex(theme.lightTheme?.accent || "210 40% 96%"),
			hslToHex(theme.lightTheme?.background || "0 0% 100%"),
		];
	} catch (_error) {
		// Fallback colors if conversion fails
		return ["#3b82f6", "#f1f5f9", "#f1f5f9", "#ffffff"];
	}
};

export const ThemeEditor = () => {
	const {
		themeState,
		updateTheme,
		isDesignModeActive,
		isLoading: isDesignModeLoading,
	} = useDesignMode();
	const [selectedThemeId, setSelectedThemeId] = useState<string>("custom");
	const [themePopoverOpen, setThemePopoverOpen] = useState(false);
	const [previewThemeMode, setPreviewThemeMode] = useState<"light" | "dark">(
		"light",
	);
	const { setState: setColorSelectorModalState } = useColorSelectorModal();

	// Fetch user's themes from Convex (auth context is handled automatically)
	const themes = useCachedQuery(api.collections.brands.themes.queries.getAll, {
		showHidden: false,
	});

	// Loading state
	if (isDesignModeLoading || !isDesignModeActive || !themeState) {
		return (
			<div className="flex justify-center items-center h-full">
				<Spinner size="sm" />
			</div>
		);
	}

	// Theme is still loading from sandbox
	if (themeState.status === "loading" || themeState.status === "idle") {
		return (
			<div className="flex justify-center items-center h-full">
				<TextShimmer
					as="span"
					duration={1.5}
					className="text-sm italic font-medium"
					active={true}
				>
					Loading theme...
				</TextShimmer>
			</div>
		);
	}

	// Theme loading error
	if (themeState.status === "error") {
		return (
			<div className="flex flex-col gap-2 justify-center items-center p-4 h-full text-center">
				<p className="text-xs text-destructive">Failed to load theme</p>
				<p className="text-xs text-muted-foreground">{themeState.error}</p>
			</div>
		);
	}

	// At this point, status is "ready" and currentTheme exists (assert the type)
	if (!themeState.currentTheme) {
		return (
			<div className="flex justify-center items-center h-full">
				<p className="text-xs text-muted-foreground">No theme available</p>
			</div>
		);
	}
	const currentTheme = themeState.currentTheme;

	// Convert theme to color items for ColorsSection
	const themeColors: Array<{
		theme: "light" | "dark";
		colors: ThemeColorItem[];
	}> = (() => {
		const colors: ThemeColorItem[] = [];

		// Process light theme colors
		const allLightEntries = Object.entries(currentTheme.lightTheme);
		console.log("[ThemeEditor] Light theme entries:", allLightEntries);

		const lightThemeEntries = allLightEntries.filter(([key, value]) => {
			if (key === "radius") return false;
			if (value === undefined) {
				console.warn(
					`[ThemeEditor] Undefined light theme value for key: ${key}`,
				);
				return false;
			}
			return true;
		});

		for (const [key, hslValue] of lightThemeEntries) {
			const hexValue = hslToHex(hslValue);
			colors.push({
				name: key,
				displayName: key.replace(/([A-Z])/g, " $1").toLowerCase(),
				value: hslValue,
				hexValue,
				category: getCategoryForColor(key),
				theme: "light",
				description: getDescriptionForColor(key),
				themeName: "Current Theme",
				themeId: "current",
			});
		}

		// Process dark theme colors
		const allDarkEntries = Object.entries(currentTheme.darkTheme);
		console.log("[ThemeEditor] Dark theme entries:", allDarkEntries);

		const darkThemeEntries = allDarkEntries.filter(([key, value]) => {
			if (key === "radius") return false;
			if (value === undefined) {
				console.warn(
					`[ThemeEditor] Undefined dark theme value for key: ${key}`,
				);
				return false;
			}
			return true;
		});

		for (const [key, hslValue] of darkThemeEntries) {
			const hexValue = hslToHex(hslValue);
			colors.push({
				name: key,
				displayName: key.replace(/([A-Z])/g, " $1").toLowerCase(),
				value: hslValue,
				hexValue,
				category: getCategoryForColor(key),
				theme: "dark",
				description: getDescriptionForColor(key),
				themeName: "Current Theme",
				themeId: "current",
			});
		}

		return [
			{
				theme: "light" as const,
				colors: colors
					.filter((c) => c.theme === "light")
					.sort((a, b) => {
						const aIndex = COLOR_CATEGORY_ORDER.indexOf(a.category);
						const bIndex = COLOR_CATEGORY_ORDER.indexOf(b.category);
						return aIndex - bIndex;
					}),
			},
			{
				theme: "dark" as const,
				colors: colors
					.filter((c) => c.theme === "dark")
					.sort((a, b) => {
						const aIndex = COLOR_CATEGORY_ORDER.indexOf(a.category);
						const bIndex = COLOR_CATEGORY_ORDER.indexOf(b.category);
						return aIndex - bIndex;
					}),
			},
		];
	})();

	const handleThemeSelect = async (themeId: string) => {
		setSelectedThemeId(themeId);

		if (themeId === "custom") {
			// Return to initial theme
			await updateTheme({
				lightTheme: themeState.initialTheme?.lightTheme,
				darkTheme: themeState.initialTheme?.darkTheme,
				fonts: themeState.initialTheme?.fonts,
			});
			toast.success("Reset to initial theme");
			return;
		}

		const selectedTheme = themes?.find((t) => t._id === themeId);
		if (!selectedTheme) return;

		// Update theme via Convex mutation (replaces entire theme)
		try {
			await updateTheme({
				lightTheme: selectedTheme.lightTheme,
				darkTheme: selectedTheme.darkTheme,
				fonts: {
					sans:
						selectedTheme.fonts?.find((f) => f.family === "sans")?.name ||
						"Inter",
					serif:
						selectedTheme.fonts?.find((f) => f.family === "serif")?.name ||
						"Georgia",
					mono:
						selectedTheme.fonts?.find((f) => f.family === "mono")?.name ||
						"JetBrains Mono",
				},
			});

			toast.success(`Applied theme: ${selectedTheme.name}`);
		} catch (error) {
			console.error("Failed to apply theme:", error);
			toast.error("Failed to apply theme");
		}
	};

	// Color click handler - opens color selector modal
	const handleColorClick = (color: {
		name: string;
		displayName: string;
		hexValue: string;
		description: string;
		theme: "light" | "dark";
	}) => {
		// Switch to the theme mode of the clicked color
		if (previewThemeMode !== color.theme) {
			setPreviewThemeMode(color.theme);
		}

		setColorSelectorModalState((prev) => {
			return {
				...prev,
				isOpen: true,
				color: color.hexValue,
				activeTab: "library",
				onSelect: async (selectedColor) => {
					// Convert hex to HSL
					const hslValue = hexToHsl(selectedColor);

					// Update theme via mutation
					try {
						if (color.theme === "light") {
							await updateTheme({
								lightTheme: {
									[color.name]: hslValue,
								},
							});
						} else {
							await updateTheme({
								darkTheme: {
									[color.name]: hslValue,
								},
							});
						}
					} catch (error) {
						console.error("Failed to update color:", error);
						toast.error("Failed to update color");
					}
				},
			};
		});
	};

	// Radius update handler
	const handleRadiusUpdate = async (radius: string) => {
		try {
			await updateTheme({
				lightTheme: {
					radius,
				},
			});
		} catch (error) {
			console.error("Failed to update radius:", error);
		}
	};

	// Font update handler
	const handleFontUpdate = async (
		family: "sans" | "serif" | "mono",
		fontName: string,
	) => {
		try {
			await updateTheme({
				fonts: {
					[family]: fontName,
				},
			});
		} catch (error) {
			console.error("Failed to update font:", error);
		}
	};

	const selectedTheme = themes?.find((theme) => theme._id === selectedThemeId);

	return (
		<div className="flex flex-col h-full">
			{/* Content */}
			<ScrollArea className="flex-1">
				<div>
					{/* Quick Theme Selector */}
					<div className="px-2 py-4 space-y-2 border-b">
						<div>
							<Label className="text-sm font-medium">Brand Themes</Label>
							<p className="text-xs text-muted-foreground">
								Select from your existing themes or update the current theme.
							</p>
						</div>
						<Popover open={themePopoverOpen} onOpenChange={setThemePopoverOpen}>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									role="combobox"
									aria-expanded={themePopoverOpen}
									className="justify-between w-full h-8 font-normal text-left bg-muted"
								>
									<div className="flex flex-1 gap-3 items-center min-w-0">
										{selectedTheme ? (
											<>
												{/* Color swatches */}
												<div className="flex gap-1 items-center shrink-0">
													{getThemeColors(selectedTheme)
														.slice(0, 4)
														.map((color, index) => (
															<div
																key={`${selectedTheme._id}-${color}-${index}`}
																className="rounded-sm border size-3"
																style={{
																	backgroundColor: color,
																}}
															/>
														))}
												</div>
												<div className="flex-1 min-w-0">
													<div className="text-sm font-medium truncate">
														{selectedTheme.name}
													</div>
												</div>
											</>
										) : (
											<span className="text-muted-foreground">
												Project Theme{" "}
												<span className="text-xs text-muted-foreground">
													(Current)
												</span>
											</span>
										)}
									</div>
									<ChevronDown className="ml-2 w-4 h-4 opacity-50 shrink-0" />
								</Button>
							</PopoverTrigger>
							<PopoverContent
								className="w-[--radix-popover-trigger-width] p-0"
								align="start"
							>
								<Command>
									<CommandInput
										placeholder="Search themes..."
										className="h-9"
									/>
									<CommandList>
										<CommandEmpty>No themes found.</CommandEmpty>
										<CommandGroup>
											<CommandItem
												value="custom"
												onSelect={() => {
													setSelectedThemeId("custom");
													setThemePopoverOpen(false);
													handleThemeSelect("custom");
												}}
												className="cursor-pointer"
											>
												<div className="flex gap-3 items-center w-full">
													<div className="flex-1 min-w-0">
														<div className="text-sm font-medium">
															Project Theme{" "}
															<span className="text-xs text-muted-foreground">
																(Current)
															</span>
														</div>
													</div>
													<Check
														className={cn(
															"ml-auto h-4 w-4 shrink-0",
															selectedThemeId === "custom"
																? "opacity-100"
																: "opacity-0",
														)}
													/>
												</div>
											</CommandItem>
											{themes?.map((theme) => (
												<CommandItem
													key={theme._id}
													value={theme.name}
													onSelect={() => {
														setSelectedThemeId(theme._id);
														setThemePopoverOpen(false);
														handleThemeSelect(theme._id);
													}}
													className="cursor-pointer"
												>
													<div className="flex gap-3 items-center w-full">
														<div className="flex-1 min-w-0">
															<div className="flex gap-2 items-center">
																<div className="text-sm font-medium">
																	{theme.name}
																</div>
																{/* Color swatches */}
																<div className="flex gap-1 items-center shrink-0">
																	{getThemeColors(theme)
																		.slice(0, 4)
																		.map((color, index) => (
																			<Tooltip
																				key={`${theme._id}-${color}-${index}`}
																				disableHoverableContent
																			>
																				<TooltipTrigger asChild>
																					<div
																						className="rounded-sm border size-3"
																						style={{
																							backgroundColor: color,
																						}}
																					/>
																				</TooltipTrigger>
																				<TooltipContent
																					side="top"
																					className="text-xs"
																				>
																					{color}
																				</TooltipContent>
																			</Tooltip>
																		))}
																</div>
															</div>
															{theme.description && (
																<div className="text-xs text-muted-foreground">
																	{theme.description}
																</div>
															)}
														</div>

														<Check
															className={cn(
																"ml-auto h-4 w-4 shrink-0",
																selectedThemeId === theme._id
																	? "opacity-100"
																	: "opacity-0",
															)}
														/>
													</div>
												</CommandItem>
											))}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
					</div>

					{/* Sections - Pass currentTheme and update handlers */}
					<ThemeColorsControls
						themes={themeColors}
						onColorClick={handleColorClick}
						previewThemeMode={previewThemeMode}
						setPreviewThemeMode={setPreviewThemeMode}
					/>

					<RadiusControl
						currentRadius={currentTheme.lightTheme.radius}
						onRadiusChange={handleRadiusUpdate}
						isLoading={false}
					/>

					<TypographyControl
						currentFonts={currentTheme.fonts}
						onFontChange={handleFontUpdate}
						isLoading={false}
					/>
				</div>
			</ScrollArea>
		</div>
	);
};
