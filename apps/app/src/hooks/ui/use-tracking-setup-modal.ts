import { parseAsString, useQueryStates } from "nuqs";

type TrackingSetupModalState = {
	eventId: string;
	eventTitle: string;
	eventPlacement: "internal" | "external";
	value: number;
	currency: string;
} | null;

export const useTrackingSetupModal = () => {
	return useQueryStates(
		{
			trackingSetup: parseAsString,
		},
		{
			urlKeys: {
				trackingSetup: "tracking-setup",
			},
			history: "replace",
		},
	);
};

export const createTrackingSetupState = (
	eventId: string,
	eventTitle: string,
	eventPlacement: "internal" | "external",
	value: number = 1,
	currency: string = "USD",
): string => {
	return JSON.stringify({
		eventId,
		eventTitle,
		eventPlacement,
		value,
		currency,
	});
};

export const parseTrackingSetupState = (
	state: string | null,
): TrackingSetupModalState => {
	if (!state) return null;
	
	try {
		const parsed = JSON.parse(state);
		if (
			parsed &&
			typeof parsed.eventId === "string" &&
			typeof parsed.eventTitle === "string" &&
			(parsed.eventPlacement === "internal" || parsed.eventPlacement === "external") &&
			typeof parsed.value === "number" &&
			typeof parsed.currency === "string"
		) {
			return parsed;
		}
		return null;
	} catch {
		return null;
	}
};