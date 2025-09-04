"use client";

import { AnimatedButton } from "@/components/reusables/animated-button";
import { useCampaignNavigation } from "@/hooks/ui/use-campaign-navigation";
import { useNewLandingPageModal } from "@/hooks/ui/use-new-landing-page-modal";
import { type Doc, api, useCachedQuery } from "@firebuzz/convex";
import { AlertCircle } from "@firebuzz/ui/icons/lucide";
import { Panel } from "@xyflow/react";
import { useRouter } from "next/navigation";

interface CriticalErrorsPanelProps {
	campaign: Doc<"campaigns">;
}

export const CriticalErrorsPanel = ({ campaign }: CriticalErrorsPanelProps) => {
	const router = useRouter();
	const [_state, { openModal }] = useNewLandingPageModal();
	const [, setNavigationState] = useCampaignNavigation();

	// Get validation data from server
	const validation = useCachedQuery(
		api.collections.campaigns.validation.getCampaignValidation,
		{ campaignId: campaign._id },
	);

	const criticalErrors = validation?.criticalErrors || [];

	// Only show the first critical error (highest priority)
	const currentError = criticalErrors[0];

	if (!currentError) {
		return null;
	}

	const handleCreateForm = () => {
		const formPath = `/campaigns/${campaign._id}/form`;
		router.push(formPath);
	};

	const handleCreateLandingPage = () => {
		openModal(campaign._id);
	};

	const handleConfigureCTA = () => {
		// Set screen to overview and highlight CTA link field
		setNavigationState({ screen: "overview", highlight: "ctaLink" });
	};

	// Determine action button based on error type
	const renderActionButton = () => {
		if (
			currentError.id === "campaign-no-form" ||
			currentError.id === "campaign-form-no-fields"
		) {
			return (
				<AnimatedButton
					className="flex gap-2 items-center"
					variant="outline"
					onClick={handleCreateForm}
				>
					Create Form Schema
				</AnimatedButton>
			);
		}

		if (currentError.id === "campaign-no-landing-pages") {
			return (
				<AnimatedButton
					className="flex gap-2 items-center"
					variant="outline"
					onClick={handleCreateLandingPage}
				>
					Create Landing Page
				</AnimatedButton>
			);
		}

		if (currentError.id === "campaign-no-cta-link") {
			return (
				<AnimatedButton
					className="flex gap-2 items-center"
					variant="outline"
					onClick={handleConfigureCTA}
				>
					Configure CTA Link
				</AnimatedButton>
			);
		}

		return null;
	};

	return (
		<Panel
			position="top-center"
			className="w-full max-w-5xl pointer-events-auto"
		>
			<div className="flex justify-between items-center px-3 py-2 w-full rounded-md border shadow-md duration-300 bg-muted animate-in slide-in-from-top-2">
				<div className="flex flex-1 gap-4 items-center">
					<div className="flex-shrink-0 mt-0.5">
						<div className="p-1.5 rounded-md bg-muted border  text-yellow-500">
							<AlertCircle className="size-3.5" />
						</div>
					</div>
					<h3 className="text-sm font-medium text-primary">
						{currentError.message}
					</h3>
				</div>
				{renderActionButton()}
			</div>
		</Panel>
	);
};
