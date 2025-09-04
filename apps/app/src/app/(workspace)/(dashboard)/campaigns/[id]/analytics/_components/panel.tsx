import type { Doc } from "@firebuzz/convex";
import { Button } from "@firebuzz/ui/components/ui/button";
import { BarChart3, Clock, TestTube } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface PanelProps {
	campaign: Doc<"campaigns">;
}

const screens = [
	{
		id: "overview",
		label: "Overview",
		icon: BarChart3,
		description: "General analytics overview",
	},
	{
		id: "realtime",
		label: "Real-time",
		icon: Clock,
		description: "Live analytics data",
	},
	{
		id: "abtests",
		label: "A/B Tests",
		icon: TestTube,
		description: "A/B test results",
	},
];

export const Panel = ({ campaign }: PanelProps) => {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();

	const currentScreen = searchParams.get("screen") || "overview";

	const handleScreenChange = (screenId: string) => {
		const params = new URLSearchParams(searchParams);
		params.set("screen", screenId);
		router.push(`${pathname}?${params.toString()}`);
	};

	return (
		<div className="p-4 space-y-6">
			<div>
				<h2 className="text-lg font-semibold mb-1">{campaign.title}</h2>
				<p className="text-sm text-muted-foreground">Analytics Dashboard</p>
			</div>

			<div className="space-y-2">
				<h3 className="text-sm font-medium text-muted-foreground mb-3">
					SCREENS
				</h3>
				{screens.map((screen) => {
					const Icon = screen.icon;
					const isActive = currentScreen === screen.id;

					return (
						<Button
							key={screen.id}
							variant={isActive ? "secondary" : "ghost"}
							className={cn(
								"w-full justify-start h-auto p-3",
								isActive && "bg-secondary",
							)}
							onClick={() => handleScreenChange(screen.id)}
						>
							<div className="flex items-center gap-3 w-full">
								<Icon className="h-4 w-4" />
								<div className="flex-1 text-left">
									<div className="text-sm font-medium">{screen.label}</div>
									<div className="text-xs text-muted-foreground">
										{screen.description}
									</div>
								</div>
							</div>
						</Button>
					);
				})}
			</div>
		</div>
	);
};
