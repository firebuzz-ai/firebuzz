"use client";

import type { Doc } from "@firebuzz/convex";
import { Icon } from "@firebuzz/ui/components/brand/icon";
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
import {
	Activity,
	Calendar,
	CreditCard,
	Download,
	Eye,
	FileText,
	Goal as GoalIcon,
	Heart,
	Mail,
	Monitor,
	MousePointerClick,
	Percent,
	Share2,
	ShoppingCart,
	Smartphone,
	Tablet,
	TextCursorInput,
	TrendingUp,
	UserPlus,
} from "@firebuzz/ui/icons/lucide";
import {
	FacebookIcon,
	GoogleIcon,
	InstagramIcon,
	LinkedInIcon,
	TwitterIcon,
	YouTubeIcon,
} from "@firebuzz/ui/icons/social";
import { capitalizeFirstLetter } from "@firebuzz/utils";
import { useMemo } from "react";
import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";

export interface HorizontalBarChartData {
	name: string;
	value: number;
	percentage?: number;
	fill?: string;
	originalEvent?: string; // For icon lookup in events
}

interface HorizontalBarChartProps {
	data: HorizontalBarChartData[];
	title: string;
	description: string;
	valueLabel?: string;
	isLoading?: boolean;
	className?: string;
	source?: Doc<"analyticsPipes">["source"];
	showTrend?: boolean;
	isRealtime?: boolean;
	maxItems?: number;
	iconMapping?: Record<string, string>;
	barColor?: string;
	headerAction?: React.ReactNode;
}

export const HorizontalBarChart = ({
	data,
	title,
	description,
	valueLabel = "Value",
	isLoading,
	className,
	source,
	showTrend = true,
	isRealtime = false,
	maxItems = 5,
	iconMapping,

	headerAction,
}: HorizontalBarChartProps) => {
	// Transform and limit data
	const chartData = useMemo((): HorizontalBarChartData[] => {
		if (!data || data.length === 0) return [];

		return data.slice(0, maxItems);
	}, [data, maxItems]);

	// Chart configuration for tooltip and legend
	const chartConfig = useMemo((): ChartConfig => {
		const config: ChartConfig = {
			value: {
				label: valueLabel,
				color: "hsl(var(--primary))",
			},
			label: {
				color: "hsl(var(--background))",
			},
		};

		chartData.forEach((item, index) => {
			const key = item.name.toLowerCase().replace(/[^a-z0-9]/g, "");
			config[key] = {
				label: item.name,
				color: `hsl(var(--chart-${(index % 5) + 1}))`,
			};
		});

		return config;
	}, [chartData, valueLabel]);

	// Calculate total value for trend calculation
	const totalValue = useMemo(() => {
		return chartData.reduce((sum, item) => sum + item.value, 0);
	}, [chartData]);

	// Calculate appropriate bar radius based on data
	const barRadius = useMemo(() => {
		if (!chartData.length) return 2;

		const maxValue = Math.max(...chartData.map((d) => d.value));
		const minValue = Math.min(...chartData.map((d) => d.value));

		// If all values are very small or there's a big difference between min/max,
		// use a smaller radius to prevent visual issues
		if (maxValue === 0 || (minValue === 0 && maxValue > 0)) {
			return 4;
		}

		return 8; // Full radius for normal cases
	}, [chartData]);

	if (isLoading) {
		return (
			<Card className={className}>
				<CardHeader className="!gap-0 space-y-0 px-6 py-3 border-b">
					<div
						className={
							headerAction ? "flex flex-row justify-between items-start" : ""
						}
					>
						<div>
							<CardTitle className="flex gap-2 items-center text-base font-medium">
								{isRealtime && (
									<Activity className="w-4 h-4 text-green-500 animate-pulse" />
								)}
								{title}
							</CardTitle>
							<CardDescription>{description}</CardDescription>
						</div>
						{headerAction}
					</div>
				</CardHeader>
				<CardContent>
					<Skeleton className="h-[200px] w-full" />
				</CardContent>
			</Card>
		);
	}

	if (!chartData || chartData.length === 0) {
		return (
			<Card className="flex flex-col bg-muted">
				<CardHeader className="!gap-0 space-y-0 px-6 py-3 border-b">
					<div
						className={
							headerAction ? "flex flex-row justify-between items-start" : ""
						}
					>
						<div>
							<CardTitle className="text-base font-medium">{title}</CardTitle>
							<CardDescription>{description}</CardDescription>
						</div>
						{headerAction}
					</div>
				</CardHeader>
				<CardContent className="p-0">
					<div className="flex h-[200px] items-center justify-center">
						<div className="text-center">
							<p className="text-sm text-muted-foreground">No data available</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	const topItem = chartData[0];
	const topItemPercentage = topItem?.percentage || 0;

	return (
		<Card className="bg-muted">
			<CardHeader className="!gap-0 space-y-0 px-6 py-3 border-b">
				<div
					className={
						headerAction ? "flex flex-row justify-between items-start" : ""
					}
				>
					<div>
						<CardTitle className="flex gap-2 items-center text-base font-medium">
							{title}
						</CardTitle>
						<CardDescription>{description}</CardDescription>
					</div>
					{headerAction}
				</div>
			</CardHeader>
			<CardContent className="p-0">
				<ChartContainer className="h-[200px] w-full" config={chartConfig}>
					<BarChart
						layout="vertical"
						height={200}
						accessibilityLayer
						data={chartData}
						margin={{
							left: 24,
							right: 30,
							top: 8,
							bottom: 8,
						}}
					>
						<XAxis type="number" dataKey="value" hide />
						<YAxis
							dataKey="name"
							type="category"
							tickLine={false}
							tickMargin={8}
							axisLine={false}
							hide
						/>
						<ChartTooltip cursor={false} content={<ChartTooltipContent />} />
						<Bar
							dataKey="value"
							radius={barRadius}
							maxBarSize={30}
							/*  style={{ fill: barColor }} */
						>
							<LabelList
								dataKey="name"
								position="insideLeft"
								offset={8}
								className="fill-[--color-label]"
								fontSize={12}
								content={(props) => {
									const { x, y, height, value, payload } = props as {
										x: number;
										y: number;
										height: number;
										value: number;
										payload: {
											originalEvent: string;
											payload: {
												originalEvent: string;
											};
										};
									};
									const source = String(value).toLowerCase();

									// Try to get icon source from payload first, then map display names to icon names
									let iconSource =
										payload?.originalEvent || payload?.payload?.originalEvent;

									if (!iconSource) {
										// Use provided icon mapping or default mapping
										const defaultIconMapping: Record<string, string> = {
											"page view": "eye",
											"form submission": "text-cursor-input",
											"external link click": "mouse-pointer-click",
											"scroll threshold (25)": "percent",
											"scroll threshold (50)": "percent",
											"scroll threshold (75)": "percent",
											"scroll threshold (100)": "percent",
										};
										const mapping = iconMapping || defaultIconMapping;
										iconSource = mapping[source] || source;
									}

									const hasIcon = hasTrafficSourceIcon(iconSource);
									const iconSize = 16;
									const iconContainerSize = 20;
									const textOffset = hasIcon ? iconContainerSize + 12 : 8;

									return (
										<g>
											{/* Icon Container */}
											{hasIcon && (
												<foreignObject
													x={Number(x) + 8}
													y={
														Number(y) + (Number(height) - iconContainerSize) / 2
													}
													width={iconContainerSize}
													height={iconContainerSize}
												>
													<div className="flex justify-center items-center p-1 w-full h-full rounded-md border text-neutral-950 bg-white/20 border-white/20">
														<TrafficSourceIcon
															source={iconSource}
															size={iconSize}
														/>
													</div>
												</foreignObject>
											)}
											{/* Text */}
											<text
												x={Number(x) + textOffset}
												y={Number(y) + Number(height) / 2}
												textAnchor="start"
												dominantBaseline="middle"
												fontSize={12}
												className="fill-[--color-label]"
											>
												{String(value)}
											</text>
										</g>
									);
								}}
							/>
							<LabelList
								dataKey="value"
								position="right"
								offset={8}
								className="fill-foreground"
								fontSize={12}
							/>
						</Bar>
					</BarChart>
				</ChartContainer>
			</CardContent>
			{showTrend && topItem && (
				<div className="flex justify-between items-center px-6 py-4 text-sm border-t">
					<div className="flex-col gap-2 items-start">
						<div className="flex gap-1 font-medium leading-none">
							<span className="font-medium text-emerald-500">
								{capitalizeFirstLetter(topItem.name)}
							</span>{" "}
							{isRealtime ? "is most active" : "is the top"}{" "}
							<TrendingUp className="w-4 h-4" />
						</div>
						<div className="leading-none text-muted-foreground">
							{topItemPercentage > 0 ? (
								<>
									{topItemPercentage.toFixed(1)}% of all{" "}
									{valueLabel.toLowerCase()} ({totalValue.toLocaleString()}{" "}
									total)
								</>
							) : (
								<>
									{topItem.value.toLocaleString()} {valueLabel.toLowerCase()}
									{totalValue > topItem.value && (
										<> of {totalValue.toLocaleString()} total</>
									)}
								</>
							)}
						</div>
					</div>
					{source && (
						<div className="flex gap-1 items-center text-xs text-muted-foreground">
							Source:{" "}
							<div className="flex gap-1 items-center">
								<div className="flex justify-center items-center p-1 rounded-md border size-5">
									<SourceIcon source={source} />
								</div>
								<span className="capitalize text-muted-foreground">
									{source}
								</span>
							</div>
						</div>
					)}
				</div>
			)}
		</Card>
	);
};

const SourceIcon = ({
	source,
}: {
	source: Doc<"analyticsPipes">["source"];
}) => {
	switch (source) {
		case "facebook":
			return <FacebookIcon />;
		case "google":
			return <GoogleIcon />;
		case "twitter":
			return <TwitterIcon />;
		case "linkedin":
			return <LinkedInIcon />;
		case "firebuzz":
			return <Icon className="size-4" />;
		default:
			return <Icon />;
	}
};

const hasTrafficSourceIcon = (source: string): boolean => {
	switch (source.toLowerCase()) {
		case "facebook":
		case "google":
		case "twitter":
		case "linkedin":
		case "firebuzz":
		case "organic":
		case "youtube":
		case "instagram":
		case "search":
		case "desktop":
		case "mobile":
		case "tablet":
		case "computer":
		case "phone":
		case "ipad":
		// Event icons
		case "text-cursor-input":
		case "mouse-pointer-click":
		case "eye":
		case "percent":
		case "goal":
		case "shopping-cart":
		case "user-plus":
		case "download":
		case "mail":
		case "calendar":
		case "file-text":
		case "credit-card":
		case "share-2":
		case "heart":
		case "form-submission":
		case "external-link-click":
		case "page-view":
		case "scroll-threshold-25":
		case "scroll-threshold-50":
		case "scroll-threshold-75":
		case "scroll-threshold-100":
			return true;
		default:
			return false;
	}
};

const TrafficSourceIcon = ({
	source,
	size = 16,
}: {
	source: string;
	size?: number;
}) => {
	const iconStyle = { width: size, height: size };

	switch (source.toLowerCase()) {
		case "facebook":
			return <FacebookIcon />;
		case "google":
			return <GoogleIcon />;
		case "twitter":
			return <TwitterIcon />;
		case "linkedin":
			return <LinkedInIcon />;
		case "youtube":
			return <YouTubeIcon />;
		case "firebuzz":
			return <Icon style={iconStyle} />;
		case "instagram":
			return <InstagramIcon />;
		case "organic":
		case "search":
			return <GoogleIcon />;
		case "desktop":
		case "computer":
			return <Monitor style={iconStyle} />;
		case "mobile":
		case "phone":
			return <Smartphone style={iconStyle} />;
		case "tablet":
		case "ipad":
			return <Tablet style={iconStyle} />;
		// Event icons
		case "text-cursor-input":
			return <TextCursorInput style={iconStyle} />;
		case "mouse-pointer-click":
			return <MousePointerClick style={iconStyle} />;
		case "eye":
			return <Eye style={iconStyle} />;
		case "percent":
			return <Percent style={iconStyle} />;
		case "goal":
			return <GoalIcon style={iconStyle} />;
		case "shopping-cart":
			return <ShoppingCart style={iconStyle} />;
		case "user-plus":
			return <UserPlus style={iconStyle} />;
		case "download":
			return <Download style={iconStyle} />;
		case "mail":
			return <Mail style={iconStyle} />;
		case "calendar":
			return <Calendar style={iconStyle} />;
		case "file-text":
			return <FileText style={iconStyle} />;
		case "credit-card":
			return <CreditCard style={iconStyle} />;
		case "share-2":
			return <Share2 style={iconStyle} />;
		case "heart":
			return <Heart style={iconStyle} />;
		// Default event icons for common events
		case "form-submission":
			return <TextCursorInput style={iconStyle} />;
		case "external-link-click":
			return <MousePointerClick style={iconStyle} />;
		case "page-view":
			return <Eye style={iconStyle} />;
		case "scroll-threshold-25":
		case "scroll-threshold-50":
		case "scroll-threshold-75":
		case "scroll-threshold-100":
			return <Percent style={iconStyle} />;
		default:
			return null;
	}
};
