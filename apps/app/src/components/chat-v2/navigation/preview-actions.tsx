"use client";

import { Presence } from "@/components/presence/presence";
import { useLandingPageContext } from "@/hooks/agent/use-landing-page";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import { PublishButton } from "./publish-button";

export const PreviewActions = () => {
	const { landingPageId } = useLandingPageContext();

	return (
		<div className="flex gap-2 justify-end items-center h-full">
			<Presence size="sm" roomId={landingPageId} maxVisible={3} />
			<Separator orientation="vertical" className="h-4" />
			<PublishButton />
		</div>
	);
};
