"use client";

import type { Id } from "@firebuzz/convex";
import {
	AnimatedTabs,
	type TabItem,
} from "@firebuzz/ui/components/ui/animated-tabs";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import {
	ChartBar,
	Database,
	FileText,
	Table,
	Workflow,
} from "@firebuzz/ui/icons/lucide";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { Presence } from "@/components/presence/presence";
import { CampaignStatusButton } from "./campaign-status-button";

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
		value: "landing-pages",
		href: "/landing-pages",
		icon: FileText,
		label: "Landing Pages",
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

	// Update tabs with complete hrefs
	const tabsWithFullPaths: TabItem[] = TABS.map((tab) => ({
		...tab,
		href: `/campaigns/${id}${tab.href}`,
	}));

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
				<Presence size="sm" roomId={roomId} />
				<Separator orientation="vertical" className="h-4" />
				<CampaignStatusButton campaignId={id as Id<"campaigns">} />
			</div>
		</div>
	);
};
