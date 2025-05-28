"use client";

import { useNewAudienceModal } from "@/hooks/ui/use-new-audience-modal";
import { useNewFeatureModal } from "@/hooks/ui/use-new-feature-modal";
import { useNewSocialModal } from "@/hooks/ui/use-new-social-modal";
import { useNewTestimonialModal } from "@/hooks/ui/use-new-testimonial-modal";
import {
	AnimatedTabs,
	type TabItem,
} from "@firebuzz/ui/components/ui/animated-tabs";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Hash, Star, Table2, Users } from "@firebuzz/ui/icons/lucide";
import { useCallback, useMemo } from "react";

const TABS: TabItem[] = [
	{
		value: "audiences",
		icon: Users,
		label: "Audiences",
	},
	{
		value: "features",
		icon: Table2,
		label: "Features & Services",
	},
	{
		value: "testimonials",
		icon: Star,
		label: "Testimonials",
	},
	{
		value: "socials",
		icon: Hash,
		label: "Social Media",
	},
];

export const MarketingTabs = ({
	currentTab,
	setCurrentTab,
}: {
	currentTab: "audiences" | "features" | "testimonials" | "socials";
	setCurrentTab: (
		tab: "audiences" | "features" | "testimonials" | "socials",
	) => void;
}) => {
	const [, setNewAudienceModal] = useNewAudienceModal();
	const [, setNewFeatureModal] = useNewFeatureModal();
	const [, setNewTestimonialModal] = useNewTestimonialModal();
	const [, setNewSocialModal] = useNewSocialModal();

	const buttonTitle = useMemo(() => {
		if (currentTab === "audiences") {
			return "New Audience";
		}
		if (currentTab === "features") {
			return "New Feature & Service";
		}
		if (currentTab === "socials") {
			return "Add Social Account";
		}
		return "New Testimonial";
	}, [currentTab]);

	// Handle save
	const handleNew = useCallback(() => {
		if (currentTab === "audiences") {
			setNewAudienceModal({ create: true });
		} else if (currentTab === "features") {
			setNewFeatureModal({ create: true });
		} else if (currentTab === "socials") {
			setNewSocialModal({ create: true });
		} else {
			setNewTestimonialModal({ create: true });
		}
	}, [
		currentTab,
		setNewAudienceModal,
		setNewFeatureModal,
		setNewSocialModal,
		setNewTestimonialModal,
	]);

	return (
		<div className="relative flex items-center justify-between px-2 border-b">
			{/* Tabs */}
			<AnimatedTabs
				tabs={TABS}
				value={currentTab}
				onValueChange={(value) =>
					setCurrentTab(
						value as "audiences" | "features" | "testimonials" | "socials",
					)
				}
				indicatorPadding={0}
				tabsContainerClassName="flex items-center gap-2"
				withBorder={false}
				indicatorRelativeToParent
			/>

			{/* Buttons */}
			<div className="flex items-center gap-2">
				<Button variant="outline" size="sm" onClick={handleNew}>
					{buttonTitle}
					<ButtonShortcut>⌘N</ButtonShortcut>
				</Button>
			</div>
		</div>
	);
};
