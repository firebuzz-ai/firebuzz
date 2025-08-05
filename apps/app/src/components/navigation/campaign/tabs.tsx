"use client";

import {
	ConvexError,
	type Id,
	api,
	useMutation,
	useQuery,
} from "@firebuzz/convex";
import {
	AnimatedTabs,
	type TabItem,
} from "@firebuzz/ui/components/ui/animated-tabs";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import {
	ChartBar,
	Database,
	Settings,
	Table,
	Workflow,
} from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { useReactFlow } from "@xyflow/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface CampaignTabsProps {
	id: string;
}

const TABS: TabItem[] = [
	{
		value: "edit",
		href: "/edit",
		icon: Workflow,
		label: "Edit",
	},
	{
		value: "form",
		href: "/form",
		icon: Table,
		label: "Form",
	},
	{
		value: "data",
		href: "/data",
		icon: Database,
		label: "Data",
	},
	{
		value: "analytics",
		href: "/analytics",
		icon: ChartBar,
		label: "Analytics",
	},
	{
		value: "settings",
		href: "/settings",
		icon: Settings,
		label: "Settings",
	},
];

export const CampaignTabs = ({ id }: CampaignTabsProps) => {
	const pathname = usePathname();
	const reactFlowInstance = useReactFlow();

	// Mutations
	const updateCampaign = useMutation(
		api.collections.campaigns.mutations.update,
	);
	const publishCampaign = useMutation(
		api.collections.campaigns.mutations.publish,
	);

	// Get current campaign
	const campaign = useQuery(api.collections.campaigns.queries.getById, {
		id: id as Id<"campaigns">,
	});

	// Update tabs with complete hrefs
	const tabsWithFullPaths: TabItem[] = TABS.map((tab) => ({
		...tab,
		href: `/campaigns/${id}${tab.href}`,
	}));

	// Handle save
	const handleSave = async () => {
		if (!campaign) return;

		try {
			console.log("🔄 Save button clicked - calling canvas save function");

			// Check if we're on the edit page and canvas save is available
			if (pathname.includes("/edit")) {
				console.log("📊 Using canvas save function (includes nodes/edges)");

				await updateCampaign({
					id: id as Id<"campaigns">,
					projectId: campaign.projectId,
					config: reactFlowInstance.toObject(),
				});
			} else {
				console.log("📝 Using basic campaign save (metadata only)");
				// Fallback for non-edit pages - save basic campaign data
				await updateCampaign({
					id: id as Id<"campaigns">,
					projectId: campaign.projectId,
				});
			}

			toast.success("Campaign saved successfully");
		} catch (err) {
			const error = err as Error;
			toast.error("Failed to save campaign");
			console.error("Save error:", error.message);
		}
	};

	// Handle publish
	const handlePublish = async () => {
		try {
			await publishCampaign({
				id: id as Id<"campaigns">,
			});
			toast.success("Campaign published successfully");
		} catch (err) {
			const error = err as Error;
			if (error instanceof ConvexError) {
				toast.error(error.data);
			} else {
				toast.error("Failed to publish campaign");
				console.error("Publish error:", error.message);
			}
		}
	};

	const isLoading = campaign === undefined;
	const isDisabled = isLoading || !campaign;

	return (
		<div className="flex relative justify-between items-center px-2 border-b">
			{/* Tabs */}
			<AnimatedTabs
				tabs={tabsWithFullPaths}
				asLinks
				currentPath={pathname}
				indicatorPadding={0}
				tabsContainerClassName="flex items-center gap-2"
				linkComponent={Link}
				withBorder={false}
				indicatorRelativeToParent
			/>

			{/* Buttons */}
			<div className="flex gap-2 items-center">
				<Button
					variant="outline"
					size="sm"
					onClick={handleSave}
					disabled={isDisabled}
				>
					Save
					<ButtonShortcut>⌘S</ButtonShortcut>
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={handlePublish}
					disabled={isDisabled}
				>
					Publish
					<ButtonShortcut>⌘↵</ButtonShortcut>
				</Button>
			</div>
		</div>
	);
};
