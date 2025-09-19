import type { Doc } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { CornerDownRight, Eye, Group, Target } from "@firebuzz/ui/icons/lucide";
import { formatRelativeTimeShort } from "@firebuzz/utils";
import { useMemo } from "react";
import type { AbTestWithResults } from "../index";
import { AbTestConversionChart } from "./ab-test-conversion-chart";
import { AbTestVariantsTable } from "./ab-test-variants-table";

interface AbTestItemProps {
	abTest: AbTestWithResults;
	campaignConversionRate: number;
	campaign?: Doc<"campaigns"> | null;
}

const statusColors = {
	draft: "bg-primary",
	running: "bg-blue-500",
	paused: "bg-gray-600",
	completed: "bg-emerald-600",
};

export const AbTestItem = ({
	abTest,
	campaignConversionRate,
	campaign,
}: AbTestItemProps) => {
	const analyticsData = useMemo(() => {
		return abTest.analytics?.payload;
	}, [abTest.analytics]);

	const totalExposures = useMemo(() => {
		return analyticsData?.reduce((acc, curr) => acc + curr.exposures, 0) || 0;
	}, [analyticsData]);

	return (
		<div className="grid overflow-hidden grid-cols-8 rounded-lg border bg-muted">
			{/* Left Container */}
			<div className="flex flex-col col-span-3 gap-4 justify-between p-4 border-r">
				<div className="pl-4 h-full border-l">
					<div className="flex gap-2 justify-between items-center">
						<Badge variant="outline" className="gap-1 capitalize">
							<div
								className={`w-2 h-2 rounded-full ${statusColors[abTest.status]}`}
							/>
							{abTest.status}
						</Badge>
						<div className="flex rounded-md border *:px-2 *:py-1 *:text-xs *:border-r last:*:border-r-0">
							<div className="flex gap-1 items-center">
								{abTest.startedAt
									? `Started ${formatRelativeTimeShort(abTest.startedAt)} ago`
									: "Not started"}
							</div>
							{abTest.status === "completed" && abTest.completedAt && (
								<div>{`Completed ${formatRelativeTimeShort(abTest.completedAt)} ago`}</div>
							)}
							{abTest.status !== "completed" && abTest.endDate && (
								<div>{`Ends in ${formatRelativeTimeShort(abTest.endDate)}`}</div>
							)}
						</div>
					</div>
					{/* Title */}
					<div className="flex justify-between items-center mt-6">
						<h1 className="text-xl font-semibold text-primary">
							{abTest.title}
						</h1>
					</div>
					{/* Hypothesis */}
					<div className="space-y-1">
						<p className="text-sm text-muted-foreground">{abTest.hypothesis}</p>
						<div className="flex gap-1 items-center text-xs font-medium text-blue-500">
							<CornerDownRight className="size-3" />
							<p>Hypothesis</p>
						</div>
					</div>
				</div>

				<div className="flex justify-between rounded-lg border *:px-3 *:py-2 *:border-r last:*:border-r-0 *:flex-1 bg-background-subtle">
					<div>
						<div className="text-xs font-medium text-muted-foreground">
							Confidence Level
						</div>
						<div className="flex gap-1 items-center text-sm text-primary">
							<Target className="size-3" />
							{abTest.confidenceLevel}%
						</div>
					</div>
					<div>
						<div className="text-xs font-medium text-muted-foreground">
							Variants
						</div>
						<div className="flex gap-1 items-center text-sm text-primary">
							<Group className="size-3" />
							{abTest.variants.length}
						</div>
					</div>
					<div>
						<div className="text-xs font-medium text-muted-foreground">
							Total Exposures
						</div>
						<div className="flex gap-1 items-center text-sm text-primary">
							<Eye className="size-3" />
							{totalExposures}
						</div>
					</div>
				</div>
			</div>

			{/* Right Container */}
			<div className="col-span-5">
				<AbTestConversionChart
					abTest={abTest}
					campaignConversionRate={campaignConversionRate}
				/>
			</div>
			{/* Table View */}
			<div className="col-span-full border-t">
				<AbTestVariantsTable abTest={abTest} campaign={campaign} />
			</div>
		</div>
	);
};
