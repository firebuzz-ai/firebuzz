"use client";

import { useSubscription } from "@/hooks/auth/use-subscription";
import { useWorkspace } from "@/hooks/auth/use-workspace";
import { api, useCachedRichQuery } from "@firebuzz/convex";
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

const chartConfig = {
	user_total_usage: {
		label: "User Usage",
	},
	user1: {
		label: "User 1",
		color: "var(--chart-1)",
	},
	user2: {
		label: "User 2",
		color: "var(--chart-2)",
	},
	user3: {
		label: "User 3",
		color: "var(--chart-3)",
	},
	user4: {
		label: "User 4",
		color: "var(--chart-4)",
	},
	user5: {
		label: "User 5",
		color: "var(--chart-5)",
	},
} satisfies ChartConfig;

export const UserUsageChart = () => {
	const { currentWorkspace } = useWorkspace();
	const { currentPeriodStart, currentPeriodEnd } = useSubscription();
	const { data: members } = useCachedRichQuery(
		api.collections.members.queries.getByWorkspace,
	);

	const { data: userUsage, isLoading } = useQuery({
		queryKey: [
			"user-usage",
			currentWorkspace?._id,
			currentPeriodStart,
			currentPeriodEnd,
		],
		queryFn: async () => {
			if (!currentWorkspace?._id || !currentPeriodStart || !currentPeriodEnd) {
				return [];
			}

			const response = await fetch(
				`/api/usage/user?workspaceId=${currentWorkspace._id}&periodStart=${currentPeriodStart}&periodEnd=${currentPeriodEnd}`,
			);

			if (!response.ok) {
				throw new Error("Failed to fetch user usage data");
			}

			return response.json();
		},
		enabled:
			!!currentWorkspace?._id &&
			!!currentPeriodStart &&
			!!currentPeriodEnd &&
			!!members,
		refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
	});

	const chartData = useMemo(() => {
		if (!members) return [];

		const colors = [
			"var(--chart-1)",
			"var(--chart-2)",
			"var(--chart-3)",
			"var(--chart-4)",
			"var(--chart-5)",
		];

		// Create data for actual members only
		return members
			.map((member, index) => {
				const user = member.user;
				const userUsageData = userUsage?.find(
					(item: { userId: string; user_total_usage: number }) =>
						item.userId === member.userId,
				);

				return {
					userName:
						user?.firstName ||
						user?.lastName ||
						user?.fullName ||
						user?.email ||
						`User ${index + 1}`,
					user_total_usage: userUsageData?.user_total_usage || 0,
					fill: colors[index % colors.length],
					user: user,
					userId: member.userId,
				};
			})
			.filter((item) => item.user_total_usage > 0); // Only show users with usage
	}, [userUsage, members]);

	const totalUsers = useMemo(() => {
		return chartData.length;
	}, [chartData]);

	const topUser = useMemo(() => {
		return chartData.reduce(
			(max, user) =>
				user.user_total_usage > max.user_total_usage ? user : max,
			chartData[0] || { user_total_usage: 0, userName: "N/A" },
		);
	}, [chartData]);

	if (isLoading) {
		return (
			<Card className="py-0 bg-muted">
				<CardHeader className="flex flex-col items-stretch border-b !p-0 space-y-0 sm:flex-row">
					<div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
						<CardTitle>User Usage</CardTitle>
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
					<CardTitle>User Usage</CardTitle>
					<CardDescription>Usage breakdown by team members</CardDescription>
				</div>
				<div>
					<div className="flex relative z-30 flex-col flex-1 justify-center px-6 py-4 text-left border-t sm:border-t-0 sm:border-l sm:px-8 sm:py-6 bg-muted">
						<span className="text-xs text-muted-foreground">Top User</span>
						<span className="text-lg font-bold leading-none sm:text-3xl">
							{topUser?.user_total_usage?.toLocaleString() || 0}
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
							dataKey="user_total_usage"
							nameKey="userName"
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
													{totalUsers.toLocaleString()}
												</tspan>
												<tspan
													x={viewBox.cx}
													y={(viewBox.cy || 0) + 24}
													className="fill-muted-foreground"
												>
													Users
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
