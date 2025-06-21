"use client";

import {
	AnimatedTabs,
	type TabItem,
} from "@firebuzz/ui/components/ui/animated-tabs";
import {
	BarChart3,
	CreditCard,
	Plus,
	Receipt,
} from "@firebuzz/ui/icons/lucide";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: TabItem[] = [
	{
		value: "plan",
		href: "/settings/subscription",
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
	{
		value: "add-ons",
		href: "/settings/subscription/add-ons",
		icon: Plus,
		label: "Add-ons",
	},
];

export const SubscriptionSettingsTabs = () => {
	const pathname = usePathname();

	return (
		<div className="relative flex items-center justify-between px-2 border-b">
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
