import { DailyUsageChart } from "./_components/daily-usage-chart";
import { ProjectUsageChart } from "./_components/project-usage-chart";
import { UsageSummaryChart } from "./_components/usage-summary-chart";
import { UserUsageChart } from "./_components/user-usage-chart";

export default function SubscriptionUsageSettings() {
	return (
		<div className="flex overflow-y-auto flex-col flex-1 p-6 space-y-6 max-h-full">
			<div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
				<UsageSummaryChart />
				<DailyUsageChart />
			</div>
			<div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
				<ProjectUsageChart />
				<UserUsageChart />
			</div>
		</div>
	);
}
