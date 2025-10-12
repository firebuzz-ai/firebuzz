"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@firebuzz/ui/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@firebuzz/ui/components/ui/chart";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Label, Pie, PieChart } from "recharts";
import { useProject } from "@/hooks/auth/use-project";
import { useSubscription } from "@/hooks/auth/use-subscription";
import { useWorkspace } from "@/hooks/auth/use-workspace";

const chartConfig = {
	project_total_usage: {
		label: "Project Usage",
	},
	project1: {
		label: "Project 1",
		color: "var(--chart-1)",
	},
	project2: {
		label: "Project 2",
		color: "var(--chart-2)",
	},
	project3: {
		label: "Project 3",
		color: "var(--chart-3)",
	},
	project4: {
		label: "Project 4",
		color: "var(--chart-4)",
	},
	project5: {
		label: "Project 5",
		color: "var(--chart-5)",
	},
} satisfies ChartConfig;

export const ProjectUsageChart = () => {
	const { currentWorkspace } = useWorkspace();
	const { currentPeriodStart, currentPeriodEnd } = useSubscription();
	const { projects } = useProject();

	const { data: projectUsage, isLoading } = useQuery({
		queryKey: [
			"project-usage",
			currentWorkspace?._id,
			currentPeriodStart,
			currentPeriodEnd,
		],
		queryFn: async () => {
			if (!currentWorkspace?._id || !currentPeriodStart || !currentPeriodEnd) {
				return [];
			}

			const response = await fetch(
				`/api/usage/project?workspaceId=${currentWorkspace._id}&periodStart=${currentPeriodStart}&periodEnd=${currentPeriodEnd}`,
			);

			if (!response.ok) {
				throw new Error("Failed to fetch project usage data");
			}

			return response.json();
		},
		enabled:
			!!currentWorkspace?._id &&
			!!currentPeriodStart &&
			!!currentPeriodEnd &&
			!!projects,
		refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
	});

	const chartData = useMemo(() => {
		if (!projects) return [];

		const colors = [
			"var(--chart-1)",
			"var(--chart-2)",
			"var(--chart-3)",
			"var(--chart-4)",
			"var(--chart-5)",
		];

		// Create data for actual projects only
		return projects
			.map((project, index) => {
				const projectUsageData = projectUsage?.find(
					(item: { projectId: string; project_total_usage: number }) =>
						item.projectId === project._id,
				);

				return {
					projectName: project.title || "Unknown Project",
					project_total_usage: projectUsageData?.project_total_usage || 0,
					fill: colors[index % colors.length],
					project: project,
					projectId: project._id,
				};
			})
			.filter((item) => item.project_total_usage > 0); // Only show projects with usage
	}, [projectUsage, projects]);

	const totalProjects = useMemo(() => {
		return chartData.length;
	}, [chartData]);

	const topProject = useMemo(() => {
		return chartData.reduce(
			(max, project) =>
				project.project_total_usage > max.project_total_usage ? project : max,
			chartData[0] || { project_total_usage: 0, projectName: "N/A" },
		);
	}, [chartData]);

	if (isLoading) {
		return (
			<Card className="py-0 bg-muted">
				<CardHeader className="flex flex-col items-stretch border-b !p-0 space-y-0 sm:flex-row">
					<div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
						<CardTitle>Project Usage</CardTitle>
					</div>
				</CardHeader>
				<CardContent className="px-2 sm:p-6">
					<Skeleton className="h-[300px] w-full" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="overflow-hidden py-0 bg-muted">
			<CardHeader className="flex flex-col items-stretch border-b !p-0 space-y-0 sm:flex-row">
				<div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
					<CardTitle>Project Usage</CardTitle>
					<CardDescription>Usage breakdown by projects</CardDescription>
				</div>
				<div>
					<div className="flex relative z-30 flex-col flex-1 justify-center px-6 py-4 text-left border-t sm:border-t-0 sm:border-l sm:px-8 sm:py-6 bg-muted">
						<span className="text-xs text-muted-foreground">Top Project</span>
						<span className="text-lg font-bold leading-none sm:text-3xl">
							{topProject?.project_total_usage?.toLocaleString() || 0}
						</span>
					</div>
				</div>
			</CardHeader>
			<CardContent className="px-2 sm:p-6">
				<ChartContainer
					config={chartConfig}
					className="mx-auto aspect-square max-h-[300px]"
				>
					<PieChart>
						<ChartTooltip
							cursor={false}
							content={<ChartTooltipContent hideLabel />}
						/>
						<Pie
							data={chartData}
							dataKey="project_total_usage"
							nameKey="projectName"
							innerRadius={80}
							strokeWidth={5}
						>
							<Label
								content={({ viewBox }) => {
									if (viewBox && "cx" in viewBox && "cy" in viewBox) {
										return (
											<text
												x={viewBox.cx}
												y={viewBox.cy}
												textAnchor="middle"
												dominantBaseline="middle"
											>
												<tspan
													x={viewBox.cx}
													y={viewBox.cy}
													className="text-3xl font-bold fill-foreground"
												>
													{totalProjects.toLocaleString()}
												</tspan>
												<tspan
													x={viewBox.cx}
													y={(viewBox.cy || 0) + 24}
													className="fill-muted-foreground"
												>
													Projects
												</tspan>
											</text>
										);
									}
								}}
							/>
						</Pie>
					</PieChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
};
