"use client";

import { useAuth } from "@clerk/nextjs";
import { api, useCachedRichQuery } from "@firebuzz/convex";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { ArrowRightIcon, LogOut } from "@firebuzz/ui/icons/lucide";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useProject } from "@/hooks/auth/use-project";
import { useWorkspace } from "@/hooks/auth/use-workspace";
import { CompleteAnimation } from "../../_components/onboarding/complete-animation";
import { OnboardingFlowPreview } from "../../_components/onboarding/flow-preview";
import { Indicators } from "../../_components/onboarding/indicators";
import { Step1 } from "./step-1";
import { Step2 } from "./step-2";
import { Step3 } from "./step-3";
import { Step4 } from "./step-4";

// Define all the steps/nodes
const allSteps = [
	{
		id: 1,
		title: "🚀 Firebuzz Engine Start",
		subtitle: "Igniting the magic...",
	},
	{
		id: 2,
		title: "⏳ Waiting for input...",
		subtitle: "Drop your website URL here.",
	},
	{
		id: 3,
		title: "👀 Reading your Homepage",
		subtitle: "Scanning every pixel...",
	},
	{
		id: 4,
		title: "🎯 Choosing Best URLs",
		subtitle: "Hunting for brand gold...",
	},
	{
		id: 5,
		title: "⏳ Waiting for input...",
		subtitle: "Pick your favorites.",
	},
	{
		id: 6,
		title: "🕸️ Scraping URLs",
		subtitle: "Extracting brand DNA...",
	},
	{
		id: 7,
		title: "🧠 Generating Brand Data",
		subtitle: "AI is cooking something special...",
	},
	{
		id: 8,
		title: "⏳ Waiting for input...",
		subtitle: "Make it yours.",
	},
	{
		id: 9,
		title: "✨ Looking for brand visuals",
		subtitle: "Adding the final sparkle...",
	},
	{
		id: 10,
		title: "⏳ Waiting for input...",
		subtitle: "Pick your favorite visuals.",
	},
	{
		id: 11,
		title: "Fine tuning last details...",
		subtitle: "Almost there...",
	},
	{
		id: 12,
		title: "🎉 Woohaa!",
		subtitle: "Your brand is ready to buzz!",
	},
];

export const OnboardingFlow = () => {
	const router = useRouter();
	const { workspaces } = useWorkspace();
	const { projects } = useProject();
	const { signOut } = useAuth();

	const { data: onboarding, isPending: isOnboardingLoading } =
		useCachedRichQuery(
			api.collections.onboarding.queries.getCurrentProjectOnboarding,
		);

	const onboardingStep = useMemo(() => {
		if (!isOnboardingLoading && onboarding?.step) return onboarding.step;
		return 1;
	}, [isOnboardingLoading, onboarding?.step]);

	const animationStep = useMemo(() => {
		if (!isOnboardingLoading && onboarding?.animationStep)
			return onboarding.animationStep;
		return 1;
	}, [isOnboardingLoading, onboarding?.animationStep]);

	// Loading state
	if (isOnboardingLoading && !onboarding) {
		return (
			<div className="flex items-center justify-center flex-1">
				<Spinner size="sm" />
			</div>
		);
	}

	// Show completion animation
	if (onboarding?.isCompleted) {
		return <CompleteAnimation />;
	}

	// Show regular onboarding flow
	return (
		<div className="flex flex-col items-center justify-center flex-1 overflow-hidden">
			<AnimatePresence mode="wait">
				<motion.div
					key="onboarding-container"
					initial={{ opacity: 0, y: 100 }}
					exit={{
						opacity: 0,
						transition: { duration: 0.1, ease: "easeInOut" },
					}}
					animate={{
						opacity: 1,
						y: 0,
						transition: { duration: 0.3, ease: "easeInOut" },
					}}
					className="grid w-full h-full relative max-w-5xl grid-cols-2 border rounded-lg max-h-[60vh] shadow-sm overflow-hidden"
				>
					<div className="flex flex-col items-start justify-center gap-8 py-8 overflow-hidden">
						{/* Indicators */}
						<Indicators step={onboardingStep} totalSteps={5} />

						{/* Steps */}
						<div className="flex flex-col flex-1 w-full h-full">
							{onboardingStep === 1 && onboarding?._id && (
								<Step1 onboardingData={onboarding} />
							)}
							{onboardingStep === 2 && onboarding?._id && (
								<Step2 onboardingData={onboarding} />
							)}
							{onboardingStep === 3 && onboarding?._id && (
								<Step3 onboardingData={onboarding} />
							)}
							{onboardingStep === 4 && onboarding?._id && (
								<Step4 onboardingData={onboarding} />
							)}
						</div>
					</div>

					{/* Right Side - Campaign Preview */}
					<div className="relative max-h-full overflow-hidden border-l bg-muted">
						<OnboardingFlowPreview step={animationStep} steps={allSteps} />
					</div>
				</motion.div>

				{/* Bottom Menu */}
				<motion.div
					className="fixed bottom-0 left-0 right-0 flex items-center justify-center w-full px-4 py-8"
					initial={{ opacity: 0, y: 100 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 100 }}
					transition={{ duration: 0.3, ease: "easeInOut" }}
				>
					<div className="flex items-center justify-between gap-4 text-muted-foreground">
						<Tooltip delayDuration={0}>
							<TooltipTrigger asChild>
								<Button
									onClick={() => signOut()}
									variant="outline"
									size="iconSm"
								>
									<LogOut className="size-3.5" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Logout</TooltipContent>
						</Tooltip>
						<Tooltip delayDuration={0}>
							<TooltipTrigger asChild>
								<Button
									onClick={() =>
										workspaces.length > 1 && router.push("/select/workspace")
									}
									variant="outline"
									size="sm"
								>
									Switch Workspace <ArrowRightIcon className="size-3.5" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								{workspaces.length > 1
									? "Switch to Another Workspace"
									: "No workspace available"}
							</TooltipContent>
						</Tooltip>
						<Tooltip delayDuration={0}>
							<TooltipTrigger asChild>
								<Button
									onClick={() =>
										projects.length > 1 && router.push("/select/project")
									}
									variant="outline"
									size="sm"
								>
									Switch Project <ArrowRightIcon className="size-3.5" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								{projects.length > 1
									? "Switch to Another Project"
									: "No project available"}
							</TooltipContent>
						</Tooltip>
					</div>
				</motion.div>
			</AnimatePresence>
		</div>
	);
};
