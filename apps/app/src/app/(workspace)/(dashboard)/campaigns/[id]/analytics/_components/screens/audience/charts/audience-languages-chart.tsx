import {
	HorizontalBarChart,
	type HorizontalBarChartData,
} from "@/components/analytics/charts/horizontal-bar-chart";
import type { Doc } from "@firebuzz/convex";
import { useMemo } from "react";

interface AudienceLanguagesChartProps {
	audienceData?: Extract<
		Doc<"analyticsPipes">,
		{ queryId: "audience-breakdown" }
	> | null;
}

// Map common browser language codes to readable names
const LANGUAGE_NAMES: Record<string, string> = {
	en: "English",
	"en-US": "English (US)",
	"en-GB": "English (UK)",
	"en-CA": "English (Canada)",
	"en-AU": "English (Australia)",
	es: "Spanish",
	"es-ES": "Spanish (Spain)",
	"es-MX": "Spanish (Mexico)",
	"es-AR": "Spanish (Argentina)",
	fr: "French",
	"fr-FR": "French (France)",
	"fr-CA": "French (Canada)",
	de: "German",
	"de-DE": "German (Germany)",
	"de-AT": "German (Austria)",
	it: "Italian",
	"it-IT": "Italian (Italy)",
	pt: "Portuguese",
	"pt-BR": "Portuguese (Brazil)",
	"pt-PT": "Portuguese (Portugal)",
	ru: "Russian",
	"ru-RU": "Russian (Russia)",
	zh: "Chinese",
	"zh-CN": "Chinese (Simplified)",
	"zh-TW": "Chinese (Traditional)",
	ja: "Japanese",
	"ja-JP": "Japanese (Japan)",
	ko: "Korean",
	"ko-KR": "Korean (Korea)",
	ar: "Arabic",
	"ar-SA": "Arabic (Saudi Arabia)",
	hi: "Hindi",
	"hi-IN": "Hindi (India)",
	nl: "Dutch",
	"nl-NL": "Dutch (Netherlands)",
	sv: "Swedish",
	"sv-SE": "Swedish (Sweden)",
	da: "Danish",
	"da-DK": "Danish (Denmark)",
	no: "Norwegian",
	"no-NO": "Norwegian (Norway)",
	fi: "Finnish",
	"fi-FI": "Finnish (Finland)",
	pl: "Polish",
	"pl-PL": "Polish (Poland)",
	tr: "Turkish",
	"tr-TR": "Turkish (Turkey)",
	th: "Thai",
	"th-TH": "Thai (Thailand)",
	vi: "Vietnamese",
	"vi-VN": "Vietnamese (Vietnam)",
	id: "Indonesian",
	"id-ID": "Indonesian (Indonesia)",
	ms: "Malay",
	"ms-MY": "Malay (Malaysia)",
};

export const AudienceLanguagesChart = ({
	audienceData,
}: AudienceLanguagesChartProps) => {
	const chartData = useMemo((): HorizontalBarChartData[] => {
		// Use real languages data from audience breakdown first
		if (
			audienceData?.payload.languages &&
			audienceData.payload.languages.length > 0
		) {
			return audienceData.payload.languages
				.map(([language, count], index) => {
					const languageName =
						LANGUAGE_NAMES[String(language)] ||
						String(language).charAt(0).toUpperCase() +
							String(language).slice(1);
					return {
						name: languageName,
						value: Number(count) || 0,
						fill: `var(--chart-${(index % 5) + 1})`,
					};
				})
				.filter((item) => !isNaN(item.value) && item.value > 0)
				.sort((a, b) => b.value - a.value);
		}

		// Fallback: Try to infer languages from countries data
		if (
			audienceData?.payload.countries &&
			audienceData.payload.countries.length > 0
		) {
			// Map countries to primary languages (simplified mapping)
			const countryToLanguage: Record<string, string> = {
				"United States": "English (US)",
				"United Kingdom": "English (UK)",
				Canada: "English (Canada)",
				Australia: "English (Australia)",
				Germany: "German",
				France: "French",
				Spain: "Spanish",
				Italy: "Italian",
				Netherlands: "Dutch",
				Sweden: "Swedish",
				Norway: "Norwegian",
				Denmark: "Danish",
				Finland: "Finnish",
				Poland: "Polish",
				Russia: "Russian",
				China: "Chinese",
				Japan: "Japanese",
				"South Korea": "Korean",
				Brazil: "Portuguese (Brazil)",
				Portugal: "Portuguese (Portugal)",
				Mexico: "Spanish (Mexico)",
				Argentina: "Spanish (Argentina)",
				Turkey: "Turkish",
				Thailand: "Thai",
				Vietnam: "Vietnamese",
				Indonesia: "Indonesian",
				Malaysia: "Malay",
				India: "Hindi",
				"Saudi Arabia": "Arabic",
				US: "English (US)",
				UK: "English (UK)",
				CA: "English (Canada)",
				AU: "English (Australia)",
				DE: "German",
				FR: "French",
				ES: "Spanish",
				IT: "Italian",
				NL: "Dutch",
				SE: "Swedish",
				NO: "Norwegian",
				DK: "Danish",
				FI: "Finnish",
				PL: "Polish",
				RU: "Russian",
				CN: "Chinese",
				JP: "Japanese",
				KR: "Korean",
				BR: "Portuguese (Brazil)",
				PT: "Portuguese (Portugal)",
				MX: "Spanish (Mexico)",
				AR: "Spanish (Argentina)",
				TR: "Turkish",
				TH: "Thai",
				VN: "Vietnamese",
				ID: "Indonesian",
				MY: "Malay",
				IN: "Hindi",
				SA: "Arabic",
			};

			const languageCounts: Record<string, number> = {};

			audienceData.payload.countries.forEach(([country, count]) => {
				const language = countryToLanguage[String(country)] || "Other";
				const sessions = Number(count) || 0;
				if (!isNaN(sessions) && sessions > 0) {
					languageCounts[language] = (languageCounts[language] || 0) + sessions;
				}
			});

			return Object.entries(languageCounts)
				.map(([language, count], index) => ({
					name: language,
					value: count,
					fill: `var(--chart-${(index % 5) + 1})`,
				}))
				.sort((a, b) => b.value - a.value);
		}

		// If browsers data is available, try to extract language info
		if (
			audienceData?.payload.browsers &&
			audienceData.payload.browsers.length > 0
		) {
			// This is a placeholder - in real implementation, we'd need language data
			// from user agent or accept-language headers
			return audienceData.payload.browsers
				.slice(0, 5)
				.map(([browser, count], index) => ({
					name: `${String(browser)} Users`,
					value: Number(count) || 0,
					fill: `var(--chart-${(index % 5) + 1})`,
				}))
				.filter((item) => !isNaN(item.value) && item.value > 0);
		}

		return [];
	}, [audienceData]);

	return (
		<HorizontalBarChart
			data={chartData}
			title="Top 5 Languages"
			description="Primary languages of your audience"
			valueLabel="Sessions"
			source={audienceData?.source}
			showTrend={chartData.length > 0}
			maxItems={5}
		/>
	);
};
