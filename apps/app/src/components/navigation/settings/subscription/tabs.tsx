"use client";

import {
	AnimatedTabs,
	type TabItem,
} from "@firebuzz/ui/components/ui/animated-tabs";
import { BarChart3, CreditCard, Receipt } from "@firebuzz/ui/icons/lucide";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: TabItem[] = [
	{
		value: "plan",
		href: "/settings/subscription/plan",
		icon: CreditCard,
		label: "Plan",
	},
	{
		value: "billing",
		href: "/settings/subscription/billing",
		icon: Receipt,
		label: "Billing",
	},
	{
		value: "usage",
		href: "/settings/subscription/usage",
		icon: BarChart3,
		label: "Usage",
	},
];

export const SubscriptionSettingsTabs = () => {
	const pathname = usePathname();

	return (
		<div className="flex relative justify-between items-center px-2 border-b">
			{/* Tabs */}
			<AnimatedTabs
				tabs={TABS}
				asLinks
				currentPath={pathname}
				indicatorPadding={0}
				tabsContainerClassName="flex items-center gap-2"
				linkComponent={Link}
				withBorder={false}
				indicatorRelativeToParent
			/>
		</div>
	);
};
