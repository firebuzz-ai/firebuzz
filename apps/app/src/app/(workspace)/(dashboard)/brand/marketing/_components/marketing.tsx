"use client";

import { parseAsStringLiteral, useQueryStates } from "nuqs";
import { EditAudienceModal } from "@/components/modals/audience/edit-audience-modal";
import { NewAudienceModal } from "@/components/modals/audience/new-audience-modal";
import { NewFeatureModal } from "@/components/modals/feature/new-feature-modal";
import { MediaGalleryModal } from "@/components/modals/media/gallery/gallery-modal";
import { EditSocialModal } from "@/components/modals/social/edit-social-modal";
import { NewSocialModal } from "@/components/modals/social/new-social-modal";
import { EditTestimonialModal } from "@/components/modals/testimonial/edit-testimonial-modal";
import { NewTestimonialModal } from "@/components/modals/testimonial/new-testimonial-modal";
import { MarketingTabs } from "@/components/navigation/brand/marketing-tabs";
import { Audiences } from "./audiences/audiences";
import { Features } from "./features/features";
import { Socials } from "./socials/socials";
import { Testimonials } from "./testimonials/testimonials";

export const Marketing = () => {
	const [{ tab: currentTab }, setCurrentTab] = useQueryStates({
		tab: parseAsStringLiteral([
			"audiences",
			"features",
			"testimonials",
			"socials",
		] as const),
	});
	return (
		<div className="relative flex flex-col flex-1 max-w-full max-h-full overflow-hidden">
			<MarketingTabs
				currentTab={currentTab ?? "audiences"}
				setCurrentTab={(
					tab: "audiences" | "features" | "testimonials" | "socials",
				) => {
					setCurrentTab({ tab });
				}}
			/>

			{currentTab === "audiences" && <Audiences />}
			{currentTab === "features" && <Features />}
			{currentTab === "testimonials" && <Testimonials />}
			{currentTab === "socials" && <Socials />}

			<NewAudienceModal />
			<EditAudienceModal />
			<NewFeatureModal />
			<NewTestimonialModal />
			<EditTestimonialModal />
			<NewSocialModal />
			<EditSocialModal />
			<MediaGalleryModal />
		</div>
	);
};
