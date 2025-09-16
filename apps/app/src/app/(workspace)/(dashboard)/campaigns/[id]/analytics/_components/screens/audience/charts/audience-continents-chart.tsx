import {
	HorizontalBarChart,
	type HorizontalBarChartData,
} from "@/components/analytics/charts/horizontal-bar-chart";
import type { Doc } from "@firebuzz/convex";
import { useMemo } from "react";

interface AudienceContinentsChartProps {
	audienceData?: Extract<Doc<"analyticsPipes">, { queryId: "audience-breakdown" }> | null;
	realtimeData?: Extract<Doc<"analyticsPipes">, { queryId: "realtime-overview" }> | null;
}

// Mapping of countries to continents
const COUNTRY_TO_CONTINENT: Record<string, string> = {
	// North America
	"United States": "North America",
	"Canada": "North America",
	"Mexico": "North America",
	"US": "North America",
	"CA": "North America",
	"MX": "North America",

	// Europe
	"United Kingdom": "Europe",
	"Germany": "Europe",
	"France": "Europe",
	"Italy": "Europe",
	"Spain": "Europe",
	"Netherlands": "Europe",
	"Poland": "Europe",
	"Belgium": "Europe",
	"Austria": "Europe",
	"Switzerland": "Europe",
	"Portugal": "Europe",
	"Sweden": "Europe",
	"Norway": "Europe",
	"Denmark": "Europe",
	"Finland": "Europe",
	"Ireland": "Europe",
	"Czech Republic": "Europe",
	"Hungary": "Europe",
	"Romania": "Europe",
	"Bulgaria": "Europe",
	"Croatia": "Europe",
	"Slovakia": "Europe",
	"Slovenia": "Europe",
	"Lithuania": "Europe",
	"Latvia": "Europe",
	"Estonia": "Europe",
	"Greece": "Europe",
	"Cyprus": "Europe",
	"Malta": "Europe",
	"Luxembourg": "Europe",
	"UK": "Europe",
	"DE": "Europe",
	"FR": "Europe",
	"IT": "Europe",
	"ES": "Europe",
	"NL": "Europe",
	"PL": "Europe",
	"BE": "Europe",
	"AT": "Europe",
	"CH": "Europe",
	"PT": "Europe",
	"SE": "Europe",
	"NO": "Europe",
	"DK": "Europe",
	"FI": "Europe",
	"IE": "Europe",

	// Asia
	"China": "Asia",
	"India": "Asia",
	"Japan": "Asia",
	"South Korea": "Asia",
	"Indonesia": "Asia",
	"Thailand": "Asia",
	"Vietnam": "Asia",
	"Philippines": "Asia",
	"Malaysia": "Asia",
	"Singapore": "Asia",
	"Taiwan": "Asia",
	"Hong Kong": "Asia",
	"Pakistan": "Asia",
	"Bangladesh": "Asia",
	"Sri Lanka": "Asia",
	"Nepal": "Asia",
	"Myanmar": "Asia",
	"Cambodia": "Asia",
	"Laos": "Asia",
	"Mongolia": "Asia",
	"CN": "Asia",
	"IN": "Asia",
	"JP": "Asia",
	"KR": "Asia",
	"ID": "Asia",
	"TH": "Asia",
	"VN": "Asia",
	"PH": "Asia",
	"MY": "Asia",
	"SG": "Asia",
	"TW": "Asia",
	"HK": "Asia",
	"PK": "Asia",
	"BD": "Asia",
	"LK": "Asia",

	// Middle East (part of Asia)
	"United Arab Emirates": "Asia",
	"Saudi Arabia": "Asia",
	"Qatar": "Asia",
	"Kuwait": "Asia",
	"Bahrain": "Asia",
	"Oman": "Asia",
	"Yemen": "Asia",
	"Jordan": "Asia",
	"Lebanon": "Asia",
	"Syria": "Asia",
	"Iraq": "Asia",
	"Iran": "Asia",
	"Israel": "Asia",
	"Palestine": "Asia",
	"AE": "Asia",
	"SA": "Asia",
	"QA": "Asia",
	"KW": "Asia",
	"BH": "Asia",
	"OM": "Asia",
	"YE": "Asia",
	"JO": "Asia",
	"LB": "Asia",
	"SY": "Asia",
	"IQ": "Asia",
	"IR": "Asia",
	"IL": "Asia",
	"PS": "Asia",

	// Russia and CIS
	"Russia": "Europe",
	"Kazakhstan": "Asia",
	"Uzbekistan": "Asia",
	"Kyrgyzstan": "Asia",
	"Tajikistan": "Asia",
	"Turkmenistan": "Asia",
	"Belarus": "Europe",
	"Ukraine": "Europe",
	"Moldova": "Europe",
	"Georgia": "Asia",
	"Armenia": "Asia",
	"Azerbaijan": "Asia",
	"RU": "Europe",
	"KZ": "Asia",
	"UZ": "Asia",
	"KG": "Asia",
	"TJ": "Asia",
	"TM": "Asia",
	"BY": "Europe",
	"UA": "Europe",
	"MD": "Europe",
	"GE": "Asia",
	"AM": "Asia",
	"AZ": "Asia",

	// South America
	"Brazil": "South America",
	"Argentina": "South America",
	"Chile": "South America",
	"Peru": "South America",
	"Colombia": "South America",
	"Venezuela": "South America",
	"Ecuador": "South America",
	"Uruguay": "South America",
	"Paraguay": "South America",
	"Bolivia": "South America",
	"Guyana": "South America",
	"Suriname": "South America",
	"BR": "South America",
	"AR": "South America",
	"CL": "South America",
	"PE": "South America",
	"CO": "South America",
	"VE": "South America",
	"EC": "South America",
	"UY": "South America",
	"PY": "South America",
	"BO": "South America",

	// Africa
	"South Africa": "Africa",
	"Nigeria": "Africa",
	"Egypt": "Africa",
	"Kenya": "Africa",
	"Morocco": "Africa",
	"Algeria": "Africa",
	"Tunisia": "Africa",
	"Libya": "Africa",
	"Ethiopia": "Africa",
	"Ghana": "Africa",
	"Uganda": "Africa",
	"Tanzania": "Africa",
	"Zimbabwe": "Africa",
	"Zambia": "Africa",
	"Botswana": "Africa",
	"Namibia": "Africa",
	"ZA": "Africa",
	"NG": "Africa",
	"EG": "Africa",
	"KE": "Africa",
	"MA": "Africa",
	"DZ": "Africa",
	"TN": "Africa",
	"LY": "Africa",
	"ET": "Africa",
	"GH": "Africa",

	// Oceania
	"Australia": "Oceania",
	"New Zealand": "Oceania",
	"Fiji": "Oceania",
	"Papua New Guinea": "Oceania",
	"Samoa": "Oceania",
	"Tonga": "Oceania",
	"Vanuatu": "Oceania",
	"Solomon Islands": "Oceania",
	"AU": "Oceania",
	"NZ": "Oceania",
	"FJ": "Oceania",
	"PG": "Oceania",
};

export const AudienceContinentsChart = ({
	audienceData,
	realtimeData
}: AudienceContinentsChartProps) => {
	const chartData = useMemo((): HorizontalBarChartData[] => {
		// Use real continents data from audience breakdown first
		if (audienceData?.payload.continents && audienceData.payload.continents.length > 0) {
			return audienceData.payload.continents
				.map(([continent, count], index) => ({
					name: String(continent).charAt(0).toUpperCase() + String(continent).slice(1),
					value: Number(count) || 0,
					fill: `var(--chart-${(index % 5) + 1})`,
				}))
				.filter(item => !isNaN(item.value) && item.value > 0)
				.sort((a, b) => b.value - a.value);
		}

		// Fallback: Aggregate countries by continent using mapping
		const countries = audienceData?.payload.countries || realtimeData?.payload.countries || [];

		if (!countries || countries.length === 0) {
			return [];
		}

		const continentCounts: Record<string, number> = {};

		countries.forEach(([country, count]) => {
			const countryName = String(country);
			const continent = COUNTRY_TO_CONTINENT[countryName] || "Unknown";
			const sessions = Number(count) || 0;

			if (!isNaN(sessions) && sessions > 0) {
				continentCounts[continent] = (continentCounts[continent] || 0) + sessions;
			}
		});

		// Convert to chart data and sort by value
		return Object.entries(continentCounts)
			.map(([continent, count], index) => ({
				name: continent,
				value: count,
				fill: `var(--chart-${(index % 5) + 1})`,
			}))
			.filter(item => item.value > 0)
			.sort((a, b) => b.value - a.value);
	}, [audienceData, realtimeData]);

	const source = audienceData?.source || realtimeData?.source || "firebuzz";

	return (
		<HorizontalBarChart
			data={chartData}
			title="Top 5 Continents"
			description="Geographic distribution across continents"
			valueLabel="Sessions"
			source={source}
			showTrend={chartData.length > 0}
			maxItems={5}
		/>
	);
};