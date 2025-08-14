"use client";

import { useNewDomainModal } from "@/hooks/ui/use-new-domain-modal";
import {
	AnimatedTabs,
	type TabItem,
} from "@firebuzz/ui/components/ui/animated-tabs";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Globe } from "@firebuzz/ui/icons/lucide";
import { useCallback } from "react";

const TABS: TabItem[] = [
	{
		value: "domains",
		icon: Globe,
		label: "Domains",
	},
];

export const DomainsTabs = ({
	currentTab,
	setCurrentTab,
}: {
	currentTab: "domains";
	setCurrentTab: (tab: "domains") => void;
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
				onValueChange={(value) => setCurrentTab(value as "domains")}
				indicatorPadding={0}
				tabsContainerClassName="flex items-center gap-2"
				withBorder={false}
				indicatorRelativeToParent
			/>

			{/* Buttons */}
			<div className="flex items-center gap-2">
				<Button variant="outline" size="sm" onClick={handleNew}>
					Add Domain
					<ButtonShortcut>⌘N</ButtonShortcut>
				</Button>
			</div>
		</div>
	);
};
