"use client";

import type { Id } from "@firebuzz/convex";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
	AudioWaveform,
	BarChart3,
	Goal,
	TestTube,
	Users,
} from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import {
	type AnalyticsScreen,
	useCampaignAnalytics,
} from "@/hooks/state/use-campaign-analytics";

const screens: Array<{
	id: AnalyticsScreen;
	label: string;
	icon: typeof BarChart3;
	description: string;
}> = [
	{
		id: "overview",
		label: "Overview",
		icon: BarChart3,
		description: "An overview for quick insights",
	},
	{
		id: "realtime",
		label: "Real-time",
		icon: AudioWaveform,
		description: "Live data for real-time insights",
	},
	{
		id: "audience",
		label: "Audience",
		icon: Users,
		description: "Detailed audience demographics and behavior",
	},
	{
		id: "conversions",
		label: "Conversions",
		icon: Goal,
		description: "Conversion tracking and funnel analysis",
	},
	{
		id: "ab-tests",
		label: "A/B Tests",
		icon: TestTube,
		description: "A/B test results and analysis",
	},
];

interface AnalyticsSidebarProps {
	campaignId: Id<"campaigns">;
}

export const AnalyticsSidebar = ({ campaignId }: AnalyticsSidebarProps) => {
	const { screen: currentScreen, setScreen } = useCampaignAnalytics({
		campaignId,
	});

	return (
		<div className="flex flex-col w-12 h-full border-l bg-sidebar text-sidebar-foreground border-sidebar-border">
			<div className="flex flex-col gap-1 p-2">
				{screens.map((screen) => {
					const Icon = screen.icon;
					const isActive = currentScreen === screen.id;

					return (
						<Tooltip key={screen.id} delayDuration={0}>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setScreen(screen.id)}
									className={cn(
										"h-8 w-8 shrink-0 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
										isActive &&
											"bg-brand/5 text-brand hover:bg-brand/5 hover:text-brand",
									)}
								>
									<Icon className="w-4 h-4" />
									<span className="sr-only">{screen.label}</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent
								className="flex flex-col items-start max-w-48"
								side="left"
								align="center"
								sideOffset={14}
							>
								<div className="text-sm font-medium">{screen.label}</div>
								<div className="text-xs text-muted-foreground">
									{screen.description}
								</div>
							</TooltipContent>
						</Tooltip>
					);
				})}
			</div>
		</div>
	);
};
