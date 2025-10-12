"use client";

import type { Id } from "@firebuzz/convex/nextjs";
import { useIsMobile } from "@firebuzz/ui/hooks/use-mobile";
import { DesktopLayout } from "./layouts/desktop";
import { MobileLayout } from "./layouts/mobile";

export const Edit = ({
	landingPageId,
	campaignId,
}: {
	landingPageId: Id<"landingPages">;
	campaignId: Id<"campaigns">;
}) => {
	const isMobile = useIsMobile();

	return isMobile ? (
		<MobileLayout />
	) : (
		<DesktopLayout landingPageId={landingPageId} campaignId={campaignId} />
	);
};
