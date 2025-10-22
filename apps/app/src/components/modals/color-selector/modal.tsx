import {
	AnimatedTabs,
	type TabItem,
} from "@firebuzz/ui/components/ui/animated-tabs";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { GalleryHorizontal, Layers2, Palette } from "@firebuzz/ui/icons/lucide";
import { useHotkeys } from "react-hotkeys-hook";
import { useColorSelectorModal } from "@/hooks/ui/use-color-selector-modal";
import { CustomColorPicker } from "./custom";
import { ColorLibrary } from "./library";
import { SystemColors } from "./system";
import { ThemeColors } from "./themes";
import { useMemo, useEffect } from "react";

const ALL_TABS: TabItem[] = [
	{
		value: "system",
		icon: Palette,
		label: "Current",
	},
	{
		value: "themes",
		icon: Layers2,
		label: "Themes",
	},
	{
		value: "library",
		icon: GalleryHorizontal,
		label: "Library",
	},
	{
		value: "custom",
		icon: Palette,
		label: "Custom",
	},
] as const;

export const ColorSelectorModal = () => {
	const {
		isOpen,
		setIsOpen,
		activeTab,
		setActiveTab,
		color,
		onSelect,
		systemColors,
	} = useColorSelectorModal();

	// Filter tabs based on system colors availability
	const availableTabs = useMemo(() => {
		if (systemColors.length === 0) {
			return ALL_TABS.filter((tab) => tab.value !== "system");
		}
		return ALL_TABS;
	}, [systemColors.length]);

	// If active tab is "system" but system colors are empty, switch to first available tab
	useEffect(() => {
		if (activeTab === "system" && systemColors.length === 0) {
			setActiveTab(availableTabs[0]?.value as typeof activeTab);
		}
	}, [activeTab, systemColors.length, availableTabs, setActiveTab]);

	useHotkeys(
		"enter",
		() => {
			if (color) {
				onSelect(color);
				setIsOpen(false);
			}
		},
		{
			preventDefault: true,
		},
	);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="sm:max-w-[400px] sm:h-[60vh] h-[80vh] flex flex-col !gap-0 !p-0">
				<DialogHeader className="px-4 py-4 border-b">
					<DialogTitle>Select Color</DialogTitle>
					<DialogDescription>
						Choose from a library, theme colors, or create a custom color.
					</DialogDescription>
				</DialogHeader>

				<AnimatedTabs
					tabs={availableTabs}
					value={activeTab}
					defaultValue={availableTabs[0]?.value as typeof activeTab}
					onValueChange={(value) =>
						setActiveTab(value as "system" | "library" | "custom" | "themes")
					}
					className="px-4"
					indicatorPadding={16}
				/>

				<div className="flex flex-col flex-1 h-full overflow-hidden">
					{activeTab === "system" && <SystemColors />}
					{activeTab === "library" && <ColorLibrary />}
					{activeTab === "themes" && <ThemeColors />}
					{activeTab === "custom" && <CustomColorPicker />}
				</div>

				<DialogFooter className="px-4 py-2 border-t">
					<Button
						disabled={!color}
						variant="outline"
						className="flex items-center w-full gap-2"
						size="sm"
						onClick={() => {
							if (color) {
								onSelect(color);
								setIsOpen(false);
							}
						}}
					>
						Select{" "}
						<div className="flex items-center gap-1">
							<div
								className="border rounded-sm size-4"
								style={{ backgroundColor: color }}
							/>
							<div className="font-mono text-xs text-muted-foreground">
								{color}
							</div>
						</div>{" "}
						<ButtonShortcut>Enter</ButtonShortcut>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
