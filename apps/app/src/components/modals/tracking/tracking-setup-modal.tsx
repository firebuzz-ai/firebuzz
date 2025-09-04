"use client";

import {
	parseTrackingSetupState,
	useTrackingSetupModal,
} from "@/hooks/ui/use-tracking-setup-modal";
import { envVercel } from "@firebuzz/env";
import {
	AnimatedTabs,
	type TabItem,
} from "@firebuzz/ui/components/ui/animated-tabs";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { Code2 } from "@firebuzz/ui/icons/lucide";
import { GoogleTagManagerIcon } from "@firebuzz/ui/icons/social";
import { useState } from "react";
import { CustomCodeTab } from "./custom-code-tab";
import { GTMTab } from "./gtm-tab";
import { InternalTrackingContent } from "./internal-tracking-content";

const EXTERNAL_TRACKING_TABS: TabItem[] = [
	{
		value: "gtm",
		icon: GoogleTagManagerIcon,
		label: "GTM",
	},
	{
		value: "custom-code",
		icon: Code2,
		label: "Custom Code",
	},
] as const;

export const TrackingSetupModal = () => {
	const [state, setState] = useTrackingSetupModal();
	const [activeTab, setActiveTab] = useState<"gtm" | "custom-code">("gtm");
	const vercelEnv = envVercel();
	const environment = vercelEnv.VERCEL_ENV;
	const scriptUrl =
		environment === "production"
			? "https://engine.frbzz.com/track.js"
			: environment === "preview"
				? "https://engine-preview.frbzz.com/track.js"
				: "https://engine-dev.frbzz.com/track.js";

	const trackingSetupData = parseTrackingSetupState(state.trackingSetup);
	const isOpen = !!trackingSetupData;

	const handleClose = () => {
		setState({ trackingSetup: null });
	};

	if (!trackingSetupData) return null;

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(value) => {
				if (!value) {
					handleClose();
				}
			}}
		>
			<DialogContent
				onOpenAutoFocus={(e) => e.preventDefault()}
				className="sm:max-w-2xl w-full flex flex-col !gap-0 !p-0  h-full max-h-[70vh]"
			>
				<DialogHeader className="px-6 py-4 border-b">
					<div className="w-full">
						<DialogTitle>Setup Tracking</DialogTitle>
						<DialogDescription>
							Learn how to track the "{trackingSetupData.eventTitle}" event
						</DialogDescription>
					</div>
				</DialogHeader>

				{trackingSetupData.eventPlacement === "internal" ? (
					<div className="px-6 py-4">
						<InternalTrackingContent
							eventId={trackingSetupData.eventId}
							eventTitle={trackingSetupData.eventTitle}
						/>
					</div>
				) : (
					<>
						<AnimatedTabs
							tabs={EXTERNAL_TRACKING_TABS}
							value={activeTab}
							defaultValue="gtm"
							onValueChange={(value) =>
								setActiveTab(value as "gtm" | "custom-code")
							}
							className="px-6"
							indicatorPadding={24}
						/>

						<div className="flex overflow-hidden flex-col flex-1 h-full">
							{activeTab === "gtm" && (
								<GTMTab
									scriptUrl={scriptUrl}
									eventId={trackingSetupData.eventId}
									eventTitle={trackingSetupData.eventTitle}
									value={trackingSetupData.value}
									currency={trackingSetupData.currency}
								/>
							)}

							{activeTab === "custom-code" && (
								<CustomCodeTab
									scriptUrl={scriptUrl}
									eventId={trackingSetupData.eventId}
									eventTitle={trackingSetupData.eventTitle}
									value={trackingSetupData.value}
									currency={trackingSetupData.currency}
								/>
							)}
						</div>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
};
