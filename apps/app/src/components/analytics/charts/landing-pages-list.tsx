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
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import { ArrowRight, Crown, TrendingUp } from "@firebuzz/ui/icons/lucide";
import {
	FacebookIcon,
	GoogleIcon,
	LinkedInIcon,
	TwitterIcon,
} from "@firebuzz/ui/icons/social";
import { cn } from "@firebuzz/ui/lib/utils";
import { useMemo } from "react";

interface LandingPagesListProps {
	conversionsData?: Extract<
		Doc<"analyticsPipes">,
		{ queryId: "conversions-breakdown" }
	> | null;
	landingPagesData?: Doc<"landingPages">[] | null;
	isLoading?: boolean;
	className?: string;
}

interface LandingPageConversion {
	landingPageId: string;
	title: string;
	sessions: number;
	conversions: number;
	conversionRate: number;
	conversionValue: number;
}

export const LandingPagesList = ({
	conversionsData,
	landingPagesData,
	isLoading,
	className,
}: LandingPagesListProps) => {
	// Transform the landing page conversions data
	const landingPageConversions = useMemo((): LandingPageConversion[] => {
		if (
			!conversionsData?.payload?.landing_page_conversions ||
			!landingPagesData
		) {
			return [];
		}

		// landing_page_conversions is an array of tuples: [landing_page_id, sessions, users, conversions, conversion_value_usd, conversion_rate, new_user_conversions, returning_user_conversions]
		const conversions = conversionsData.payload.landing_page_conversions
			.slice(0, 5) // Get top 5 landing pages
			.map((conversionData) => {
				const landingPageId = conversionData[0] as string;
				const sessions = conversionData[1] as number;
				const conversions = conversionData[3] as number;
				const conversionValue = conversionData[4] as number;
				const conversionRate = conversionData[5] as number;

				// Find the matching landing page data
				const landingPage = landingPagesData.find(
					(lp) => lp._id === landingPageId,
				);

				return {
					landingPageId,
					title: landingPage?.title || "Unknown Landing Page",
					sessions,
					conversions,
					conversionRate,
					conversionValue,
				};
			});

		// Sort by conversions descending
		return conversions.sort((a, b) => b.conversions - a.conversions);
	}, [conversionsData, landingPagesData]);

	// Calculate total conversions for context
	const totalConversions = useMemo(() => {
		return landingPageConversions.reduce(
			(sum, item) => sum + item.conversions,
			0,
		);
	}, [landingPageConversions]);

	const handlePreviewLandingPage = (landingPageId: string) => {
		const currentLandingPage = landingPagesData?.find(
			(lp) => lp._id === landingPageId,
		);

		if (currentLandingPage?.previewUrl) {
			window.open(currentLandingPage.previewUrl, "_blank");
		}
	};

	if (isLoading) {
		return (
			<Card className={className}>
				<CardHeader>
					<CardTitle className="text-base font-medium">
						Top Converting Landing Pages
					</CardTitle>
					<CardDescription>Conversions by landing page</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{["first", "second", "third", "fourth", "fifth"].map((position) => (
							<div
								key={`landing-page-skeleton-${position}`}
								className="flex justify-between items-center p-3"
							>
								<div className="flex-1 space-y-2">
									<Skeleton className="w-3/4 h-4" />
									<Skeleton className="w-1/2 h-3" />
								</div>
								<Skeleton className="w-8 h-8 rounded" />
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!landingPageConversions || landingPageConversions.length === 0) {
		return (
			<Card className="flex flex-col bg-muted">
				<CardHeader className="!gap-0 space-y-0 px-6 py-3 border-b">
					<CardTitle className="text-base font-medium">
						Top Converting Landing Pages
					</CardTitle>
					<CardDescription>Conversions by landing page</CardDescription>
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

	const topLandingPage = landingPageConversions[0];

	return (
		<Card className="flex flex-col bg-muted">
			<CardHeader className="!gap-0 space-y-0 px-6 py-3 border-b">
				<CardTitle className="text-base font-medium">
					Top Converting Landing Pages
				</CardTitle>
				<CardDescription>Conversions by landing page</CardDescription>
			</CardHeader>
			<CardContent className="flex overflow-hidden flex-col flex-1 p-0">
				<div className="overflow-y-auto flex-1 p-6 space-y-2 max-h-full">
					{landingPageConversions.map((landingPage, index) => (
						<div
							key={landingPage.landingPageId}
							className={cn(
								"flex justify-between items-center px-3 rounded-md border transition-colors hover:bg-muted/50",
								"cursor-pointer group",
							)}
							onClick={() =>
								handlePreviewLandingPage(landingPage.landingPageId)
							}
						>
							<div className="flex flex-1 items-center min-w-0">
								<div className="flex gap-2 items-center">
									<div
										className={cn(
											"px-1 py-1 text-xs font-medium tabular-nums rounded-lg border bg-muted",
										)}
									>
										{index === 0 ? (
											<Crown className="text-brand size-3" />
										) : (
											index + 1
										)}
									</div>
									<h4 className="text-sm font-medium truncate">
										{landingPage.title}
									</h4>
								</div>
								<div className="flex flex-1 justify-center items-stretch text-xs text-muted-foreground">
									<div className="flex items-center px-2 py-2 h-full border-l last-of-type:border-r">
										{landingPage.conversions} conversions
									</div>
									<div className="flex items-center px-2 py-2 h-full border-l last-of-type:border-r">
										{landingPage.sessions} sessions
									</div>
									<div className="flex items-center px-2 py-2 h-full border-l last-of-type:border-r">
										{landingPage.conversionRate.toFixed(1)}% rate
									</div>

									{landingPage.conversionValue > 0 && (
										<div className="flex items-center px-2 py-2 h-full border-l last-of-type:border-r">
											${landingPage.conversionValue.toFixed(0)} value
										</div>
									)}
								</div>
							</div>
							<ArrowRight className="w-4 h-4 transition-colors text-muted-foreground group-hover:text-foreground" />
						</div>
					))}
				</div>
			</CardContent>
			{topLandingPage && (
				<div className="flex justify-between items-center px-6 py-4 text-sm border-t">
					<div className="flex-col gap-2 items-start">
						<div className="flex gap-1 font-medium leading-none">
							<span className="font-medium text-emerald-500">
								{topLandingPage.title}
							</span>{" "}
							is the top converter <TrendingUp className="w-4 h-4" />
						</div>
						<div className="leading-none text-muted-foreground">
							{topLandingPage.conversions} conversions out of{" "}
							{totalConversions.toLocaleString()} total{" "}
							{topLandingPage.conversions > 0 && totalConversions > 0 && (
								<span>
									(
									{(
										(topLandingPage.conversions / totalConversions) *
										100
									).toFixed(1)}
									%)
								</span>
							)}
						</div>
					</div>
					{conversionsData && (
						<div className="flex gap-1 items-center text-xs text-muted-foreground">
							Source:{" "}
							<div className="flex gap-1 items-center">
								<div className="flex justify-center items-center p-1 rounded-md border size-5">
									<SourceIcon source={conversionsData.source} />
								</div>
								<span className="capitalize text-muted-foreground">
									{conversionsData.source}
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
