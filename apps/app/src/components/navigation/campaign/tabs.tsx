"use client";

import { Presence } from "@/components/presence/presence";
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
import { Separator } from "@firebuzz/ui/components/ui/separator";
import { ChartBar, Database, Table, Workflow } from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

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
];

export const CampaignTabs = ({ id }: CampaignTabsProps) => {
	const pathname = usePathname();

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
	const roomId = useMemo(() => {
		return `campaign-room-${id}`;
	}, [id]);

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
			<div className="flex gap-4 items-center">
				<Presence roomId={roomId} />
				<Separator orientation="vertical" className="h-4" />
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
