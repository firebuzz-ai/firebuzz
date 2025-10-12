"use client";

import { Separator } from "@firebuzz/ui/components/ui/separator";
import { useLandingPageContext } from "@/components/chat-v2/providers/landing-page-provider";
import { Presence } from "@/components/presence/presence";
import { PublishButton } from "./publish-button";

export const PreviewActions = () => {
	const { landingPageId } = useLandingPageContext();

	return (
		<div className="flex gap-2 justify-end items-center h-full">
			<Presence roomId={landingPageId} maxVisible={3} />
			<Separator orientation="vertical" className="h-4" />
			<PublishButton />
		</div>
	);
};
