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
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Activity } from "@firebuzz/ui/icons/lucide";
import {
	FacebookIcon,
	GoogleIcon,
	LinkedInIcon,
	TwitterIcon,
} from "@firebuzz/ui/icons/social";
import { capitalizeFirstLetter } from "@firebuzz/utils";
import { useMemo } from "react";
import {
	ComposableMap,
	Geographies,
	Geography,
	ZoomableGroup,
} from "react-simple-maps";

interface WorldMapChartProps {
	data: string[] | [string, number][]; // Array of country names or [country, count] tuples
	title: string;
	description: string;
	isLoading?: boolean;
	className?: string;
	source?: Doc<"analyticsPipes">["source"];
	isRealtime?: boolean;
}

// World map topology URL - using Natural Earth data which has better country name consistency
const geoUrl =
	"https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

// Country code to country name mappings (ISO 3166-1 alpha-2)
const countryCodeToName: Record<string, string> = {
	// Common country codes
	US: "United States of America",
	GB: "United Kingdom",
	UK: "United Kingdom",
	DE: "Germany",
	FR: "France",
	IT: "Italy",
	ES: "Spain",
	NL: "Netherlands",
	BE: "Belgium",
	AT: "Austria",
	CH: "Switzerland",
	SE: "Sweden",
	NO: "Norway",
	DK: "Denmark",
	FI: "Finland",
	PL: "Poland",
	CZ: "Czechia",
	HU: "Hungary",
	RO: "Romania",
	BG: "Bulgaria",
	GR: "Greece",
	PT: "Portugal",
	IE: "Ireland",
	LU: "Luxembourg",
	SK: "Slovakia",
	SI: "Slovenia",
	HR: "Croatia",
	EE: "Estonia",
	LV: "Latvia",
	LT: "Lithuania",
	MT: "Malta",
	CY: "Cyprus",
	CA: "Canada",
	MX: "Mexico",
	BR: "Brazil",
	AR: "Argentina",
	CL: "Chile",
	CO: "Colombia",
	PE: "Peru",
	VE: "Venezuela",
	JP: "Japan",
	CN: "China",
	IN: "India",
	KR: "South Korea",
	TH: "Thailand",
	VN: "Vietnam",
	ID: "Indonesia",
	MY: "Malaysia",
	SG: "Singapore",
	PH: "Philippines",
	AU: "Australia",
	NZ: "New Zealand",
	ZA: "South Africa",
	EG: "Egypt",
	NG: "Nigeria",
	KE: "Kenya",
	MA: "Morocco",
	TN: "Tunisia",
	GH: "Ghana",
	RU: "Russia",
	TR: "Turkey",
	IL: "Israel",
	SA: "Saudi Arabia",
	AE: "United Arab Emirates",
	QA: "Qatar",
	KW: "Kuwait",
	OM: "Oman",
	BH: "Bahrain",
	JO: "Jordan",
	LB: "Lebanon",
	IQ: "Iraq",
	IR: "Iran",
	PK: "Pakistan",
	BD: "Bangladesh",
	LK: "Sri Lanka",
	NP: "Nepal",
	MM: "Myanmar",
	KH: "Cambodia",
	LA: "Laos",
	MN: "Mongolia",
	KZ: "Kazakhstan",
	UZ: "Uzbekistan",
	KG: "Kyrgyzstan",
	TJ: "Tajikistan",
	TM: "Turkmenistan",
	AF: "Afghanistan",
	UA: "Ukraine",
	BY: "Belarus",
	MD: "Moldova",
	GE: "Georgia",
	AM: "Armenia",
	AZ: "Azerbaijan",
};

// Country name mappings for common variations
const countryNameMappings: Record<string, string> = {
	"United States": "United States of America",
	USA: "United States of America",
	Britain: "United Kingdom",
	Russia: "Russian Federation",
	"South Korea": "Republic of Korea",
	"North Korea": "Democratic People's Republic of Korea",
	Iran: "Islamic Republic of Iran",
	Syria: "Syrian Arab Republic",
	Venezuela: "Bolivarian Republic of Venezuela",
	Bolivia: "Plurinational State of Bolivia",
	Tanzania: "United Republic of Tanzania",
	Macedonia: "North Macedonia",
	Congo: "Democratic Republic of the Congo",
	"Czech Republic": "Czechia",
};

// Reverse mapping from country names to country codes (for labels)
const countryNameToCode: Record<string, string> = {};
for (const [code, name] of Object.entries(countryCodeToName)) {
	countryNameToCode[name.toLowerCase()] = code;
}

export const WorldMapChart = ({
	data,
	title,
	description,
	isLoading,
	className,
	source,
	isRealtime = false,
}: WorldMapChartProps) => {
	// Process data and create country mappings
	const { activeCountries, countryVisitorCounts } = useMemo(() => {
		if (!data || data.length === 0)
			return {
				activeCountries: new Set<string>(),
				countryVisitorCounts: new Map<string, number>(),
			};

		const countries = new Set<string>();
		const counts = new Map<string, number>();

		for (const item of data) {
			let countryCode: string;
			let visitorCount = 1;

			// Handle both string[] and [string, number][] formats
			if (Array.isArray(item)) {
				[countryCode, visitorCount] = item;
			} else {
				countryCode = item;
			}

			// Normalize country code/name to full country name
			let normalizedCountry: string;
			if (countryCode.length === 2) {
				const countryName = countryCodeToName[countryCode.toUpperCase()];
				normalizedCountry = countryName
					? countryName.toLowerCase().trim()
					: countryCode.toLowerCase().trim();
			} else {
				const mapped = countryNameMappings[countryCode] || countryCode;
				normalizedCountry = mapped.toLowerCase().trim();
			}

			countries.add(normalizedCountry);
			counts.set(normalizedCountry, visitorCount);
		}

		return { activeCountries: countries, countryVisitorCounts: counts };
	}, [data]);

	const hasActiveCountries = activeCountries.size > 0;

	if (isLoading) {
		return (
			<Card className={className}>
				<CardHeader>
					<CardTitle className="flex gap-2 items-center text-base font-medium">
						{isRealtime && (
							<Activity className="w-4 h-4 text-green-500 animate-pulse" />
						)}
						{title}
					</CardTitle>
					<CardDescription>{description}</CardDescription>
				</CardHeader>
				<CardContent>
					<Skeleton className="h-[300px] w-full" />
				</CardContent>
			</Card>
		);
	}

	if (!hasActiveCountries) {
		return (
			<Card className="bg-muted">
				<CardHeader className="!gap-0 space-y-0 px-6 py-3 border-b">
					<CardTitle className="text-base font-medium">{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</CardHeader>
				<CardContent className="p-0">
					<div className="flex h-[300px] items-center justify-center">
						<div className="text-center">
							<p className="text-sm text-muted-foreground">
								No visitor data available
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="bg-muted">
			<CardHeader className="!gap-0 space-y-0 px-6 py-3 border-b">
				<CardTitle className="text-base font-medium">{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent className="p-0">
				<div className="relative w-full h-[300px]">
					<ComposableMap
						projection="geoMercator"
						projectionConfig={{
							scale: 180,
							center: [0, 50],
						}}
						width={800}
						height={300}
						style={{
							width: "100%",
							height: "100%",
							backgroundColor: "hsl(var(--map-sea))", // Theme-aware sea color
						}}
					>
						<ZoomableGroup>
							<Geographies geography={geoUrl}>
								{({ geographies }) => (
									<>
										{/* Country Shapes */}
										{geographies.map((geo) => {
											// Try both NAME and name properties for different topology formats
											const rawName =
												geo.properties?.NAME || geo.properties?.name || "";
											const countryName = rawName.toLowerCase()?.trim() || "";
											const isActive = activeCountries.has(countryName);

											return (
												<Tooltip key={geo.rsmKey}>
													<TooltipTrigger asChild>
														<Geography
															geography={geo}
															fill={
																isActive
																	? "hsl(var(--brand))"
																	: "hsl(var(--muted))"
															}
															stroke="hsl(var(--border))"
															strokeWidth={0.5}
															style={{
																default: {
																	outline: "none",
																},
																hover: {
																	fill: isActive
																		? "hsl(var(--brand))"
																		: "hsl(var(--muted))",
																	outline: "none",
																	cursor: "pointer",
																},
																pressed: {
																	outline: "none",
																},
															}}
														/>
													</TooltipTrigger>
													{isActive && (
														<TooltipContent
															side="top"
															className="border bg-background px-3 py-1.5 text-xs text-foreground shadow-md"
														>
															<div className="flex gap-2 items-center">
																<div
																	className="w-3 h-3 rounded-sm"
																	style={{
																		backgroundColor: "hsl(var(--brand))",
																	}}
																/>
																<span className="font-medium">{rawName}</span>
																<span className="ml-auto font-mono">
																	{countryVisitorCounts.get(countryName) || 1}
																</span>
															</div>
														</TooltipContent>
													)}
												</Tooltip>
											);
										})}
									</>
								)}
							</Geographies>
						</ZoomableGroup>
					</ComposableMap>
				</div>
			</CardContent>
			<div className="flex justify-between items-center px-6 py-4 text-sm border-t">
				<div className="flex-col gap-2 items-start">
					<div className="flex gap-1 font-medium leading-none">
						<span className="font-medium text-brand">
							{activeCountries.size}
						</span>{" "}
						{isRealtime
							? "countries with active visitors"
							: "countries visited"}
					</div>
					<div className="leading-none text-muted-foreground">
						{data
							.slice(0, 3)
							.map((item) => {
								const countryCode = Array.isArray(item) ? item[0] : item;
								return capitalizeFirstLetter(countryCode);
							})
							.join(", ")}
						{data.length > 3 && ` and ${data.length - 3} more`}
					</div>
				</div>
				{source && (
					<div className="flex gap-1 items-center text-xs text-muted-foreground">
						Source:{" "}
						<div className="flex gap-1 items-center">
							<div className="flex justify-center items-center p-1 rounded-md border size-5">
								<SourceIcon source={source} />
							</div>
							<span className="capitalize text-muted-foreground">{source}</span>
						</div>
					</div>
				)}
			</div>
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
