"use client";
import { useProject } from "@/hooks/auth/use-project";
import { api, useCachedQuery } from "@firebuzz/convex";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Sidebar, SidebarContent } from "@firebuzz/ui/components/ui/sidebar";
import { cn } from "@firebuzz/ui/lib/utils";
import { formatFileSize } from "@firebuzz/utils";
import NumberFlow from "@number-flow/react";

// TODO: Update with actual document-related information and limits
export const DocumentsSidebar = () => {
	const { currentProject } = useProject();

	// Fetch total size of documents
	const totalSize = useCachedQuery(
		api.collections.storage.documents.queries.getTotalSize, // Changed to documents query
		currentProject
			? {
					projectId: currentProject._id,
				}
			: "skip",
	);

	// TODO: Define appropriate storage limits for documents
	// For now, using the same as media as a placeholder
	const MAX_STORAGE = 1024 * 1024 * 1024; // 1GB in bytes
	const usedStorage = totalSize ?? 0;
	const percentageUsed = Math.max(
		Math.min(Math.round((usedStorage / MAX_STORAGE) * 100), 100),
		1,
	);

	return (
		<Sidebar side="right" collapsible="offcanvas">
			<SidebarContent className="flex flex-col justify-end gap-6 p-4">
				<div className="p-4 border rounded-lg border-border">
					<div>
						<div className="text-lg font-bold leading-none">
							<NumberFlow
								value={Number(formatFileSize(usedStorage, "MB"))}
								suffix="MB"
								locales="en-US"
							/>{" "}
							used
						</div>
						<div className="text-sm text-muted-foreground">
							of {formatFileSize(MAX_STORAGE, "GB", 0)} GB available
						</div>
					</div>
					{/* Bar */}
					<div className="w-full h-2 my-2 rounded-md bg-accent">
						<div
							className={cn(
								"h-full bg-primary transition-all duration-300 ease-in-out",
								percentageUsed === 100 ? "rounded-md" : "rounded-l-md",
							)}
							style={{ width: `${percentageUsed}%` }}
						/>
					</div>
					<div className="text-xs text-muted-foreground">
						You can always upgrade your plan for more storage.
					</div>
					<div className="flex gap-2 mt-4">
						<Button variant="outline" className="w-full h-8">
							Upgrade
						</Button>
					</div>
				</div>
				<div className="space-y-2">
					<div className="text-xs text-muted-foreground">
						{/* TODO: Update text for documents */}
						Archived documents shown as{" "}
						<span className="font-bold">grayed out</span> and are still{" "}
						<span className="font-bold">
							counted towards your storage limit.
						</span>
					</div>
				</div>
			</SidebarContent>
		</Sidebar>
	);
};
