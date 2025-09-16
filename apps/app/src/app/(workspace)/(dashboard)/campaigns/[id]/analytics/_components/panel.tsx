import { Button } from "@firebuzz/ui/components/ui/button";
import { BarChart3, Clock, TestTube, Users } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const screens = [
	{
		id: "overview",
		label: "Overview",
		icon: BarChart3,
		description: "An overview for quick insights",
	},
	{
		id: "realtime",
		label: "Real-time",
		icon: Clock,
		description: "Live data for real-time insights",
	},
	{
		id: "audience",
		label: "Audience",
		icon: Users,
		description: "Detailed audience demographics and behavior",
	},
	{
		id: "abtests",
		label: "A/B Tests",
		icon: TestTube,
		description: "A/B test results and analysis",
	},
];

export const Panel = () => {
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
		<div className="space-y-6">
			<div className="p-4 space-y-2">
				<h3 className="text-sm font-medium">Analytics Dashboards</h3>
				{screens.map((screen) => {
					const Icon = screen.icon;
					const isActive = currentScreen === screen.id;

					return (
						<Button
							key={screen.id}
							variant="ghost"
							className="justify-start pl-0 w-full h-auto transition-all duration-200 ease-in-out hover:pl-3"
							onClick={() => handleScreenChange(screen.id)}
						>
							<div className="flex gap-3 items-center w-full">
								<div
									className={cn(
										"p-2 rounded-lg border bg-muted",
										isActive && "bg-brand/10 text-brand border border-brand/20",
									)}
								>
									<Icon className="size-3.5" />
								</div>

								<div className="flex-1 text-left">
									<div
										className={cn(
											"text-sm font-medium",
											isActive && "text-brand",
										)}
									>
										{screen.label}
									</div>
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
