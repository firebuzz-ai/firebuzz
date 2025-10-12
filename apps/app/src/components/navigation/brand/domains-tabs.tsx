"use client";

import {
	AnimatedTabs,
	type TabItem,
} from "@firebuzz/ui/components/ui/animated-tabs";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Globe, Globe2 } from "@firebuzz/ui/icons/lucide";
import { useCallback } from "react";
import { useNewDomainModal } from "@/hooks/ui/use-new-domain-modal";

const TABS: TabItem[] = [
	{
		value: "project-domains",
		icon: Globe2,
		label: "Project Domains",
	},
	{
		value: "custom-domains",
		icon: Globe,
		label: "Custom Domains",
	},
];

export const DomainsTabs = ({
	currentTab,
	setCurrentTab,
}: {
	currentTab: "project-domains" | "custom-domains";
	setCurrentTab: (tab: "project-domains" | "custom-domains") => void;
}) => {
	const [, setNewDomainModal] = useNewDomainModal();

	// Handle new domain
	const handleNew = useCallback(() => {
		setNewDomainModal({ create: true });
	}, [setNewDomainModal]);

	return (
		<div className="relative flex items-center justify-between px-2 border-b">
			{/* Tabs */}
			<AnimatedTabs
				tabs={TABS}
				value={currentTab}
				onValueChange={(value) =>
					setCurrentTab(value as "project-domains" | "custom-domains")
				}
				indicatorPadding={0}
				tabsContainerClassName="flex items-center gap-2"
				withBorder={false}
				indicatorRelativeToParent
			/>

			{/* Buttons */}
			<div className="flex items-center gap-2">
				{currentTab === "custom-domains" && (
					<Button variant="outline" size="sm" onClick={handleNew}>
						Add Custom Domain
						<ButtonShortcut>⌘N</ButtonShortcut>
					</Button>
				)}
			</div>
		</div>
	);
};
