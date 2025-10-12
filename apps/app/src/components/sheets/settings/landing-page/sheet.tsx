"use client";

import type { Id } from "@firebuzz/convex/nextjs";
import {
	AnimatedTabs,
	type TabItem,
} from "@firebuzz/ui/components/ui/animated-tabs";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { ScrollArea } from "@firebuzz/ui/components/ui/scroll-area";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@firebuzz/ui/components/ui/sheet";
import { Globe, Layers, Tag } from "@firebuzz/ui/icons/lucide";
import { useCallback, useState } from "react";
import { MediaGalleryModal } from "@/components/modals/media/gallery/gallery-modal";
import { useSheet } from "@/hooks/ui/use-sheet";
import { PageTab } from "./tabs/page";
import { SeoTab } from "./tabs/seo";
import { TagsTab } from "./tabs/tags";

interface LandingPageSettingsSheetProps {
	landingPageId: Id<"landingPages">;
}

export const LandingPageSettingsSheet = ({
	landingPageId,
}: LandingPageSettingsSheetProps) => {
	const { isOpen, setIsOpen } = useSheet("landing-page-settings");
	const [isSaving, setIsSaving] = useState(false);
	const [activeTab, setActiveTab] = useState("page-settings");
	const [unsavedChanges, setUnsavedChanges] = useState(false);
	const [saveHandler, setSaveHandler] = useState<(() => Promise<void>) | null>(
		null,
	);

	const tabs: TabItem[] = [
		{
			value: "page-settings",
			label: "Page",
			icon: Layers,
		},
		{
			value: "seo",
			label: "SEO",
			icon: Globe,
		},
		{
			value: "tags",
			label: "Tags",
			icon: Tag,
		},
	];

	// Handle save button click
	const handleSave = useCallback(async () => {
		if (!saveHandler || !unsavedChanges) return;

		try {
			setIsSaving(true);
			await saveHandler();
		} catch (error) {
			console.error("Failed to save:", error);
		} finally {
			setIsSaving(false);
		}
	}, [saveHandler, unsavedChanges]);

	return (
		<Sheet open={isOpen} onOpenChange={setIsOpen}>
			<SheetContent>
				<div className="flex flex-col w-full h-full">
					{/* Header */}
					<SheetHeader className="relative px-0 py-0 border-b">
						<AnimatedTabs
							tabs={tabs}
							value={activeTab}
							onValueChange={setActiveTab}
							indicatorRelativeToParent
							indicatorPadding={0}
							withBorder={false}
						/>
						<SheetTitle className="sr-only">
							Landing Page Configuration
						</SheetTitle>
						<SheetDescription className="sr-only">
							Configure settings for your landing page.
						</SheetDescription>
					</SheetHeader>
					{/* Content */}
					<div className="flex flex-col flex-1 max-h-full overflow-hidden">
						{/* Tabs */}
						<ScrollArea className="flex-1">
							{activeTab === "page-settings" && (
								<PageTab
									setSaveHandler={setSaveHandler}
									setUnsavedChanges={setUnsavedChanges}
									landingPageId={landingPageId}
								/>
							)}

							{activeTab === "seo" && (
								<SeoTab
									setSaveHandler={setSaveHandler}
									setUnsavedChanges={setUnsavedChanges}
									landingPageId={landingPageId}
								/>
							)}

							{activeTab === "tags" && (
								<TagsTab
									setSaveHandler={setSaveHandler}
									setUnsavedChanges={setUnsavedChanges}
									landingPageId={landingPageId}
								/>
							)}
						</ScrollArea>
					</div>
					<SheetFooter className="p-2 border-t">
						<Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
							Cancel <ButtonShortcut>Esc</ButtonShortcut>
						</Button>
						<Button
							size="sm"
							type="button"
							variant="outline"
							onClick={handleSave}
							disabled={!unsavedChanges || isSaving}
						>
							{isSaving ? "Saving..." : "Save Changes"}
							<ButtonShortcut>⌘S</ButtonShortcut>
						</Button>
					</SheetFooter>
				</div>
			</SheetContent>
			<MediaGalleryModal />
		</Sheet>
	);
};
