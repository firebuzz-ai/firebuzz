"use client";

import type {
	FilterOperator,
	RuleTypeDefinition,
	RuleTypeId,
} from "@/components/canvas/campaign/nodes/campaign/types";
import {
	CalendarDays,
	Code,
	Globe,
	Languages,
	Laptop,
	Link,
	MapPin,
	Search,
	Share2,
	Smartphone,
	Timer,
	Users,
} from "@firebuzz/ui/icons/lucide";
import {
	AndroidIcon,
	AppleCustomIcon,
	EdgeIcon,
	FacebookIcon,
	FirefoxIcon,
	GoogleChromeIcon,
	GoogleIcon,
	IOSIcon,
	InstagramIcon,
	InternetExplorerIcon,
	LinkedInIcon,
	LinuxIcon,
	OperaIcon,
	RedditIcon,
	SafariIcon,
	TikTokIcon,
	TwitterIcon,
	WindowsIcon,
	YouTubeIcon,
} from "@firebuzz/ui/icons/social";
// @ts-ignore
import { TIMEZONES, countriesAndLanguages } from "@firebuzz/utils";

// Helper functions to get countries and languages
const getCountryOptions = () => {
	return countriesAndLanguages.map((country) => ({
		value: country.code,
		label: country.country,
	}));
};

const getLanguageOptions = () => {
	const languages = new Map();
	for (const country of countriesAndLanguages) {
		for (const lang of country.languages) {
			languages.set(lang.code, lang.name);
		}
	}
	return Array.from(languages.entries()).map(([code, name]) => ({
		value: code,
		label: name,
	}));
};

export const getOperatorsByValueType = (
	valueType: "string" | "number" | "boolean" | "array" | "date",
): FilterOperator[] => {
	switch (valueType) {
		case "string":
			return [
				"equals",
				"not_equals",
				"contains",
				"not_contains",
				"starts_with",
				"ends_with",
				"in",
				"not_in",
			];
		case "number":
			return [
				"equals",
				"not_equals",
				"greater_than",
				"less_than",
				"between",
				"in",
				"not_in",
			];
		case "boolean":
			return ["equals", "not_equals"];
		case "array":
			return ["in", "not_in"];
		case "date":
			return ["equals", "not_equals", "greater_than", "less_than", "between"];
		default:
			return ["equals"];
	}
};

export const RULE_TYPE_DEFINITIONS: Record<RuleTypeId, RuleTypeDefinition> = {
	visitorType: {
		id: "visitorType",
		label: "Visitor Type",
		description: "Target users based on visit history",
		icon: <Users className="w-4 h-4" />,
		valueType: "string",
		supportedOperators: ["equals"],
		hideOperatorSelection: true,
		options: [
			{ value: "all", label: "All Visitors" },
			{ value: "new", label: "New Visitors" },
			{ value: "returning", label: "Returning Visitors" },
		],
		customInputAllowed: false,
	},
	country: {
		id: "country",
		label: "Country",
		description: "Filter by visitor's geographic location",
		icon: <MapPin className="w-4 h-4" />,
		valueType: "string",
		supportedOperators: ["equals", "not_equals", "in", "not_in"],
		operatorValueTypes: {
			equals: "string",
			not_equals: "string",
			in: "array",
			not_in: "array",
		},
		options: getCountryOptions(),
		customInputAllowed: false,
	},
	language: {
		id: "language",
		label: "Language",
		description: "Target based on browser language",
		icon: <Languages className="w-4 h-4" />,
		valueType: "string",
		supportedOperators: ["equals", "not_equals", "in", "not_in"],
		operatorValueTypes: {
			equals: "string",
			not_equals: "string",
			in: "array",
			not_in: "array",
		},
		options: getLanguageOptions(),
		customInputAllowed: false,
	},
	deviceType: {
		id: "deviceType",
		label: "Device Type",
		description: "Target mobile, desktop, or tablet users",
		icon: <Smartphone className="w-4 h-4" />,
		valueType: "string",
		supportedOperators: ["equals", "not_equals", "in", "not_in"],
		hideOperatorSelection: false,
		operatorValueTypes: {
			equals: "string",
			not_equals: "string",
			in: "array",
			not_in: "array",
		},
		options: [
			{
				value: "mobile",
				label: "Mobile",
				icon: <Smartphone className="w-3 h-3" />,
			},
			{
				value: "desktop",
				label: "Desktop",
				icon: <Laptop className="w-3 h-3" />,
			},
			{
				value: "tablet",
				label: "Tablet",
				icon: <Smartphone className="w-3 h-3 rotate-90" />,
			},
		],
		customInputAllowed: false,
	},
	browser: {
		id: "browser",
		label: "Browser",
		description: "Filter by web browser used",
		icon: <Globe className="w-4 h-4" />,
		valueType: "string",
		supportedOperators: ["equals", "not_equals", "in", "not_in"],
		operatorValueTypes: {
			equals: "string",
			not_equals: "string",
			in: "array",
			not_in: "array",
		},
		options: [
			{
				value: "chrome",
				label: "Chrome",
				icon: (
					<div className="flex overflow-hidden justify-center items-center w-4 h-4">
						<GoogleChromeIcon />
					</div>
				),
			},
			{
				value: "firefox",
				label: "Firefox",
				icon: (
					<div className="flex overflow-hidden justify-center items-center w-4 h-4">
						<FirefoxIcon />
					</div>
				),
			},
			{
				value: "safari",
				label: "Safari",
				icon: (
					<div className="flex overflow-hidden justify-center items-center w-4 h-4">
						<SafariIcon />
					</div>
				),
			},
			{
				value: "edge",
				label: "Edge",
				icon: (
					<div className="flex overflow-hidden justify-center items-center w-4 h-4">
						<EdgeIcon />
					</div>
				),
			},
			{
				value: "opera",
				label: "Opera",
				icon: (
					<div className="flex overflow-hidden justify-center items-center w-4 h-4">
						<OperaIcon />
					</div>
				),
			},
			{
				value: "ie",
				label: "Internet Explorer",
				icon: (
					<div className="flex overflow-hidden justify-center items-center w-4 h-4">
						<InternetExplorerIcon />
					</div>
				),
			},
		],
		customInputAllowed: false,
	},
	operatingSystem: {
		id: "operatingSystem",
		label: "Operating System",
		description: "Target by device operating system",
		icon: <Laptop className="w-4 h-4" />,
		valueType: "string",
		supportedOperators: ["equals", "not_equals", "in", "not_in"],
		operatorValueTypes: {
			equals: "string",
			not_equals: "string",
			in: "array",
			not_in: "array",
		},
		options: [
			{
				value: "windows",
				label: "Windows",
				icon: (
					<div className="fill-foreground">
						<WindowsIcon />
					</div>
				),
			},
			{
				value: "macos",
				label: "macOS",
				icon: (
					<div className="text-foreground">
						<AppleCustomIcon />
					</div>
				),
			},
			{
				value: "linux",
				label: "Linux",
				icon: (
					<div className="text-foreground">
						<LinuxIcon />
					</div>
				),
			},
			{
				value: "ios",
				label: "iOS",
				icon: (
					<div className="fill-foreground">
						<IOSIcon />
					</div>
				),
			},
			{
				value: "android",
				label: "Android",
				icon: (
					<div className="fill-foreground">
						<AndroidIcon />
					</div>
				),
			},
		],
		customInputAllowed: false,
	},
	utmSource: {
		id: "utmSource",
		label: "UTM Source",
		description: "Target by traffic source parameter",
		icon: <Share2 className="w-4 h-4" />,
		valueType: "string",
		supportedOperators: [
			"equals",
			"not_equals",
			"contains",
			"not_contains",
			"in",
			"not_in",
		],
		operatorValueTypes: {
			equals: "string",
			not_equals: "string",
			contains: "string",
			not_contains: "string",
			in: "array",
			not_in: "array",
		},
		options: [
			{
				value: "google",
				label: "Google",
				icon: <GoogleIcon />,
			},
			{
				value: "facebook",
				label: "Facebook",
				icon: <FacebookIcon />,
			},
			{
				value: "instagram",
				label: "Instagram",
				icon: <InstagramIcon />,
			},
			{
				value: "linkedin",
				label: "LinkedIn",
				icon: <LinkedInIcon />,
			},
			{
				value: "twitter",
				label: "Twitter",
				icon: <TwitterIcon />,
			},
			{
				value: "youtube",
				label: "YouTube",
				icon: <YouTubeIcon />,
			},
			{
				value: "tiktok",
				label: "TikTok",
				icon: <TikTokIcon />,
			},
			{ value: "reddit", label: "Reddit", icon: <RedditIcon /> },
		],
		customInputAllowed: true,
	},
	utmMedium: {
		id: "utmMedium",
		label: "UTM Medium",
		description: "Filter by marketing medium",
		icon: <Search className="w-4 h-4" />,
		valueType: "string",
		supportedOperators: [
			"equals",
			"not_equals",
			"contains",
			"not_contains",
			"in",
			"not_in",
		],
		operatorValueTypes: {
			equals: "string",
			not_equals: "string",
			contains: "string",
			not_contains: "string",
			in: "array",
			not_in: "array",
		},
		options: [
			{ value: "cpc", label: "Paid Search (CPC)" },
			{ value: "social", label: "Social Media" },
			{ value: "email", label: "Email" },
			{ value: "organic", label: "Organic Search" },
			{ value: "referral", label: "Referral" },
			{ value: "direct", label: "Direct" },
		],
		customInputAllowed: true,
	},
	referrer: {
		id: "referrer",
		label: "Referrer",
		description: "Target by referring website",
		icon: <Link className="w-4 h-4" />,
		valueType: "string",
		supportedOperators: [
			"equals",
			"not_equals",
			"contains",
			"not_contains",
			"in",
			"not_in",
		],
		operatorValueTypes: {
			equals: "string",
			not_equals: "string",
			contains: "string",
			not_contains: "string",
			in: "array",
			not_in: "array",
		},
		customInputAllowed: true,
	},
	customParameter: {
		id: "customParameter",
		label: "Custom Parameter",
		description: "Filter by custom URL parameters",
		icon: <Code className="w-4 h-4" />,
		valueType: "string",
		supportedOperators: [
			"equals",
			"not_equals",
			"contains",
			"not_contains",
			"in",
			"not_in",
			"starts_with",
			"ends_with",
		],
		operatorValueTypes: {
			equals: "string",
			not_equals: "string",
			contains: "string",
			not_contains: "string",
			in: "array",
			not_in: "array",
			starts_with: "string",
			ends_with: "string",
		},
		customInputAllowed: true,
	},
	timeZone: {
		id: "timeZone",
		label: "Time Zone",
		description: "Target by visitor's time zone",
		icon: <Globe className="w-4 h-4" />,
		valueType: "string",
		supportedOperators: ["equals", "not_equals"],
		operatorValueTypes: {
			equals: "string",
			not_equals: "string",
		},
		options: TIMEZONES.map((timezone) => ({
			value: timezone.zone,
			label: timezone.name,
		})),
		customInputAllowed: false,
	},
	hourOfDay: {
		id: "hourOfDay",
		label: "Hour of Day",
		description: "Show based on time of day (24h format)",
		icon: <Timer className="w-4 h-4" />,
		valueType: "number",
		supportedOperators: getOperatorsByValueType("number"),
		options: [
			{ value: "0", label: "Midnight (00:00)" },
			{ value: "6", label: "Morning (06:00)" },
			{ value: "9", label: "Business Hours (09:00)" },
			{ value: "12", label: "Noon (12:00)" },
			{ value: "17", label: "Evening (17:00)" },
			{ value: "20", label: "Night (20:00)" },
			{ value: "23", label: "Late Night (23:00)" },
		],
		customInputAllowed: true,
	},
	dayOfWeek: {
		id: "dayOfWeek",
		label: "Day of Week",
		description: "Target specific days of the week",
		icon: <CalendarDays className="w-4 h-4" />,
		valueType: "string", // Default for single selection
		supportedOperators: ["equals", "not_equals", "in", "not_in"],
		// Dynamic value types based on operator
		operatorValueTypes: {
			equals: "string",
			not_equals: "string",
			in: "array",
			not_in: "array",
		},
		options: [
			{ value: "sunday", label: "Sunday" },
			{ value: "monday", label: "Monday" },
			{ value: "tuesday", label: "Tuesday" },
			{ value: "wednesday", label: "Wednesday" },
			{ value: "thursday", label: "Thursday" },
			{ value: "friday", label: "Friday" },
			{ value: "saturday", label: "Saturday" },
		],
		customInputAllowed: false,
	},
};

export const getValueTypeForOperator = (
	ruleType: RuleTypeDefinition,
	operator: FilterOperator,
): "string" | "number" | "boolean" | "array" | "date" => {
	// Check if there's a specific value type for this operator
	if (ruleType.operatorValueTypes?.[operator]) {
		return ruleType.operatorValueTypes[operator];
	}
	// Fall back to default value type
	return ruleType.valueType;
};

export const getOperatorLabel = (operator: FilterOperator): string => {
	switch (operator) {
		case "equals":
			return "equals";
		case "not_equals":
			return "does not equal";
		case "greater_than":
			return "is greater than";
		case "less_than":
			return "is less than";
		case "between":
			return "is between";
		case "in":
			return "is one of";
		case "not_in":
			return "is not one of";
		case "contains":
			return "contains";
		case "not_contains":
			return "does not contain";
		case "starts_with":
			return "starts with";
		case "ends_with":
			return "ends with";
		default:
			return operator;
	}
};
