"use client";

import { cn } from "@firebuzz/ui/lib/utils";
import { usePreviewTabs } from "@/hooks/agent/use-preview-tabs";
import { Analytics } from "./analytics";
import { PageSpeed } from "./page-speed";
import { Preview } from "./preview";
import { Seo } from "./seo";
import { TagsTab } from "./tags";

export const PreviewTabs = () => {
	const { activeTab } = usePreviewTabs();

	return (
		<div className="relative w-full h-full">
			{/* Preview is always mounted but invisible when other tabs are active */}
			<div
				className={cn(activeTab !== "preview" && "invisible", "w-full h-full")}
			>
				<Preview />
			</div>

			{/* Other tabs overlay on top of preview */}
			{activeTab === "analytics" && (
				<div className="absolute inset-0 z-10">
					<Analytics />
				</div>
			)}
			{activeTab === "page-speed" && (
				<div className="absolute inset-0 z-10">
					<PageSpeed />
				</div>
			)}
			{activeTab === "seo" && (
				<div className="absolute inset-0 z-10">
					<Seo />
				</div>
			)}
			{activeTab === "tags" && (
				<div className="absolute inset-0 z-10">
					<TagsTab />
				</div>
			)}
		</div>
	);
};
