import type { CampaignConfig } from "@firebuzz/shared-types";
import type { Context } from "hono";
import { parseRequest } from "./request";

interface GDPRSettingsEvaluation {
	isEnabled: boolean;
	isRequiredConsent: boolean;
	/* Geo-location */
	isEU: boolean;
	isCalifornian: boolean;
	isIncludedCountry: boolean;
	isLocalizationEnabled: boolean;
	countryCode: string;
	language: string;
	/* DNT */
	isRespectDNTEnabled: boolean;
	/* URLs */
	privacyPolicyUrl?: string;
	termsOfServiceUrl?: string;
}

/**
 * Evaluate GDPR settings for current request
 * This will check request and GDPR settings of campaign and return the evaluation
 */
export function evaluateGDPRSettings(
	c: Context,
	settings: CampaignConfig["gdpr"],
	_isPreview = false,
): GDPRSettingsEvaluation {
	const isEnabled = settings.enabled;
	const isGeoLocationEnabled = settings.geoLocation;
	const isLocalizationEnabled = settings.localization;
	const isRespectDNTEnabled = settings.respectDNT;

	const parsedRequest = parseRequest(c);

	// Geo-location
	const isEU = parsedRequest.geo.isEUCountry;
	const isCalifornian =
		parsedRequest.geo.country === "US" && parsedRequest.geo.regionCode === "CA";
	const isIncludedCountry = Boolean(
		settings.includedCountries?.includes(parsedRequest.geo.country || ""),
	);

	return {
		isEnabled,
		isRequiredConsent: !isEnabled
			? false
			: isGeoLocationEnabled
				? Boolean(isEU || isCalifornian || isIncludedCountry)
				: true,
		isEU,
		isCalifornian,
		isIncludedCountry,
		isRespectDNTEnabled,
		isLocalizationEnabled,
		language: parsedRequest.localization.language ?? "en-US",
		countryCode: parsedRequest.geo.country ?? "US",
		privacyPolicyUrl: settings.privacyPolicyUrl,
		termsOfServiceUrl: settings.termsOfServiceUrl,
	};
}
